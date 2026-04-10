// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {StreamingEscrow} from "../src/CVStrategy/StreamingEscrow.sol";
import {StreamingEscrowFactory} from "../src/CVStrategy/StreamingEscrowFactory.sol";
import {ISuperfluid} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

interface IStreamingEscrowUUPS {
    function strategy() external view returns (address);
    function upgradeTo(address newImplementation) external;
    function reinitializeV2Migrate() external;
}

contract DeployOrUpgradeStreamingEscrows is BaseMultiChain {
    using stdJson for string;

    struct JsonWriter {
        string path;
        bool hasEntries;
    }

    bytes32 internal constant EIP1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    address internal requestedEscrowImplementation;
    bool internal deployImplementationOnly;
    bool internal generateSafePayload;

    function run(string memory network, address _newEscrowImplementation, bool implementationOnly, bool safePayload)
        public
    {
        requestedEscrowImplementation = _newEscrowImplementation;
        deployImplementationOnly = implementationOnly;
        generateSafePayload = safePayload;
        BaseMultiChain.run(network);
    }

    function run(string memory network, address _newEscrowImplementation, bool implementationOnly) public {
        run(network, _newEscrowImplementation, implementationOnly, false);
    }

    function run(string memory network, address _newEscrowImplementation) public {
        run(network, _newEscrowImplementation, false, false);
    }

    function run(string memory network) public override {
        run(network, address(0), false, false);
    }

    function runCurrentNetwork(string memory networkJson) public override {
        bool deployOnly = deployImplementationOnly || vm.envOr("DEPLOY_ONLY", false);
        bool safePayloadRequested = generateSafePayload || vm.envOr("SAFE_PAYLOAD", false);
        bool directBroadcast = networkJson.readBool(getKeyNetwork(".no-safe"));
        bool safePayload = safePayloadRequested && !directBroadcast;
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        require(proxyOwner != address(0), "PROXY_OWNER is zero");
        address safeOwner = ProxyOwner(proxyOwner).mainOwner();

        address factoryProxy = _readAddressOrZero(".ENVS.STREAMING_ESCROW_FACTORY");
        address configuredHost = _readAddressOrZero(".ENVS.SUPERFLUID_HOST");
        StreamingEscrowFactory factory;
        address currentFactoryImplementation = address(0);
        address targetFactoryImplementation;
        JsonWriter memory payloadWriter;

        if (directBroadcast && safePayloadRequested) {
            console2.log("SAFE_PAYLOAD ignored on no-safe network", CURRENT_NETWORK);
        }

        if (safePayload) {
            payloadWriter = _initPayloadWriter(safeOwner, networkJson);
        }

        if (factoryProxy != address(0) && factoryProxy.code.length == 0) {
            console2.log("Configured STREAMING_ESCROW_FACTORY has no code, redeploying", factoryProxy);
            factoryProxy = address(0);
        }

        if (factoryProxy == address(0)) {
            require(
                configuredHost != address(0),
                "Streaming escrows unsupported on this network: SUPERFLUID_HOST is not configured"
            );
            address initialEscrowImplementation = _resolveEscrowImplementation(address(0));
            address factoryImplementation = address(new StreamingEscrowFactory());
            factoryProxy = address(
                new ERC1967Proxy(
                    factoryImplementation,
                    abi.encodeWithSelector(
                        StreamingEscrowFactory.initialize.selector,
                        proxyOwner,
                        ISuperfluid(configuredHost),
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
            if (!safePayload && !deployOnly) {
                address currentOwner = factory.owner();
                require(
                    currentOwner == SENDER,
                    "Direct upgrade requires sender to be current owner; grant ProxyOwner upgradeAccess or use Safe"
                );
            }
            currentFactoryImplementation = _implementationOf(factoryProxy);
            targetFactoryImplementation = _resolveFactoryImplementation(currentFactoryImplementation);
            if (_codehash(currentFactoryImplementation) != _codehash(targetFactoryImplementation)) {
                if (safePayload) {
                    payloadWriter = _appendTransaction(
                        payloadWriter,
                        _createUpgradeToTransactionJson(factoryProxy, targetFactoryImplementation)
                    );
                } else if (!deployOnly) {
                    factory.upgradeTo(targetFactoryImplementation);
                }
            }
        }

        address targetEscrowImplementation = _resolveEscrowImplementation(factory.escrowImplementation());
        if (_codehash(factory.escrowImplementation()) != _codehash(targetEscrowImplementation)) {
            if (safePayload) {
                payloadWriter = _appendTransaction(
                    payloadWriter,
                    _createSetEscrowImplementationTransactionJson(factoryProxy, targetEscrowImplementation)
                );
            } else if (!deployOnly) {
                factory.setEscrowImplementation(targetEscrowImplementation);
            }
        }

        if (factoryProxy != address(0) && targetFactoryImplementation == address(0)) {
            targetFactoryImplementation = _implementationOf(factoryProxy);
        }

        _writeNetworkAddress(".IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY", targetFactoryImplementation);
        _writeNetworkAddress(".IMPLEMENTATIONS.STREAMING_ESCROW", targetEscrowImplementation);
        _writeNetworkAddress(".ENVS.STREAMING_ESCROW_FACTORY", factoryProxy);

        uint256 total = factory.escrowsLength();
        console2.log("Factory", factoryProxy);
        console2.log("Factory implementation", _implementationOf(factoryProxy));
        console2.log("Superfluid host", configuredHost);
        console2.log("Escrow implementation", targetEscrowImplementation);
        console2.log("Escrows", total);
        console2.log("Deploy only", deployOnly);
        console2.log("Safe payload", safePayload);

        if (safePayload) {
            if (payloadWriter.hasEntries) {
                _finalizePayloadWriter(payloadWriter);
                console2.log("Safe payload written", payloadWriter.path);
            } else {
                vm.removeFile(payloadWriter.path);
                console2.log("Safe payload skipped: no upgrade transactions required");
            }
        }

        // NOTE: Existing escrow proxies are intentionally NOT upgraded here.
        // This keeps current storage/layout untouched for already-deployed escrows.
        // The factory template above is still updated, so only newly deployed escrows use the new implementation.
        console2.log("Existing escrow upgrades disabled");
        console2.log("Existing escrows left untouched", total);
    }

    function _initPayloadWriter(address safeOwner, string memory networkJson)
        internal
        returns (JsonWriter memory writer)
    {
        vm.createDir("transaction-builder", true);
        writer.path = string.concat(
            vm.projectRoot(),
            "/pkg/contracts/transaction-builder/",
            CURRENT_NETWORK,
            "-streaming-escrow-upgrade-payload.json"
        );

        string memory payloadHeader = string.concat(
            "{",
            '"version":"1.0",',
            '"chainId":"',
            vm.toString(block.chainid),
            '",',
            '"createdAt":',
            vm.toString(block.timestamp * 1000),
            ",",
            '"meta":{',
            '"name":"StreamingEscrowFactory Upgrade Batch",',
            '"description":"Upgrades StreamingEscrowFactory and optionally updates the escrow implementation template.",',
            '"txBuilderVersion":"1.18.0",',
            '"createdFromSafeAddress":"',
            _addressToString(safeOwner),
            '",',
            '"createdFromOwnerAddress":"',
            _addressToString(SENDER),
            '",',
            '"hash":"',
            networkJson.readString(getKeyNetwork(".hash")),
            '"},',
            '"transactions":['
        );

        vm.writeFile(writer.path, payloadHeader);
    }

    function _appendTransaction(JsonWriter memory writer, string memory transactionJson)
        internal
        returns (JsonWriter memory)
    {
        string memory entry = writer.hasEntries ? string.concat(",", transactionJson) : transactionJson;
        vm.writeLine(writer.path, entry);
        writer.hasEntries = true;
        return writer;
    }

    function _finalizePayloadWriter(JsonWriter memory writer) internal {
        vm.writeLine(writer.path, "]}");
    }

    function _createUpgradeToTransactionJson(address proxy, address newImplementation)
        internal
        pure
        returns (string memory)
    {
        return string(
            abi.encodePacked(
                '{"to":"',
                _addressToString(proxy),
                '","value":"0","data":"',
                _bytesToHexString(abi.encodeWithSignature("upgradeTo(address)", newImplementation)),
                '","operation":0,"contractMethod":{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","payable":false},"contractInputsValues":{"newImplementation":"',
                _addressToString(newImplementation),
                '"}}'
            )
        );
    }

    function _createSetEscrowImplementationTransactionJson(address factoryProxy, address newEscrowImplementation)
        internal
        pure
        returns (string memory)
    {
        return string(
            abi.encodePacked(
                '{"to":"',
                _addressToString(factoryProxy),
                '","value":"0","data":"',
                _bytesToHexString(
                    abi.encodeWithSignature("setEscrowImplementation(address)", newEscrowImplementation)
                ),
                '","operation":0,"contractMethod":{"inputs":[{"internalType":"address","name":"implementation","type":"address"}],"name":"setEscrowImplementation","payable":false},"contractInputsValues":{"implementation":"',
                _addressToString(newEscrowImplementation),
                '"}}'
            )
        );
    }

    function _bytesToHexString(bytes memory _bytes) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + _bytes.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < _bytes.length; i++) {
            str[2 + i * 2] = alphabet[uint8(_bytes[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(_bytes[i] & 0x0f)];
        }
        return string(str);
    }

    function _resolveFactoryImplementation(address currentFactoryImplementation) internal returns (address) {
        address candidate = address(new StreamingEscrowFactory());
        if (currentFactoryImplementation != address(0) && _codehash(candidate) == _codehash(currentFactoryImplementation)) {
            return currentFactoryImplementation;
        }
        return candidate;
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
