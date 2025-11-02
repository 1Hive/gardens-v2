// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategy} from "../../src/CVStrategy/CVStrategy.sol";
import {CVAdminFacet} from "../../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPowerFacet} from "../../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../../src/CVStrategy/facets/CVProposalFacet.sol";
import {IDiamondCut} from "../../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamond} from "../../src/diamonds/interfaces/IDiamond.sol";

/**
 * @title DiamondConfigurator
 * @notice Helper contract to deploy and configure CVStrategy diamond facets
 * @dev Used in tests to properly set up the diamond pattern after strategy deployment
 */
contract DiamondConfigurator {
    CVAdminFacet public adminFacet;
    CVAllocationFacet public allocationFacet;
    CVDisputeFacet public disputeFacet;
    CVPowerFacet public powerManagementFacet;
    CVProposalFacet public proposalManagementFacet;

    constructor() {
        // Deploy all facets
        adminFacet = new CVAdminFacet();
        allocationFacet = new CVAllocationFacet();
        disputeFacet = new CVDisputeFacet();
        powerManagementFacet = new CVPowerFacet();
        proposalManagementFacet = new CVProposalFacet();
    }

    /**
     * @notice Get facet cuts for configuring a CVStrategy instance
     * @return cuts Array of FacetCut structs to pass to diamondCut()
     */
    function getFacetCuts() public view returns (IDiamond.FacetCut[] memory cuts) {
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
            facetAddress: address(powerManagementFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: powerSelectors
        });

        // CVProposalFacet functions
        bytes4[] memory proposalSelectors = new bytes4[](2);
        proposalSelectors[0] = CVProposalFacet.registerRecipient.selector;
        proposalSelectors[1] = CVProposalFacet.cancelProposal.selector;
        cuts[4] = IDiamond.FacetCut({
            facetAddress: address(proposalManagementFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: proposalSelectors
        });

        return cuts;
    }

    /**
     * @notice Configure all facets for a CVStrategy instance
     * @dev Caller must be the owner of the strategy
     * @param strategy The CVStrategy instance to configure
     */
    function configureFacets(address payable strategy) external {
        IDiamond.FacetCut[] memory cuts = getFacetCuts();
        CVStrategy(strategy).diamondCut(cuts, address(0), "");
    }
}
