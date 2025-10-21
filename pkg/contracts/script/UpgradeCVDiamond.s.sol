// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {CVStrategyV0_0} from "../src/CVStrategy/CVStrategyV0_0.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPowerFacet} from "../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {RegistryCommunityV0_0} from "../src/RegistryCommunity/RegistryCommunityV0_0.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactory/RegistryFactoryV0_0.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
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
        console2.log("=== Starting Diamond Pattern Upgrade ===");

        // 1. Deploy new implementation and facets
        console2.log("\n[1/5] Deploying new CVStrategy implementation and facets...");
        address strategyImplementation = address(new CVStrategyV0_0());
        console2.log("  CVStrategyV0_0 impl:", strategyImplementation);

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

        // 2. Update RegistryFactory strategy template
        console2.log("\n[2/5] Updating RegistryFactory strategy template...");
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactoryV0_0 registryFactory = RegistryFactoryV0_0(payable(address(registryFactoryProxy)));
        registryFactory.setStrategyTemplate(strategyImplementation);
        console2.log("  RegistryFactory template updated");

        // 3. Update RegistryCommunity strategy templates
        console2.log("\n[3/5] Updating RegistryCommunity strategy templates...");
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunityV0_0 registryCommunity =
                RegistryCommunityV0_0(payable(address(registryCommunityProxies[i])));
            registryCommunity.setStrategyTemplate(strategyImplementation);
            console2.log("  Community", i+1, "template updated:", registryCommunityProxies[i]);
        }

        // 4. Upgrade existing CVStrategy proxies and configure facets
        console2.log("\n[4/5] Upgrading existing CVStrategy proxies with diamond cuts...");
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        IDiamond.FacetCut[] memory cuts = _getFacetCuts();

        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            CVStrategyV0_0 cvStrategy = CVStrategyV0_0(payable(address(cvStrategyProxies[i])));

            // Upgrade implementation
            cvStrategy.upgradeTo(strategyImplementation);
            console2.log("  Strategy", i+1, "upgraded:", cvStrategyProxies[i]);

            // Configure diamond facets
            cvStrategy.diamondCut(cuts, address(0), "");
            console2.log("  Strategy", i+1, "diamond cut configured");
        }

        console2.log("\n[5/5] Diamond upgrade complete!");
        console2.log("  Total strategies upgraded:", cvStrategyProxies.length);
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
        bytes4[] memory proposalSelectors = new bytes4[](2);
        proposalSelectors[0] = CVProposalFacet.registerRecipient.selector;
        proposalSelectors[1] = CVProposalFacet.cancelProposal.selector;
        cuts[4] = IDiamond.FacetCut({
            facetAddress: address(proposalFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: proposalSelectors
        });

        return cuts;
    }
}
