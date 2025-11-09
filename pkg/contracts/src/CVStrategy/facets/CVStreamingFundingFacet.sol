// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {Proposal, ProposalStatus, ProposalType} from "../ICVStrategy.sol";
import {ConvictionsUtils} from "../ConvictionsUtils.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVStreamingFundingFacet
 * @notice Threshold-based streaming for funding proposals
 * @dev For ProposalType.Funding and ProposalType.Streaming pools
 * 
 * Flow:
 * 1. Proposal created with requestedAmount
 * 2. Members allocate support → conviction accumulates
 * 3. When conviction >= threshold → stream starts
 * 4. When conviction < threshold → stream stops
 * 5. Can restart if conviction rises again
 * 
 * vs Yield Distribution:
 * - Yield: Proportional streaming (no threshold)
 * - Funding: Binary on/off based on threshold crossing
 */
contract CVStreamingFundingFacet is CVStrategyBaseFacet {
    using SuperTokenV1Library for ISuperToken;
    using ConvictionsUtils for uint256;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event ProposalStreamEvaluated(
        uint256 indexed proposalId,
        uint256 conviction,
        uint256 threshold,
        bool meetsThreshold,
        bool streamActive
    );

    event ThresholdCrossed(
        uint256 indexed proposalId,
        uint256 conviction,
        uint256 threshold,
        bool crossed
    );

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    // Errors now defined in CVStrategyBaseFacet for shared access

    /*//////////////////////////////////////////////////////////////
                    THRESHOLD-BASED STREAMING
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Evaluate single proposal and adjust stream based on threshold
     * @dev Called by keeper or automatically after support changes
     * @param proposalId Proposal to evaluate
     */
    function evaluateProposalStream(uint256 proposalId) external {
        _checkOnlyInitialized();
        
        if (proposalType != ProposalType.Funding && proposalType != ProposalType.Streaming) {
            revert WrongProposalType();
        }
        
        if (!streamingEnabled) {
            revert StreamingNotEnabled();
        }
        
        if (!proposalExists(proposalId)) {
            revert ProposalNotFoundStream();
        }
        
        Proposal storage p = proposals[proposalId];
        
        if (p.proposalStatus != ProposalStatus.Active) {
            // Stop stream if proposal no longer active
            if (proposalStreams[proposalId].isActive) {
                _stopStreamViaCore(proposalId);
            }
            return;
        }
        
        // Update conviction
        _calculateAndSetConviction(p, p.stakedAmount);
        
        // Calculate threshold
        uint256 threshold = _calculateProposalThreshold(proposalId);
        
        bool passesThreshold = p.convictionLast >= threshold;
        bool isStreaming = proposalStreams[proposalId].isActive;
        
        // Evaluate state transitions
        if (passesThreshold && !isStreaming) {
            // Start stream - conviction crossed threshold
            _startFundingStream(proposalId);
            emit ThresholdCrossed(proposalId, p.convictionLast, threshold, true);
        } else if (!passesThreshold && isStreaming) {
            // Stop stream - conviction dropped below threshold
            _stopStreamViaCore(proposalId);
            emit ThresholdCrossed(proposalId, p.convictionLast, threshold, false);
        }
        // If both true or both false, no change needed
        
        emit ProposalStreamEvaluated(
            proposalId,
            p.convictionLast,
            threshold,
            passesThreshold,
            proposalStreams[proposalId].isActive
        );
    }

    /**
     * @notice Batch evaluate all active funding proposals
     * @dev Keeper function - efficiently evaluates all proposals
     */
    function batchEvaluateStreams() external {
        _checkOnlyInitialized();
        
        if (proposalType != ProposalType.Funding && proposalType != ProposalType.Streaming) {
            revert WrongProposalType();
        }
        
        for (uint256 i = 1; i <= proposalCounter; i++) {
            if (proposals[i].proposalStatus == ProposalStatus.Active) {
                this.evaluateProposalStream(i);
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Calculate threshold for a funding proposal
     * @param proposalId Proposal ID
     * @return uint256 Required conviction threshold
     */
    function _calculateProposalThreshold(uint256 proposalId) internal view returns (uint256) {
        Proposal storage p = proposals[proposalId];
        
        if (p.requestedAmount == 0) {
            return 0; // No threshold for zero amount
        }
        
        return ConvictionsUtils.calculateThreshold(
            p.requestedAmount,
            getPoolAmount(),
            totalPointsActivated,
            cvParams.decay,
            cvParams.weight,
            cvParams.maxRatio,
            cvParams.minThresholdPoints
        );
    }

    /**
     * @notice Start funding stream with calculated units
     * @param proposalId Proposal to start streaming to
     */
    function _startFundingStream(uint256 proposalId) internal {
        Proposal storage p = proposals[proposalId];
        
        // Calculate units for funding proposal
        // Strategy: Allocate fixed units or proportional to requested amount
        uint128 units = _calculateFundingUnits(proposalId);
        
        if (units > 0) {
            _startStreamViaCore(proposalId, p.beneficiary, units);
        }
    }

    /**
     * @notice Calculate units for a funding proposal
     * @dev Multiple strategies possible:
     *      1. Fixed units per proposal (simple)
     *      2. Proportional to requestedAmount vs pool size
     *      3. Based on conviction level above threshold
     * @param proposalId Proposal ID
     * @return uint128 Units to allocate
     */
    function _calculateFundingUnits(uint256 proposalId) internal view returns (uint128) {
        Proposal storage p = proposals[proposalId];
        uint256 poolSize = getPoolAmount();
        
        if (poolSize == 0) return 0;
        
        // Strategy: Proportional to requested amount
        // e.g., requesting 10% of pool → get 10% of flow (1000 units out of 10000)
        uint256 requestRatio = (p.requestedAmount * 10000) / poolSize;
        
        // Cap at reasonable maximum (e.g., 50% of total flow)
        if (requestRatio > 5000) {
            requestRatio = 5000;
        }
        
        return uint128(requestRatio);
    }

    /*//////////////////////////////////////////////////////////////
                        CORE FACET INTEGRATION
    //////////////////////////////////////////////////////////////*/

    function _startStreamViaCore(uint256 proposalId, address beneficiary, uint128 units) internal {
        (bool success,) = address(this).delegatecall(
            abi.encodeWithSignature("startStream(uint256,address,uint128)", proposalId, beneficiary, units)
        );
        if (!success) {
            revert SuperfluidOperationFailed("startStream");
        }
    }

    function _stopStreamViaCore(uint256 proposalId) internal {
        (bool success,) = address(this).delegatecall(
            abi.encodeWithSignature("stopStream(uint256)", proposalId)
        );
        // Best effort - don't revert on failure
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Check if proposal currently meets threshold
     * @param proposalId Proposal ID
     * @return bool True if conviction >= threshold
     */
    function meetsThreshold(uint256 proposalId) external view returns (bool) {
        Proposal storage p = proposals[proposalId];
        
        if (p.proposalStatus != ProposalStatus.Active) {
            return false;
        }
        
        uint256 threshold = _calculateProposalThreshold(proposalId);
        
        // Calculate current conviction (including time since last update)
        uint256 currentConviction = ConvictionsUtils.calculateConviction(
            block.number - p.blockLast,
            p.convictionLast,
            p.stakedAmount,
            cvParams.decay
        );
        
        return currentConviction >= threshold;
    }

    /**
     * @notice Get threshold status for all active funding proposals
     * @return proposalIds Array of proposal IDs
     * @return convictions Current conviction values
     * @return thresholds Required thresholds
     * @return meets Array of booleans indicating if threshold is met
     */
    function getThresholdStatus()
        external
        view
        returns (
            uint256[] memory proposalIds,
            uint256[] memory convictions,
            uint256[] memory thresholds,
            bool[] memory meets
        )
    {
        uint256 activeCount;
        
        // Count active proposals
        for (uint256 i = 1; i <= proposalCounter; i++) {
            if (proposals[i].proposalStatus == ProposalStatus.Active) {
                activeCount++;
            }
        }
        
        proposalIds = new uint256[](activeCount);
        convictions = new uint256[](activeCount);
        thresholds = new uint256[](activeCount);
        meets = new bool[](activeCount);
        
        uint256 index = 0;
        for (uint256 i = 1; i <= proposalCounter; i++) {
            Proposal storage p = proposals[i];
            if (p.proposalStatus == ProposalStatus.Active) {
                proposalIds[index] = i;
                
                // Current conviction
                convictions[index] = ConvictionsUtils.calculateConviction(
                    block.number - p.blockLast,
                    p.convictionLast,
                    p.stakedAmount,
                    cvParams.decay
                );
                
                // Threshold
                thresholds[index] = _calculateProposalThreshold(i);
                
                // Meets threshold
                meets[index] = convictions[index] >= thresholds[index];
                
                index++;
            }
        }
    }
}

