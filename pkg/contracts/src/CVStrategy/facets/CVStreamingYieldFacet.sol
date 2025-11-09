// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {Proposal, ProposalStatus, ProposalType} from "../ICVStrategy.sol";
import {ConvictionsUtils} from "../ConvictionsUtils.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVStreamingYieldFacet
 * @notice Continuous yield distribution via Superfluid (replaces batch harvestYDS)
 * @dev For ProposalType.YieldDistribution pools
 * 
 * Flow:
 * 1. YDS strategy generates yield → mints donation shares to GDA
 * 2. rebalanceYieldStreams() redeems those shares for underlying
 * 3. Calculates total conviction across proposals
 * 4. Allocates GDA units proportionally to conviction
 * 5. Superfluid GDA streams underlying to beneficiaries continuously
 * 
 * vs Batch Harvest (CVYDSFacet.harvestYDS):
 * - Batch: Manual call → redeem → distribute lump sum
 * - Streaming: Periodic rebalance → update units → continuous flow
 */
contract CVStreamingYieldFacet is CVStrategyBaseFacet {
    using SuperTokenV1Library for ISuperToken;
    using ConvictionsUtils for uint256;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event YieldStreamsRebalanced(
        uint256 indexed poolId,
        uint256 activeProposals,
        uint256 totalConviction,
        uint256 timestamp
    );

    event ProposalYieldShare(
        uint256 indexed proposalId,
        uint256 conviction,
        uint128 units,
        uint256 shareBps
    );

    event DonationSharesRedeemed(
        address indexed ydsStrategy,
        uint256 shares,
        uint256 assets,
        address recipient
    );

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    // Errors now defined in CVStrategyBaseFacet for shared access

    /*//////////////////////////////////////////////////////////////
                        YIELD STREAMING CORE
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Rebalance all yield streams based on current conviction
     * @dev Keeper function - should be called periodically (e.g., every hour)
     * 
     * Process:
     * 1. Redeem accumulated donation shares from YDS strategy
     * 2. Update conviction for all active proposals
     * 3. Calculate total conviction
     * 4. Allocate GDA units proportionally
     * 5. Start/update/stop streams as needed
     */
    function rebalanceYieldStreams() external {
        _checkOnlyInitialized();
        
        if (proposalType != ProposalType.YieldDistribution) {
            revert WrongProposalType();
        }
        
        if (!streamingEnabled) {
            revert StreamingNotEnabled();
        }
        
        if (superfluidGDA == address(0)) {
            revert GDANotConfigured();
        }
        
        // Step 1: Redeem accumulated donation shares from YDS
        if (address(ydsStrategy) != address(0)) {
            _redeemDonationShares();
        } else if (address(cvVault) == address(0)) {
            revert NoVaultConfigured();
        }
        
        // Step 2 & 3: Calculate total conviction
        (uint256 totalConviction, uint256 activeCount, uint256[] memory proposalIds, uint256[] memory convictions) = 
            _calculateTotalConviction();
        
        // If no conviction, stop all streams
        if (totalConviction == 0 || activeCount == 0) {
            _stopAllStreams();
            emit YieldStreamsRebalanced(poolId, 0, 0, block.timestamp);
            return;
        }
        
        // Step 4 & 5: Allocate units and update streams
        _allocateStreams(totalConviction, activeCount, proposalIds, convictions);
        
        emit YieldStreamsRebalanced(poolId, activeCount, totalConviction, block.timestamp);
    }

    /**
     * @notice Redeem donation shares from YDS strategy
     * @dev Converts accumulated donation shares to underlying assets
     */
    function _redeemDonationShares() internal {
        uint256 donationShares = ydsStrategy.balanceOf(superfluidGDA);
        
        if (donationShares == 0) {
            return; // No shares to redeem
        }
        
        // Redeem shares for underlying (sent to GDA)
        // GDA will then stream to beneficiaries
        uint256 assets = ydsStrategy.redeem(
            donationShares,
            superfluidGDA,
            superfluidGDA
        );
        
        emit DonationSharesRedeemed(address(ydsStrategy), donationShares, assets, superfluidGDA);
    }

    /**
     * @notice Calculate total conviction across all active proposals
     * @return totalConviction Sum of all proposal convictions
     * @return activeCount Number of proposals with conviction > 0
     * @return proposalIds Array of active proposal IDs
     * @return convictions Array of conviction values
     */
    function _calculateTotalConviction()
        internal
        returns (
            uint256 totalConviction,
            uint256 activeCount,
            uint256[] memory proposalIds,
            uint256[] memory convictions
        )
    {
        uint256 length = proposalCounter;
        proposalIds = new uint256[](length);
        convictions = new uint256[](length);
        
        for (uint256 i = 1; i <= length; i++) {
            Proposal storage p = proposals[i];
            
            // Skip inactive proposals
            if (p.proposalStatus != ProposalStatus.Active) {
                // Stop stream if it's active
                if (proposalStreams[i].isActive) {
                    _stopStreamViaCore(i);
                }
                continue;
            }
            
            // Update conviction
            _calculateAndSetConviction(p, p.stakedAmount);
            
            if (p.convictionLast > 0) {
                proposalIds[activeCount] = i;
                convictions[activeCount] = p.convictionLast;
                totalConviction += p.convictionLast;
                activeCount++;
            } else if (proposalStreams[i].isActive) {
                // Stop stream if conviction dropped to zero
                _stopStreamViaCore(i);
            }
        }
        
        return (totalConviction, activeCount, proposalIds, convictions);
    }

    /**
     * @notice Allocate GDA units to proposals based on conviction
     * @param totalConviction Sum of all convictions
     * @param activeCount Number of active proposals
     * @param proposalIds Array of proposal IDs
     * @param convictions Array of conviction values
     */
    function _allocateStreams(
        uint256 totalConviction,
        uint256 activeCount,
        uint256[] memory proposalIds,
        uint256[] memory convictions
    ) internal {
        uint128 totalUnits = 10000; // Base units representing 100%
        
        for (uint256 j = 0; j < activeCount; j++) {
            uint256 propId = proposalIds[j];
            uint256 conviction = convictions[j];
            Proposal storage p = proposals[propId];
            
            // Calculate share in basis points
            uint256 shareBps = (conviction * 10000) / totalConviction;
            uint128 units = uint128((uint256(totalUnits) * shareBps) / 10000);
            
            if (units == 0) {
                // Conviction too small for meaningful share
                if (proposalStreams[propId].isActive) {
                    _stopStreamViaCore(propId);
                }
                continue;
            }
            
            StreamState storage stream = proposalStreams[propId];
            
            if (stream.isActive) {
                // Update existing stream if units changed
                if (stream.flowUnits != units) {
                    _updateStreamViaCore(propId, units);
                }
            } else {
                // Start new stream
                _startStreamViaCore(propId, p.beneficiary, units);
            }
            
            emit ProposalYieldShare(propId, conviction, units, shareBps);
        }
        
        // Stop any proposals that are no longer in active list
        _stopInactiveStreams(activeCount, proposalIds);
    }

    /**
     * @notice Stop streams for proposals not in the active list
     */
    function _stopInactiveStreams(uint256 activeCount, uint256[] memory activeProposalIds) internal {
        for (uint256 i = 1; i <= proposalCounter; i++) {
            if (!proposalStreams[i].isActive) continue;
            
            // Check if this proposal is in active list
            bool found = false;
            for (uint256 j = 0; j < activeCount; j++) {
                if (activeProposalIds[j] == i) {
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                _stopStreamViaCore(i);
            }
        }
    }

    /**
     * @notice Stop all active streams
     */
    function _stopAllStreams() internal {
        for (uint256 i = 1; i <= proposalCounter; i++) {
            if (proposalStreams[i].isActive) {
                _stopStreamViaCore(i);
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                        CORE FACET INTEGRATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Start stream via core facet (internal delegatecall)
     */
    function _startStreamViaCore(uint256 proposalId, address beneficiary, uint128 units) internal {
        (bool success,) = address(this).delegatecall(
            abi.encodeWithSignature("startStream(uint256,address,uint128)", proposalId, beneficiary, units)
        );
        if (!success) {
            revert SuperfluidOperationFailed("startStream");
        }
    }

    /**
     * @notice Update stream via core facet (internal delegatecall)
     */
    function _updateStreamViaCore(uint256 proposalId, uint128 newUnits) internal {
        (bool success,) = address(this).delegatecall(
            abi.encodeWithSignature("updateStream(uint256,uint128)", proposalId, newUnits)
        );
        if (!success) {
            revert SuperfluidOperationFailed("updateStream");
        }
    }

    /**
     * @notice Stop stream via core facet (internal delegatecall)
     */
    function _stopStreamViaCore(uint256 proposalId) internal {
        (bool success,) = address(this).delegatecall(
            abi.encodeWithSignature("stopStream(uint256)", proposalId)
        );
        // Don't revert on failure - best effort during cleanup
    }

    /*//////////////////////////////////////////////////////////////
                        SINGLE PROPOSAL REBALANCE
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Rebalance specific proposal (gas-efficient single update)
     * @dev Useful for immediate updates after support changes
     * @param proposalId Proposal to rebalance
     */
    function rebalanceProposalYieldStream(uint256 proposalId) external {
        _checkOnlyInitialized();
        
        if (!proposalExists(proposalId)) {
            revert();
        }
        
        Proposal storage p = proposals[proposalId];
        
        // If proposal not active, stop stream if exists
        if (p.proposalStatus != ProposalStatus.Active) {
            if (proposalStreams[proposalId].isActive) {
                _stopStreamViaCore(proposalId);
            }
            return;
        }
        
        // Update conviction
        _calculateAndSetConviction(p, p.stakedAmount);
        
        // Trigger full rebalance to recalculate proportions
        // (necessary because one proposal's change affects all unit allocations)
        this.rebalanceYieldStreams();
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get projected unit allocation for all active proposals
     * @return proposalIds Array of proposal IDs
     * @return units Array of units each would receive
     * @return shareBps Array of share percentages in basis points
     */
    function getProjectedUnitAllocation()
        external
        view
        returns (
            uint256[] memory proposalIds,
            uint128[] memory units,
            uint256[] memory shareBps
        )
    {
        // Calculate without modifying state
        uint256 totalConviction;
        uint256 activeCount;
        
        for (uint256 i = 1; i <= proposalCounter; i++) {
            Proposal storage p = proposals[i];
            if (p.proposalStatus == ProposalStatus.Active && p.convictionLast > 0) {
                totalConviction += p.convictionLast;
                activeCount++;
            }
        }
        
        if (totalConviction == 0) {
            return (new uint256[](0), new uint128[](0), new uint256[](0));
        }
        
        proposalIds = new uint256[](activeCount);
        units = new uint128[](activeCount);
        shareBps = new uint256[](activeCount);
        
        uint256 index = 0;
        for (uint256 i = 1; i <= proposalCounter; i++) {
            Proposal storage p = proposals[i];
            if (p.proposalStatus == ProposalStatus.Active && p.convictionLast > 0) {
                proposalIds[index] = i;
                shareBps[index] = (p.convictionLast * 10000) / totalConviction;
                units[index] = uint128((10000 * shareBps[index]) / 10000);
                index++;
            }
        }
    }

    /**
     * @notice Get current yield available for streaming
     * @return uint256 Amount of donation shares in GDA (if YDS mode)
     */
    function getAvailableYield() external view returns (uint256) {
        if (address(ydsStrategy) != address(0)) {
            return ydsStrategy.balanceOf(superfluidGDA);
        }
        return 0;
    }
}

