// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {StreamingEscrow} from "../src/CVStrategy/StreamingEscrow.sol";
import {StreamingEscrowFactory} from "../src/CVStrategy/StreamingEscrowFactory.sol";
import {ISuperfluid} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

interface IStreamingEscrowUUPS {
    function strategy() external view returns (address);
    function upgradeTo(address newImplementation) external;
}

interface ICVStrategySuperToken {
    function superfluidToken() external view returns (address);
}

interface ISuperTokenWithHost {
    function getHost() external view returns (address);
}

contract DeployOrUpgradeStreamingEscrows is BaseMultiChain {
    using stdJson for string;

    bytes32 internal constant EIP1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    address internal requestedEscrowImplementation;

    function run(string memory network, address _newEscrowImplementation) public {
        requestedEscrowImplementation = _newEscrowImplementation;
        BaseMultiChain.run(network);
    }

    function run(string memory network) public override {
        run(network, address(0));
    }

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        require(proxyOwner != address(0), "PROXY_OWNER is zero");

        address factoryProxy = _readAddressOrZero(".ENVS.STREAMING_ESCROW_FACTORY");
        StreamingEscrowFactory factory;

        if (factoryProxy == address(0)) {
            address[] memory strategies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
            require(strategies.length > 0, "missing CV_STRATEGIES to derive Superfluid host");
            address superToken = ICVStrategySuperToken(strategies[0]).superfluidToken();
            require(superToken != address(0), "strategy superToken is zero");
            address host = ISuperTokenWithHost(superToken).getHost();
            require(host != address(0), "superToken host is zero");

            address initialEscrowImplementation = _resolveEscrowImplementation(address(0));
            address factoryImplementation = address(new StreamingEscrowFactory());
            factoryProxy = address(
                new ERC1967Proxy(
                    factoryImplementation,
                    abi.encodeWithSelector(
                        StreamingEscrowFactory.initialize.selector,
                        proxyOwner,
                        ISuperfluid(host),
                        initialEscrowImplementation
                    )
                )
            );
            factory = StreamingEscrowFactory(factoryProxy);

            _writeNetworkAddress(".ENVS.STREAMING_ESCROW_FACTORY", factoryProxy);
            _writeNetworkAddress(".IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY", factoryImplementation);
            _writeNetworkAddress(".IMPLEMENTATIONS.STREAMING_ESCROW", initialEscrowImplementation);

            console2.log("Factory deployed", factoryProxy);
            console2.log("Factory implementation", factoryImplementation);
            console2.log("Escrow implementation", initialEscrowImplementation);
        } else {
            factory = StreamingEscrowFactory(factoryProxy);
            _upgradeFactoryIfChanged(factory, factoryProxy);
        }

        address targetEscrowImplementation = _resolveEscrowImplementation(factory.escrowImplementation());
        if (_codehash(factory.escrowImplementation()) != _codehash(targetEscrowImplementation)) {
            factory.setEscrowImplementation(targetEscrowImplementation);
        }

        _writeNetworkAddress(".IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY", _implementationOf(factoryProxy));
        _writeNetworkAddress(".IMPLEMENTATIONS.STREAMING_ESCROW", targetEscrowImplementation);
        _writeNetworkAddress(".ENVS.STREAMING_ESCROW_FACTORY", factoryProxy);

        uint256 total = factory.escrowsLength();
        console2.log("Factory", factoryProxy);
        console2.log("Factory implementation", _implementationOf(factoryProxy));
        console2.log("Escrow implementation", targetEscrowImplementation);
        console2.log("Escrows", total);

        uint256 upgraded = 0;
        uint256 skipped = 0;
        for (uint256 i = 0; i < total; i++) {
            address escrow = factory.escrows(i);
            if (_codehash(_implementationOf(escrow)) == _codehash(targetEscrowImplementation)) {
                skipped++;
                continue;
            }

            IStreamingEscrowUUPS target = IStreamingEscrowUUPS(escrow);
            address strategy;
            try target.strategy() returns (address s) {
                strategy = s;
            } catch {
                console2.log("Skip (no strategy getter)", escrow);
                skipped++;
                continue;
            }

            try target.upgradeTo(targetEscrowImplementation) {
                upgraded++;
                console2.log("Upgraded", escrow, "strategy", strategy);
            } catch {
                console2.log("Failed", escrow, "strategy", strategy);
            }
        }

        console2.log("Upgraded total", upgraded);
        console2.log("Skipped total", skipped);
    }

    function _upgradeFactoryIfChanged(StreamingEscrowFactory factory, address factoryProxy) internal {
        address currentFactoryImplementation = _implementationOf(factoryProxy);
        address newFactoryImplementation = address(new StreamingEscrowFactory());
        bool factoryUpgraded = false;

        if (_codehash(currentFactoryImplementation) != _codehash(newFactoryImplementation)) {
            factory.upgradeTo(newFactoryImplementation);
            factoryUpgraded = true;
        }

        console2.log("Factory implementation (current)", currentFactoryImplementation);
        console2.log("Factory implementation (new)", newFactoryImplementation);
        console2.log("Factory upgraded", factoryUpgraded);
    }

    function _resolveEscrowImplementation(address currentEscrowImplementation) internal returns (address) {
        if (requestedEscrowImplementation != address(0)) {
            return requestedEscrowImplementation;
        }

        address candidate = address(new StreamingEscrow());
        if (currentEscrowImplementation != address(0) && _codehash(candidate) == _codehash(currentEscrowImplementation)) {
            return currentEscrowImplementation;
        }
        return candidate;
    }

    function _readAddressOrZero(string memory key) internal returns (address) {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/pkg/contracts/config/networks.json");
        string memory command = string.concat(
            "jq -r '(.networks[] | select(.name==\"", CURRENT_NETWORK, "\") | ", key, " // empty)' ", path
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        bytes memory result = vm.ffi(inputs);

        if (result.length == 20) {
            return address(bytes20(result));
        }

        string memory value = _trim(string(result));
        if (bytes(value).length == 0 || keccak256(bytes(value)) == keccak256(bytes("null"))) {
            return address(0);
        }
        return _parseAddress(value);
    }

    function _writeNetworkAddress(string memory key, address value) internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/pkg/contracts/config/networks.json");
        string memory tmpPath = string.concat(root, "/pkg/contracts/config/.networks.tmp.json");
        string memory command = string.concat(
            "jq '(.networks[] | select(.name==\"",
            CURRENT_NETWORK,
            "\") | ",
            key,
            ") = \"",
            _addressToString(value),
            "\"' ",
            path,
            " > ",
            tmpPath,
            " && mv ",
            tmpPath,
            " ",
            path
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        vm.ffi(inputs);
    }

    function _trim(string memory input) internal pure returns (string memory) {
        bytes memory inputBytes = bytes(input);
        uint256 start = 0;
        uint256 end = inputBytes.length;
        while (start < end && _isWhitespace(inputBytes[start])) start++;
        while (end > start && _isWhitespace(inputBytes[end - 1])) end--;

        bytes memory trimmed = new bytes(end - start);
        for (uint256 i = 0; i < trimmed.length; i++) {
            trimmed[i] = inputBytes[start + i];
        }
        return string(trimmed);
    }

    function _isWhitespace(bytes1 char) internal pure returns (bool) {
        return char == 0x20 || char == 0x0a || char == 0x0d || char == 0x09;
    }

    function _parseAddress(string memory value) internal pure returns (address) {
        bytes memory data = bytes(value);
        if (data.length != 42 || data[0] != "0" || data[1] != "x") {
            return address(0);
        }
        uint160 result = 0;
        for (uint256 i = 2; i < 42; i++) {
            uint8 nibble = _fromHexChar(data[i]);
            result = (result << 4) | uint160(nibble);
        }
        return address(result);
    }

    function _fromHexChar(bytes1 c) internal pure returns (uint8) {
        uint8 b = uint8(c);
        if (b >= 48 && b <= 57) return b - 48;
        if (b >= 65 && b <= 70) return b - 55;
        if (b >= 97 && b <= 102) return b - 87;
        revert("invalid hex");
    }

    function _addressToString(address value) internal pure returns (string memory) {
        return Strings.toHexString(uint160(value), 20);
    }

    function _implementationOf(address proxy) internal view returns (address implementation) {
        bytes32 implementationSlot = vm.load(proxy, EIP1967_IMPLEMENTATION_SLOT);
        implementation = address(uint160(uint256(implementationSlot)));
    }

    function _codehash(address target) internal view returns (bytes32 hash) {
        assembly {
            hash := extcodehash(target)
        }
    }
}
