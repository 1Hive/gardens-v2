// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPowerFacet} from "../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {DiamondLoupeFacet} from "../src/diamonds/facets/DiamondLoupeFacet.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {StrategyDiamondConfiguratorBase} from "../test/helpers/StrategyDiamondConfigurator.sol";
import "forge-std/console2.sol";

/**
 * @title UpgradeCVDiamond
 * @notice Upgrades CVStrategy contracts to diamond pattern with facets
 * @dev Can broadcast upgrades directly or generate Safe transaction payloads via a flag
 */
contract UpgradeCVDiamond is BaseMultiChain, StrategyDiamondConfiguratorBase {
    using stdJson for string;

    bool internal directBroadcastOverride;

    // Deployed facet addresses
    CVAdminFacet public adminFacet;
    CVAllocationFacet public allocationFacet;
    CVDisputeFacet public disputeFacet;
    CVPowerFacet public powerFacet;
    CVProposalFacet public proposalFacet;
    DiamondLoupeFacet public loupeFacet;

    function runCurrentNetwork(string memory networkJson) public override {
        // Auto-detect direct broadcast mode based on network config
        // Testnets with "no-safe": true will use direct broadcast
        // Production networks will generate Safe Transaction Builder JSON
        bool directBroadcast = directBroadcastOverride || networkJson.readBool(getKeyNetwork(".no-safe"));
        console2.log(
            directBroadcast
                ? "=== Starting Diamond Pattern Upgrade (Direct Broadcast) ==="
                : "=== Starting Diamond Pattern Upgrade (Safe Transaction Builder) ==="
        );

        // 1. Deploy new implementation and facets
        console2.log(
            directBroadcast
                ? "\n[1/4] Deploying new CVStrategy implementation and facets..."
                : "\n[1/5] Deploying new CVStrategy implementation and facets..."
        );
        address strategyImplementation = address(new CVStrategy());
        console2.log("  CVStrategy impl:", strategyImplementation);

        adminFacet = new CVAdminFacet();
        console2.log("  CVAdminFacet:", address(adminFacet));

        allocationFacet = new CVAllocationFacet();
        console2.log("  CVAllocationFacet:", address(allocationFacet));

        disputeFacet = new CVDisputeFacet();
        console2.log("  CVDisputeFacet:", address(disputeFacet));

        powerFacet = new CVPowerFacet();
        console2.log("  CVPowerFacet:", address(powerFacet));

        proposalFacet = new CVProposalFacet();
        console2.log("  CVProposalFacet:", address(proposalFacet));

        loupeFacet = new DiamondLoupeFacet();
        console2.log("  DiamondLoupeFacet:", address(loupeFacet));

        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        IDiamond.FacetCut[] memory cuts = _buildAllFacetCuts();

        if (directBroadcast) {
            RegistryFactory registryFactory = RegistryFactory(payable(registryFactoryProxy));
            _executeDirectUpgrades(
                registryFactory,
                registryFactoryProxy,
                registryCommunityProxies,
                cvStrategyProxies,
                strategyImplementation,
                cuts
            );
        } else {
            address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
            address safeOwner = ProxyOwner(proxyOwner).owner();
            _generateSafeTransactions(
                registryFactoryProxy,
                registryCommunityProxies,
                cvStrategyProxies,
                strategyImplementation,
                cuts,
                safeOwner,
                networkJson
            );
        }

        console2.log("\n=== Summary ===");
        console2.log("Registry Factory: %s", registryFactoryProxy);
        console2.log("Registry Communities: %s", registryCommunityProxies.length);
        console2.log("CV Strategies: %s", cvStrategyProxies.length);
        if (!directBroadcast) {
            console2.log("Total transactions: %s", 1 + registryCommunityProxies.length + (cvStrategyProxies.length * 2));
        }
    }

    function _executeDirectUpgrades(
        RegistryFactory registryFactory,
        address registryFactoryProxy,
        address[] memory registryCommunityProxies,
        address[] memory cvStrategyProxies,
        address strategyImplementation,
        IDiamond.FacetCut[] memory cuts
    ) internal {
        console2.log("\n[2/4] Updating RegistryFactory strategy template...");
        registryFactory.setStrategyTemplate(strategyImplementation);
        console2.log("  RegistryFactory template updated:", registryFactoryProxy);

        console2.log("\n[3/4] Updating RegistryCommunity strategy templates...");
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity registryCommunity = RegistryCommunity(payable(address(registryCommunityProxies[i])));
            registryCommunity.setStrategyTemplate(strategyImplementation);
            console2.log("  Community", i + 1, "template updated:", registryCommunityProxies[i]);
        }

        console2.log("\n[4/4] Upgrading CVStrategy proxies and applying diamond cuts...");
        CVStrategyDiamondInit initContract = new CVStrategyDiamondInit();
        console2.log("  CVStrategyDiamondInit deployed:", address(initContract));

        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            CVStrategy cvStrategy = CVStrategy(payable(address(cvStrategyProxies[i])));
            cvStrategy.upgradeTo(strategyImplementation);
            cvStrategy.diamondCut(cuts, address(initContract), abi.encodeCall(CVStrategyDiamondInit.init, ()));
            console2.log("  Strategy", i + 1, "upgraded with diamond facets:", cvStrategyProxies[i]);
        }
    }

    function _generateSafeTransactions(
        address registryFactoryProxy,
        address[] memory registryCommunityProxies,
        address[] memory cvStrategyProxies,
        address strategyImplementation,
        IDiamond.FacetCut[] memory cuts,
        address safeOwner,
        string memory networkJson
    ) internal {
        console2.log("\n[2/5] Building RegistryFactory strategy template update transaction...");
        string memory json = string(abi.encodePacked("["));
        {
            bytes memory setStrategyTemplateData =
                abi.encodeWithSelector(RegistryFactory.setStrategyTemplate.selector, strategyImplementation);
            json = string(
                abi.encodePacked(json, _createTransactionJson(registryFactoryProxy, setStrategyTemplateData), ",")
            );
        }

        console2.log("\n[3/5] Building RegistryCommunity strategy template update transactions...");
        bytes memory communitySetStrategyTemplateData =
            abi.encodeWithSelector(RegistryCommunity.setStrategyTemplate.selector, strategyImplementation);
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            json = string(
                abi.encodePacked(
                    json, _createTransactionJson(registryCommunityProxies[i], communitySetStrategyTemplateData), ","
                )
            );
            console2.log("  Community", i + 1, "added to batch:", registryCommunityProxies[i]);
        }

        console2.log("\n[4/5] Building CVStrategy upgrade + diamond cut transactions...");
        CVStrategyDiamondInit initContract = new CVStrategyDiamondInit();
        console2.log("  CVStrategyDiamondInit deployed:", address(initContract));

        bytes4 upgradeSelector = bytes4(keccak256("upgradeTo(address)"));
        bytes memory diamondCutCalldata = abi.encodeWithSelector(
            CVStrategy.diamondCut.selector, cuts, address(initContract), abi.encodeCall(CVStrategyDiamondInit.init, ())
        );
        bytes memory upgradeCalldata = abi.encodeWithSelector(upgradeSelector, strategyImplementation);

        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            json = string(abi.encodePacked(json, _createTransactionJson(cvStrategyProxies[i], upgradeCalldata), ","));

            json = string(abi.encodePacked(json, _createTransactionJson(cvStrategyProxies[i], diamondCutCalldata), ","));

            console2.log("  Strategy", i + 1, "added to batch:", cvStrategyProxies[i]);
        }

        json = string(abi.encodePacked(_removeLastChar(json), "]"));

        _writePayloadFile(json, safeOwner, networkJson);

        console2.log("\n[5/5] Safe Transaction Builder JSON generated!");
    }

    /**
     * @notice Build all facet cuts including DiamondLoupeFacet (6 total)
     */
    function _buildAllFacetCuts() internal view returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts =
            _buildFacetCuts(adminFacet, allocationFacet, disputeFacet, powerFacet, proposalFacet);
        cuts = new IDiamond.FacetCut[](6);
        for (uint256 i = 0; i < 5; i++) {
            cuts[i] = baseCuts[i];
        }
        cuts[5] = _buildLoupeFacetCut(loupeFacet);
    }

    /**
     * @notice Write the Safe Transaction Builder JSON payload to file
     * @param transactionsJson JSON array of transactions
     * @param safeOwner Safe owner address
     * @param networkJson Network configuration JSON
     */
    function _writePayloadFile(string memory transactionsJson, address safeOwner, string memory networkJson) internal {
        string memory payload = string.concat(
            "{",
            '"version":"1.0",',
            '"chainId":"',
            vm.toString(block.chainid),
            '",',
            '"createdAt":',
            vm.toString(block.timestamp * 1000),
            ",",
            '"meta":{',
            '"name":"CVStrategy Diamond Pattern Upgrade",',
            '"description":"Upgrades CVStrategy contracts to diamond pattern with 5 facets (Admin, Allocation, Dispute, Power, Proposal)",',
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
            '"transactions":',
            transactionsJson,
            "}"
        );

        // Ensure folder exists and write file
        vm.createDir("transaction-builder", true);
        string memory path = string.concat(
            vm.projectRoot(), "/pkg/contracts/transaction-builder/", CURRENT_NETWORK, "-diamond-upgrade-payload.json"
        );

        vm.writeFile(path, payload);
        console2.log("  File: %s", path);
    }

    /**
     * @notice Remove the last character from a string (used to remove trailing comma)
     * @param input The string to trim
     * @return Trimmed string
     */
    function _removeLastChar(string memory input) internal pure returns (string memory) {
        bytes memory inputBytes = bytes(input);
        require(inputBytes.length > 0, "String is empty");
        // Create a new bytes array with one less length
        bytes memory trimmedBytes = new bytes(inputBytes.length - 1);
        for (uint256 i = 0; i < inputBytes.length - 1; i++) {
            trimmedBytes[i] = inputBytes[i];
        }
        return string(trimmedBytes);
    }

    /**
     * @notice Create a Safe Transaction Builder JSON object for a single transaction
     * @param to Target contract address
     * @param data Encoded calldata
     * @return JSON string representing the transaction
     */
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

    /**
     * @notice Convert address to lowercase hex string with 0x prefix
     * @param _addr Address to convert
     * @return Hex string representation
     */
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

    /**
     * @notice Convert bytes to lowercase hex string with 0x prefix
     * @param _bytes Bytes to convert
     * @return Hex string representation
     */
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
