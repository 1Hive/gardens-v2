// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import "forge-std/Script.sol";
import {GlobalPauseController} from "../src/pausing/GlobalPauseController.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

interface IPauseFacet {
    function pauseController() external view returns (address);
    function setPauseController(address controller) external;
}

interface IRegistryFactoryPauseController {
    function globalPauseController() external view returns (address);
    function setGlobalPauseController(address controller) external;
}

interface IUUPSUpgradeableProxy {
    function upgradeTo(address newImplementation) external;
}

contract DeployGlobalPauseController is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        bool deployOnly = vm.envOr("DEPLOY_ONLY", false);
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        address controller = _readAddressOrZero(".ENVS.PAUSE_CONTROLLER");
        address controllerImplementation = address(new GlobalPauseController());

        if (controller == address(0)) {
            controller = address(
                new ERC1967Proxy(
                    controllerImplementation,
                    abi.encodeWithSelector(GlobalPauseController.initialize.selector, proxyOwner)
                )
            );

            _writeNetworkAddress(".ENVS.PAUSE_CONTROLLER", controller);
        } else {
            if (!deployOnly) {
                IUUPSUpgradeableProxy(payable(controller)).upgradeTo(controllerImplementation);
            }
        }
        _writeNetworkAddress(".IMPLEMENTATIONS.PAUSE_CONTROLLER", controllerImplementation);

        if (deployOnly) {
            console2.log("DEPLOY_ONLY enabled");
            console2.log("Pause controller", controller);
            console2.log("Pause controller implementation", controllerImplementation);
            console2.log("Onchain pause-controller wiring skipped");
            return;
        }

        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            _setPauseController(registryCommunityProxies[i], controller);
        }

        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            _setPauseController(cvStrategyProxies[i], controller);
        }

        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        _setFactoryPauseController(registryFactoryProxy, controller);
    }

    function _setPauseController(address target, address controller) internal {
        IPauseFacet pauseFacet = IPauseFacet(target);
        address current = pauseFacet.pauseController();
        if (current != controller) {
            pauseFacet.setPauseController(controller);
        } else {
        }
    }

    function _setFactoryPauseController(address factory, address controller) internal {
        IRegistryFactoryPauseController registryFactory = IRegistryFactoryPauseController(factory);
        address current = registryFactory.globalPauseController();
        if (current != controller) {
            registryFactory.setGlobalPauseController(controller);
        } else {
        }
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

    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
