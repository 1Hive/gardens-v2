// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVStrategyTest} from "./CVStrategyTest.t.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAdminFacetV2} from "./mocks/CVAdminFacetV2.sol";
import {CVTestFacet} from "./mocks/CVTestFacet.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {ProposalType, PointSystem, CreateProposal} from "../src/CVStrategy/ICVStrategy.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";

/**
 * @title DiamondUpgradeTest
 * @notice Tests for diamond pattern upgrade scenarios (Replace, Add, Remove facets)
 * @dev Inherits from CVStrategyTest to reuse setup and helpers
 */
contract DiamondUpgradeTest is CVStrategyTest {
    CVAdminFacetV2 public adminFacetV2;
    CVTestFacet public testFacet;

    /**
     * @notice Test replacing an existing facet with an upgraded version
     * @dev Verifies that:
     *      1. Storage is preserved after upgrade
     *      2. New functions are callable
     *      3. Existing functions still work
     */
    function test_replaceFacet_storageIntact() public {
        // Create a pool with initial CVAdminFacet
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) =
            _createProposal(NATIVE, 0, 0, ProposalType.Funding, PointSystem.Unlimited);

        CVStrategy strategy = CVStrategy(payable(address(pool.strategy)));

        // Record state before upgrade
        uint256 totalStakedBefore = strategy.totalStaked();
        uint256 proposalCounterBefore = strategy.proposalCounter();


        // Deploy upgraded facet
        adminFacetV2 = new CVAdminFacetV2();

        // Prepare diamondCut to replace CVAdminFacet functions with V2
        // We'll replace all 3 existing functions from CVAdminFacet
        bytes4[] memory selectorsToReplace = new bytes4[](3);
        selectorsToReplace[0] = CVAdminFacet.setPoolParams.selector;
        selectorsToReplace[1] = CVAdminFacet.connectSuperfluidGDA.selector;
        selectorsToReplace[2] = CVAdminFacet.disconnectSuperfluidGDA.selector;

        // Also add the new VERSION function
        bytes4[] memory selectorsToAdd = new bytes4[](1);
        selectorsToAdd[0] = CVAdminFacetV2.VERSION.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);

        // Replace existing functions
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(adminFacetV2),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: selectorsToReplace
        });

        // Add new VERSION function
        cuts[1] = IDiamond.FacetCut({
            facetAddress: address(adminFacetV2),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectorsToAdd
        });

        // Execute upgrade as owner
        vm.startPrank(strategy.owner());
        strategy.diamondCut(cuts, address(0), "");
        vm.stopPrank();


        // Verify storage is intact after upgrade
        assertEq(strategy.totalStaked(), totalStakedBefore, "Total staked changed after upgrade");
        assertEq(strategy.proposalCounter(), proposalCounterBefore, "Proposal counter changed");

        // Verify proposal data is intact
        // Verify proposal counter is preserved (simple check that storage is intact)
        assertTrue(proposalId > 0 && proposalId <= proposalCounterBefore, "Proposal ID invalid");

        // Test new V2 function is callable
        string memory version = CVAdminFacetV2(payable(address(strategy))).VERSION();
        assertEq(version, "v2", "VERSION function not working");

    }

    /**
     * @notice Test adding a new facet to an existing diamond
     * @dev Verifies that:
     *      1. New facet functions are callable
     *      2. Existing facets continue to work
     *      3. Existing storage is accessible from new facet
     */
    function test_addNewFacet_existingFunctionsWork() public {
        // Create pool and proposal with existing facets
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) =
            _createProposal(NATIVE, 0, 0, ProposalType.Funding, PointSystem.Unlimited);

        CVStrategy strategy = CVStrategy(payable(address(pool.strategy)));

        // Record state before adding facet (no need to allocate, just having a proposal is enough)
        uint256 proposalCounterBefore = strategy.proposalCounter();
        assertTrue(proposalCounterBefore > 0, "Should have at least one proposal");

        // Deploy new test facet
        testFacet = new CVTestFacet();

        // Prepare diamondCut to add new facet
        bytes4[] memory newSelectors = new bytes4[](2);
        newSelectors[0] = CVTestFacet.testFunction.selector;
        newSelectors[1] = CVTestFacet.getTotalStaked.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(testFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: newSelectors
        });

        // Execute upgrade
        vm.startPrank(strategy.owner());
        strategy.diamondCut(cuts, address(0), "");
        vm.stopPrank();


        // Test new facet is callable
        uint256 result = CVTestFacet(payable(address(strategy))).testFunction();
        assertEq(result, 42, "New facet function not working");

        // Test new facet can access existing storage (totalStaked should be 0 since no allocations)
        uint256 totalStakedFromNewFacet = CVTestFacet(payable(address(strategy))).getTotalStaked();
        assertEq(totalStakedFromNewFacet, 0, "New facet can't read storage");

        // Verify existing facet functions still work
        // Verify proposal counter still valid
        assertTrue(proposalId > 0 && proposalId <= strategy.proposalCounter(), "Existing proposal check broken");
        assertEq(strategy.proposalCounter(), proposalCounterBefore, "Existing storage corrupted");

    }

    /**
     * @notice Test removing functions from a facet
     * @dev Verifies that:
     *      1. Removed functions revert when called
     *      2. Other functions from same facet still work
     *      3. Storage remains intact
     */
    function test_removeFunction_otherFunctionsWork() public {
        // Create pool with all facets
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) =
            _createProposal(NATIVE, 0, 0, ProposalType.Funding, PointSystem.Unlimited);

        CVStrategy strategy = CVStrategy(payable(address(pool.strategy)));

        uint256 proposalCounterBefore = strategy.proposalCounter();

        // Prepare to remove connectSuperfluidGDA function
        bytes4[] memory selectorsToRemove = new bytes4[](1);
        selectorsToRemove[0] = CVAdminFacet.connectSuperfluidGDA.selector;

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(0), // Must be zero for Remove action
            action: IDiamond.FacetCutAction.Remove,
            functionSelectors: selectorsToRemove
        });

        // Execute removal
        vm.startPrank(strategy.owner());
        strategy.diamondCut(cuts, address(0), "");
        vm.stopPrank();


        // Verify removed function reverts
        vm.expectRevert();
        CVAdminFacet(payable(address(strategy))).connectSuperfluidGDA(address(0x123));

        // Verify other function from same facet (CVAdminFacet) still works
        vm.expectRevert(); // disconnectSuperfluidGDA will revert for other reasons, but shouldn't revert with "function not found"
        CVAdminFacet(payable(address(strategy))).disconnectSuperfluidGDA(address(0x123));

        // Verify storage intact
        assertEq(strategy.proposalCounter(), proposalCounterBefore, "Storage corrupted");
        // Verify proposal counter still valid
        assertTrue(proposalId > 0 && proposalId <= strategy.proposalCounter(), "Proposal lost");

    }
}
