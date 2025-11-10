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
import "forge-std/console2.sol";

/**
 * @title UpgradeCVDiamondTest
 * @notice Testnet/local script that upgrades CVStrategy contracts by directly broadcasting diamond cuts
 * @dev Deploys facets, updates templates, and executes upgrades against the caller's wallet
 */
contract UpgradeCVDiamondTest is BaseMultiChain {
    using stdJson for string;

    CVAdminFacet public adminFacet;
    CVAllocationFacet public allocationFacet;
    CVDisputeFacet public disputeFacet;
    CVPowerFacet public powerFacet;
    CVProposalFacet public proposalFacet;

    function runCurrentNetwork(string memory networkJson) public override {
        console2.log("=== Starting Diamond Pattern Upgrade (Direct Broadcast) ===");

        // 1. Deploy new implementation and facets
        console2.log("\n[1/4] Deploying CVStrategy implementation and facets...");
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

        // 2. Update RegistryFactory strategy template
        console2.log("\n[2/4] Updating RegistryFactory strategy template...");
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactory registryFactory = RegistryFactory(payable(address(registryFactoryProxy)));
        registryFactory.setStrategyTemplate(strategyImplementation);
        console2.log("  RegistryFactory template updated:", registryFactoryProxy);

        // 3. Update RegistryCommunity strategy templates
        console2.log("\n[3/4] Updating RegistryCommunity strategy templates...");
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity registryCommunity = RegistryCommunity(payable(address(registryCommunityProxies[i])));
            registryCommunity.setStrategyTemplate(strategyImplementation);
            console2.log("  Community", i + 1, "template updated:", registryCommunityProxies[i]);
        }

        // 4. Upgrade existing CVStrategy proxies and configure facets
        console2.log("\n[4/4] Upgrading CVStrategy proxies and applying diamond cuts...");
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        IDiamond.FacetCut[] memory cuts = _getFacetCuts();

        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            CVStrategy cvStrategy = CVStrategy(payable(address(cvStrategyProxies[i])));

            cvStrategy.upgradeTo(strategyImplementation);
            cvStrategy.diamondCut(cuts, address(0), "");

            console2.log("  Strategy", i + 1, "upgraded with diamond facets:", cvStrategyProxies[i]);
        }

        console2.log("\n=== Upgrade complete ===");
        console2.log("Registry Factory:", registryFactoryProxy);
        console2.log("Registry Communities:", registryCommunityProxies.length);
        console2.log("CV Strategies:", cvStrategyProxies.length);
    }

    /**
     * @notice Get facet cuts for diamond configuration
     * @return cuts Array of FacetCut structs matching DiamondConfigurator pattern
     */
    function _getFacetCuts() internal view returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](6);

        // Replace existing selectors with freshly deployed facets
        bytes4[] memory adminSelectors = new bytes4[](3);
        adminSelectors[0] = CVAdminFacet.setPoolParams.selector;
        adminSelectors[1] = CVAdminFacet.connectSuperfluidGDA.selector;
        adminSelectors[2] = CVAdminFacet.disconnectSuperfluidGDA.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(adminFacet),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: adminSelectors
        });

        bytes4[] memory allocationSelectors = new bytes4[](2);
        allocationSelectors[0] = CVAllocationFacet.allocate.selector;
        allocationSelectors[1] = CVAllocationFacet.distribute.selector;
        cuts[1] = IDiamond.FacetCut({
            facetAddress: address(allocationFacet),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: allocationSelectors
        });

        bytes4[] memory disputeSelectors = new bytes4[](2);
        disputeSelectors[0] = CVDisputeFacet.disputeProposal.selector;
        disputeSelectors[1] = CVDisputeFacet.rule.selector;
        cuts[2] = IDiamond.FacetCut({
            facetAddress: address(disputeFacet),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: disputeSelectors
        });

        bytes4[] memory powerSelectors = new bytes4[](3);
        powerSelectors[0] = CVPowerFacet.decreasePower.selector;
        powerSelectors[1] = bytes4(keccak256("deactivatePoints()"));
        powerSelectors[2] = bytes4(keccak256("deactivatePoints(address)"));
        cuts[3] = IDiamond.FacetCut({
            facetAddress: address(powerFacet),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: powerSelectors
        });

        // Proposal facet already existed; replace old selectors and add the new edit functionality
        bytes4[] memory proposalReplace = new bytes4[](2);
        proposalReplace[0] = CVProposalFacet.registerRecipient.selector;
        proposalReplace[1] = CVProposalFacet.cancelProposal.selector;
        cuts[4] = IDiamond.FacetCut({
            facetAddress: address(proposalFacet),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: proposalReplace
        });

        bytes4[] memory proposalAdd = new bytes4[](1);
        proposalAdd[0] = CVProposalFacet.editProposal.selector;
        cuts[5] = IDiamond.FacetCut({
            facetAddress: address(proposalFacet),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: proposalAdd
        });

        return cuts;
    }
}
