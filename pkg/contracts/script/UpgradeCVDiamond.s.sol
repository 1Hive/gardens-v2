// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPowerFacet} from "../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import "forge-std/console2.sol";

/**
 * @title UpgradeCVDiamond
 * @notice Upgrades CVStrategy contracts to diamond pattern with facets
 * @dev Deploys facets, upgrades main contract, and configures diamond cuts for all existing strategies
 */
contract UpgradeCVDiamond is BaseMultiChain {
    using stdJson for string;

    // Deployed facet addresses
    CVAdminFacet public adminFacet;
    CVAllocationFacet public allocationFacet;
    CVDisputeFacet public disputeFacet;
    CVPowerFacet public powerFacet;
    CVProposalFacet public proposalFacet;

    function runCurrentNetwork(string memory networkJson) public override {
        console2.log("=== Starting Diamond Pattern Upgrade (Safe Transaction Builder) ===");

        // 1. Deploy new implementation and facets
        console2.log("\n[1/5] Deploying new CVStrategy implementation and facets...");
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

        // Get ProxyOwner and Safe owner for JSON metadata
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        address safeOwner = ProxyOwner(proxyOwner).owner();

        string memory json = string(abi.encodePacked("["));

        // 2. Update RegistryFactory strategy template
        console2.log("\n[2/5] Building RegistryFactory strategy template update transaction...");
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactory registryFactory = RegistryFactory(payable(address(registryFactoryProxy)));
        {
            bytes memory setStrategyTemplate =
                abi.encodeWithSelector(registryFactory.setStrategyTemplate.selector, strategyImplementation);
            json =
                string(abi.encodePacked(json, _createTransactionJson(registryFactoryProxy, setStrategyTemplate), ","));
        }

        // 3. Update RegistryCommunity strategy templates
        console2.log("\n[3/5] Building RegistryCommunity strategy template update transactions...");
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity registryCommunity = RegistryCommunity(payable(address(registryCommunityProxies[i])));
            bytes memory setStrategyTemplate =
                abi.encodeWithSelector(registryCommunity.setStrategyTemplate.selector, strategyImplementation);
            json = string(
                abi.encodePacked(json, _createTransactionJson(registryCommunityProxies[i], setStrategyTemplate), ",")
            );
            console2.log("  Community", i + 1, "added to batch:", registryCommunityProxies[i]);
        }

        // 4. Upgrade existing CVStrategy proxies and configure facets
        console2.log("\n[4/5] Building CVStrategy upgrade + diamond cut transactions...");
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        IDiamond.FacetCut[] memory cuts = _getFacetCuts();
        bytes memory diamondCutCalldata = abi.encodeWithSelector(CVStrategy.diamondCut.selector, cuts, address(0), "");

        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            CVStrategy cvStrategy = CVStrategy(payable(address(cvStrategyProxies[i])));

            // 4.a - Upgrade implementation
            bytes memory upgradeCalldata = abi.encodeWithSelector(cvStrategy.upgradeTo.selector, strategyImplementation);
            json = string(abi.encodePacked(json, _createTransactionJson(cvStrategyProxies[i], upgradeCalldata), ","));

            // 4.b - Configure diamond facets
            json = string(abi.encodePacked(json, _createTransactionJson(cvStrategyProxies[i], diamondCutCalldata), ","));

            console2.log("  Strategy", i + 1, "added to batch:", cvStrategyProxies[i]);
        }

        // Console log summary
        console2.log("\n=== Summary ===");
        console2.log("Registry Factory: %s", registryFactoryProxy);
        console2.log("Registry Communities: %s", registryCommunityProxies.length);
        console2.log("CV Strategies: %s", cvStrategyProxies.length);
        console2.log("Total transactions: %s", 1 + registryCommunityProxies.length + (cvStrategyProxies.length * 2));

        // Remove the last comma and close the JSON array
        json = string(abi.encodePacked(_removeLastChar(json), "]"));

        // Write payload file
        _writePayloadFile(json, safeOwner, networkJson);

        console2.log("\n[5/5] Safe Transaction Builder JSON generated!");
    }

    /**
     * @notice Get facet cuts for diamond configuration
     * @return cuts Array of FacetCut structs matching DiamondConfigurator pattern
     */
    function _getFacetCuts() internal view returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](5);

        // CVAdminFacet functions
        bytes4[] memory adminSelectors = new bytes4[](3);
        adminSelectors[0] = CVAdminFacet.setPoolParams.selector;
        adminSelectors[1] = CVAdminFacet.connectSuperfluidGDA.selector;
        adminSelectors[2] = CVAdminFacet.disconnectSuperfluidGDA.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(adminFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: adminSelectors
        });

        // CVAllocationFacet functions
        bytes4[] memory allocationSelectors = new bytes4[](2);
        allocationSelectors[0] = CVAllocationFacet.allocate.selector;
        allocationSelectors[1] = CVAllocationFacet.distribute.selector;
        cuts[1] = IDiamond.FacetCut({
            facetAddress: address(allocationFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: allocationSelectors
        });

        // CVDisputeFacet functions
        bytes4[] memory disputeSelectors = new bytes4[](2);
        disputeSelectors[0] = CVDisputeFacet.disputeProposal.selector;
        disputeSelectors[1] = CVDisputeFacet.rule.selector;
        cuts[2] = IDiamond.FacetCut({
            facetAddress: address(disputeFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: disputeSelectors
        });

        // CVPowerFacet functions
        bytes4[] memory powerSelectors = new bytes4[](3);
        powerSelectors[0] = CVPowerFacet.decreasePower.selector;
        powerSelectors[1] = bytes4(keccak256("deactivatePoints()")); // No-parameter version
        powerSelectors[2] = bytes4(keccak256("deactivatePoints(address)")); // With address parameter
        cuts[3] = IDiamond.FacetCut({
            facetAddress: address(powerFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: powerSelectors
        });

        // CVProposalFacet functions
        bytes4[] memory proposalSelectors = new bytes4[](3);
        proposalSelectors[0] = CVProposalFacet.registerRecipient.selector;
        proposalSelectors[1] = CVProposalFacet.cancelProposal.selector;
        proposalSelectors[2] = CVProposalFacet.editProposal.selector;
        cuts[4] = IDiamond.FacetCut({
            facetAddress: address(proposalFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: proposalSelectors
        });

        return cuts;
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
