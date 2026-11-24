// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";

interface IPauseFacet {
    function setPauseController(address controller) external;
    function pauseController() external view returns (address);
}

contract DeployGlobalPauseControllerProd is BaseMultiChain {
    using stdJson for string;
    uint256 private constant MAX_TRANSACTIONS_PER_BATCH = 20;

    error PauseControllerReadFailed(address target);

    struct JsonWriter {
        string path;
        bool hasEntries;
        uint256 count;
        uint256 batch;
        address safeOwner;
        string networkJson;
    }

    function runCurrentNetwork(string memory networkJson) public override {
        address pauseController = networkJson.readAddress(getKeyNetwork(".ENVS.PAUSE_CONTROLLER"));
        if (pauseController == address(0)) {
            revert("PAUSE_CONTROLLER not set in networks.json");
        }

        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        address safeOwner = ProxyOwner(proxyOwner).mainOwner();

        JsonWriter memory writer = _initPayloadWriter(safeOwner, networkJson, 1);

        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            writer = _appendIfNeeded(writer, registryCommunityProxies[i], pauseController);
        }

        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            writer = _appendIfNeeded(writer, cvStrategyProxies[i], pauseController);
        }

        writer =
            _appendIfNeeded(writer, networkJson.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER")), pauseController);
        writer =
            _appendIfNeeded(writer, networkJson.readAddress(getKeyNetwork(".ENVS.GOOD_DOLLAR_SYBIL")), pauseController);
        writer = _appendIfNeeded(writer, networkJson.readAddress(getKeyNetwork(".ENVS.ARBITRATOR")), pauseController);
        writer = _appendIfNeeded(
            writer, networkJson.readAddress(getKeyNetwork(".ENVS.STREAMING_ESCROW_FACTORY")), pauseController
        );

        _finalizePayloadWriter(writer);
    }

    function _appendIfNeeded(JsonWriter memory writer, address target, address controller)
        internal
        returns (JsonWriter memory)
    {
        if (target == address(0)) return writer;
        try IPauseFacet(target).pauseController() returns (address current) {
            if (current == controller) return writer;
        } catch {
            revert PauseControllerReadFailed(target);
        }
        return _appendTransaction(
            writer,
            _createTransactionJson(target, abi.encodeWithSelector(IPauseFacet.setPauseController.selector, controller))
        );
    }

    function _initPayloadWriter(address safeOwner, string memory networkJson, uint256 batch)
        internal
        returns (JsonWriter memory writer)
    {
        vm.createDir("transaction-builder", true);
        writer.path = string.concat(
            vm.projectRoot(),
            "/pkg/contracts/transaction-builder/",
            CURRENT_NETWORK,
            "-pause-controller",
            batch == 1 ? "" : string.concat("-", vm.toString(batch)),
            ".json"
        );
        writer.safeOwner = safeOwner;
        writer.networkJson = networkJson;
        writer.batch = batch;
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
            '"name":"Set Global Pause Controller",',
            '"description":"Safe Transaction Builder payload to set pause controller on all communities and strategies",',
            '"txBuilderVersion":"1.18.0",',
            '"createdFromSafeAddress":"',
            _addressToString(safeOwner),
            '",',
            '"createdFromOwnerAddress":"',
            _addressToString(msg.sender),
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
        if (writer.count == MAX_TRANSACTIONS_PER_BATCH) {
            _finalizePayloadWriter(writer);
            writer = _initPayloadWriter(writer.safeOwner, writer.networkJson, writer.batch + 1);
        }
        string memory entry = writer.hasEntries ? string.concat(",", transactionJson) : transactionJson;
        vm.writeLine(writer.path, entry);
        writer.hasEntries = true;
        writer.count++;
        return writer;
    }

    function _finalizePayloadWriter(JsonWriter memory writer) internal {
        vm.writeLine(writer.path, "]}");
    }

    function _createTransactionJson(address to, bytes memory data) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '{"to":"',
                _addressToString(to),
                '","value":"0","data":"',
                _bytesToHexString(data),
                '","operation":0,"contractMethod":{"inputs":[],"name":"","payable":false},"contractInputsValues":{}}'
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
}
