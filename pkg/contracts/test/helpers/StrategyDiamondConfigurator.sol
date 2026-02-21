// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVAdminFacet} from "../../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPauseFacet} from "../../src/CVStrategy/facets/CVPauseFacet.sol";
import {CVPowerFacet} from "../../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../../src/CVStrategy/facets/CVProposalFacet.sol";
import {CVSyncPowerFacet} from "../../src/CVStrategy/facets/CVSyncPowerFacet.sol";
import {DiamondLoupeFacet} from "../../src/diamonds/facets/DiamondLoupeFacet.sol";
import {CVStrategyDiamondInit} from "../../src/CVStrategy/CVStrategyDiamondInit.sol";
import {IDiamondCut} from "../../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamond} from "../../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondLoupe} from "../../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

abstract contract StrategyDiamondConfiguratorBase {
    function _buildFacetCuts(
        CVAdminFacet _adminFacet,
        CVAllocationFacet _allocationFacet,
        CVDisputeFacet _disputeFacet,
        CVPauseFacet _pauseFacet,
        CVPowerFacet _powerFacet,
        CVProposalFacet _proposalFacet,
        CVSyncPowerFacet _syncPowerFacet
    ) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](7);

        bytes4[] memory adminSelectors = new bytes4[](5);
        adminSelectors[0] =
            bytes4(keccak256("setPoolParams((address,address,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256,address[],address[],address)"));
        adminSelectors[1] =
            bytes4(keccak256("setPoolParams((address,address,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256,address[],address[],address,uint256)"));
        adminSelectors[2] = CVAdminFacet.connectSuperfluidGDA.selector;
        adminSelectors[3] = CVAdminFacet.disconnectSuperfluidGDA.selector;
        adminSelectors[4] = CVAdminFacet.setVotingPowerRegistry.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(_adminFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: adminSelectors
        });

        bytes4[] memory allocationSelectors = new bytes4[](2);
        allocationSelectors[0] = CVAllocationFacet.allocate.selector;
        allocationSelectors[1] = CVAllocationFacet.distribute.selector;
        cuts[1] = IDiamond.FacetCut({
            facetAddress: address(_allocationFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: allocationSelectors
        });

        bytes4[] memory disputeSelectors = new bytes4[](2);
        disputeSelectors[0] = CVDisputeFacet.disputeProposal.selector;
        disputeSelectors[1] = CVDisputeFacet.rule.selector;
        cuts[2] = IDiamond.FacetCut({
            facetAddress: address(_disputeFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: disputeSelectors
        });

        bytes4[] memory pauseSelectors = new bytes4[](12);
        pauseSelectors[0] = bytes4(keccak256("setPauseController(address)"));
        pauseSelectors[1] = bytes4(keccak256("setPauseFacet(address)"));
        pauseSelectors[2] = bytes4(keccak256("pauseFacet()"));
        pauseSelectors[3] = bytes4(keccak256("pauseController()"));
        pauseSelectors[4] = bytes4(keccak256("pause(uint256)"));
        pauseSelectors[5] = bytes4(keccak256("pause(bytes4,uint256)"));
        pauseSelectors[6] = bytes4(keccak256("unpause()"));
        pauseSelectors[7] = bytes4(keccak256("unpause(bytes4)"));
        pauseSelectors[8] = bytes4(keccak256("isPaused()"));
        pauseSelectors[9] = bytes4(keccak256("isPaused(bytes4)"));
        pauseSelectors[10] = bytes4(keccak256("pausedUntil()"));
        pauseSelectors[11] = bytes4(keccak256("pausedSelectorUntil(bytes4)"));
        cuts[3] = IDiamond.FacetCut({
            facetAddress: address(_pauseFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: pauseSelectors
        });

        bytes4[] memory powerSelectors = new bytes4[](5);
        powerSelectors[0] = CVPowerFacet.activatePoints.selector;
        powerSelectors[1] = CVPowerFacet.increasePower.selector;
        powerSelectors[2] = CVPowerFacet.decreasePower.selector;
        powerSelectors[3] = bytes4(keccak256("deactivatePoints()"));
        powerSelectors[4] = bytes4(keccak256("deactivatePoints(address)"));
        cuts[4] = IDiamond.FacetCut({
            facetAddress: address(_powerFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: powerSelectors
        });

        bytes4[] memory proposalSelectors = new bytes4[](3);
        proposalSelectors[0] = CVProposalFacet.registerRecipient.selector;
        proposalSelectors[1] = CVProposalFacet.cancelProposal.selector;
        proposalSelectors[2] = CVProposalFacet.editProposal.selector;
        cuts[5] = IDiamond.FacetCut({
            facetAddress: address(_proposalFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: proposalSelectors
        });

        bytes4[] memory syncSelectors = new bytes4[](4);
        syncSelectors[0] = CVSyncPowerFacet.setAuthorizedSyncCaller.selector;
        syncSelectors[1] = CVSyncPowerFacet.isAuthorizedSyncCaller.selector;
        syncSelectors[2] = CVSyncPowerFacet.syncPower.selector;
        syncSelectors[3] = CVSyncPowerFacet.batchSyncPower.selector;
        cuts[6] = IDiamond.FacetCut({
            facetAddress: address(_syncPowerFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: syncSelectors
        });
    }

    function _buildLoupeFacetCut(DiamondLoupeFacet _loupeFacet)
        internal
        pure
        virtual
        returns (IDiamond.FacetCut memory)
    {
        bytes4[] memory loupeSelectors = new bytes4[](5);
        loupeSelectors[0] = IDiamondLoupe.facets.selector;
        loupeSelectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        loupeSelectors[2] = IDiamondLoupe.facetAddresses.selector;
        loupeSelectors[3] = IDiamondLoupe.facetAddress.selector;
        loupeSelectors[4] = IERC165.supportsInterface.selector;
        return IDiamond.FacetCut({
            facetAddress: address(_loupeFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: loupeSelectors
        });
    }
}

/**
 * @title StrategyDiamondConfigurator
 * @notice Helper contract to deploy and configure CVStrategy diamond facets
 * @dev Used in tests to properly set up the diamond pattern after strategy deployment
 */
contract StrategyDiamondConfigurator is StrategyDiamondConfiguratorBase {
    CVAdminFacet public adminFacet;
    CVAllocationFacet public allocationFacet;
    CVDisputeFacet public disputeFacet;
    CVPauseFacet public pauseFacet;
    CVPowerFacet public powerFacet;
    CVProposalFacet public proposalFacet;
    CVSyncPowerFacet public syncPowerFacet;
    DiamondLoupeFacet public loupeFacet;
    CVStrategyDiamondInit public diamondInit;

    constructor() {
        // Deploy all facets
        adminFacet = new CVAdminFacet();
        allocationFacet = new CVAllocationFacet();
        disputeFacet = new CVDisputeFacet();
        pauseFacet = new CVPauseFacet();
        powerFacet = new CVPowerFacet();
        proposalFacet = new CVProposalFacet();
        syncPowerFacet = new CVSyncPowerFacet();
        loupeFacet = new DiamondLoupeFacet();
        diamondInit = new CVStrategyDiamondInit();
    }

    /**
     * @notice Get facet cuts for configuring a CVStrategy instance (includes DiamondLoupeFacet)
     * @return cuts Array of FacetCut structs to pass to diamondCut()
     */
    function getFacetCuts() public view returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts =
            _buildFacetCuts(adminFacet, allocationFacet, disputeFacet, pauseFacet, powerFacet, proposalFacet, syncPowerFacet);

        // Add loupe facet as first cut.
        cuts = new IDiamond.FacetCut[](8);
        cuts[0] = _buildLoupeFacetCut(loupeFacet);
        for (uint256 i = 0; i < 7; i++) {
            cuts[i + 1] = baseCuts[i];
        }
    }

    /**
     * @notice Get facet cuts with custom facets (includes DiamondLoupeFacet)
     */
    function getFacetCuts(
        CVAdminFacet _adminFacet,
        CVAllocationFacet _allocationFacet,
        CVDisputeFacet _disputeFacet,
        CVPauseFacet _pauseFacet,
        CVPowerFacet _powerFacet,
        CVProposalFacet _proposalFacet,
        CVSyncPowerFacet _syncPowerFacet,
        DiamondLoupeFacet _loupeFacet
    ) public pure returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts = _buildFacetCuts(
            _adminFacet, _allocationFacet, _disputeFacet, _pauseFacet, _powerFacet, _proposalFacet, _syncPowerFacet
        );

        cuts = new IDiamond.FacetCut[](8);
        cuts[0] = _buildLoupeFacetCut(_loupeFacet);
        for (uint256 i = 0; i < 7; i++) {
            cuts[i + 1] = baseCuts[i];
        }
    }

    /**
     * @notice Configure all facets for a CVStrategy instance
     * @dev Caller must be the owner of the strategy
     * @param strategy The CVStrategy instance to configure
     */
    function configureFacets(address payable strategy) external {
        IDiamond.FacetCut[] memory cuts = getFacetCuts();
        IDiamondCut(strategy).diamondCut(cuts, address(diamondInit), abi.encodeCall(CVStrategyDiamondInit.init, ()));
    }
}
