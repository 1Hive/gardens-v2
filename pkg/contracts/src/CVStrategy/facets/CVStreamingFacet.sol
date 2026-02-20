// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {IArbitrator} from "../../interfaces/IArbitrator.sol";
import {Proposal, ProposalStatus, ArbitrableConfig} from "../ICVStrategy.sol";
import {CVStreamingStorage, CVStreamingBase} from "../CVStreamingStorage.sol";
import {ConvictionsUtils} from "../ConvictionsUtils.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStreamingEscrowSync {
    function syncOutflow() external;
    function depositAmount() external view returns (uint256);
}

/**
 * @title CVStreamingFacet
 * @notice Facet containing streaming-related functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategy
 *      CRITICAL: Inherits storage layout from CVStrategyBaseFacet
 */
contract CVStreamingFacet is CVStrategyBaseFacet, CVStreamingBase {
    using SuperTokenV1Library for ISuperToken;

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error StreamingRateOverflow(uint256 streamingRatePerSecond);
    error SuperTokenTransferFailed(address to, uint256 amount);

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    /**
     * @notice Rebalance the outgoing streams based on current active proposals and their conviction levels
     * @dev This function should be called periodically to ensure that the outgoing streams reflect the current
     *      state of active proposals and their conviction levels. (rate limiting to be implemented in future)
     * Sig: 0x7d7c2a1c
     */
    function rebalance() external {
        // Rate limiting
        if (rebalanceCooldown() != 0 && block.timestamp < lastRebalanceAt() + rebalanceCooldown()) {
            revert RebalanceCooldownActive(lastRebalanceAt() + rebalanceCooldown() - block.timestamp);
        }
        setLastRebalanceAt(block.timestamp);

        wrapIfNeeded();

        uint256 poolAmount = getPoolAmount();
        uint256 totalEligibleConviction = 0;

        // Rebalancing logic: Update units for each active streaming proposal
        // Loop through all proposals and update their GDA units based on conviction
        for (uint256 i = 1; i <= proposalCounter; i++) {
            Proposal storage proposal = proposals[i];

            // Get the escrow address for this proposal
            address escrow = streamingEscrow(i);
            if (escrow == address(0)) {
                continue; // Skip if no escrow (shouldn't happen for streaming proposals)
            }

            // Ensure non-active proposals never keep receiving pool share.
            if (proposal.proposalStatus != ProposalStatus.Active && proposal.proposalStatus != ProposalStatus.Disputed)
            {
                superfluidGDA.updateMemberUnits(escrow, 0);
                emit StreamMemberUnitUpdated(escrow, 0);
                continue;
            }

            // Calculate current conviction for the proposal
            uint256 convictionValue = calculateProposalConviction(i);

            uint128 units = 0;
            if (_isProposalAboveThreshold(proposal, convictionValue, poolAmount)) {
                totalEligibleConviction += convictionValue;

                // Scale down conviction to fit uint128 by dividing by D (10^7)
                // This maintains proportional relationships between proposals while reducing precision
                uint256 scaledConviction = convictionValue / ConvictionsUtils.D;

                // Cast to uint128 for Superfluid GDA (with overflow protection)
                units = scaledConviction > type(uint128).max ? type(uint128).max : uint128(scaledConviction);
            }

            // Update the member units in the GDA pool
            // This determines the proportional share of the total streaming flow
            superfluidGDA.updateMemberUnits(escrow, units);

            emit StreamMemberUnitUpdated(escrow, int96(int128(units)));
        }

        // Start/update/stop stream based on pool conviction share.
        uint256 maxConviction = ConvictionsUtils.getMaxConviction(totalPointsActivated, cvParams.decay);
        bool shouldStartStream = _shouldStartStream(totalEligibleConviction, maxConviction);
        uint256 requestedFlowRate = 0;
        if (shouldStartStream) {
            uint256 clampedConviction =
                totalEligibleConviction > maxConviction ? maxConviction : totalEligibleConviction;
            requestedFlowRate = (streamingRatePerSecond * clampedConviction) / maxConviction;
        }

        int96 currentFlowRate = superfluidToken.getGDAFlowRate(address(this), superfluidGDA);
        int96 actualFlowRate = superfluidToken.distributeFlow(superfluidGDA, _toInt96StreamingRate(requestedFlowRate));
        if (currentFlowRate != actualFlowRate) {
            emit StreamRateUpdated(address(superfluidGDA), actualFlowRate > 0 ? uint256(uint96(actualFlowRate)) : 0);
        }

        // Keep escrow deposits and outflows in sync with the latest GDA member flow rates.
        for (uint256 i = 1; i <= proposalCounter; i++) {
            address escrow = streamingEscrow(i);
            if (escrow == address(0)) {
                continue;
            }

            _topUpEscrowDepositIfNeeded(escrow);
            try IStreamingEscrowSync(escrow).syncOutflow() {} catch {}
        }
    }

    /**
     * @notice Calculate the current conviction for a proposal
     * @param _proposalId The proposal ID
     * @return uint256 The calculated conviction value
     */
    function calculateProposalConviction(uint256 _proposalId) public view returns (uint256) {
        Proposal storage proposal = proposals[_proposalId];
        return ConvictionsUtils.calculateConviction(
            block.number - proposal.blockLast, proposal.convictionLast, proposal.stakedAmount, cvParams.decay
        );
    }

    /**
     * @notice Wrap unwrapped pool tokens into supertokens if needed
     * @dev Checks the balance of the underlying pool token and wraps it to supertoken
     */
    function wrapIfNeeded() public virtual {
        if (address(superfluidToken) == address(0)) {
            return;
        }

        // Get the underlying pool token address
        address poolToken = allo.getPool(poolId).token;
        if (poolToken == NATIVE_TOKEN) {
            return; // Cannot wrap native token directly
        }

        // Get underlying token from supertoken
        address underlyingToken = superfluidToken.getUnderlyingToken();
        if (underlyingToken != poolToken) {
            return; // Mismatch between pool token and supertoken underlying
        }

        // Check balance of unwrapped tokens
        uint256 unwrappedBalance = IERC20(poolToken).balanceOf(address(this));
        if (unwrappedBalance == 0) {
            return;
        }

        // Approve supertoken to spend the underlying tokens
        IERC20(poolToken).approve(address(superfluidToken), unwrappedBalance);

        // Wrap tokens to supertokens
        superfluidToken.upgrade(unwrappedBalance);
    }

    /**
     * @notice Check if streaming should start based on supertoken balance
     * @dev Returns true if there are supertokens available to stream
     * @return bool True if streaming should start
     */
    function _shouldStartStream(uint256 totalEligibleConviction, uint256 maxConviction)
        internal
        view
        virtual
        returns (bool)
    {
        if (address(superfluidToken) == address(0)) {
            return false;
        }

        // Check if there's a supertoken balance available for streaming
        uint256 superTokenBalance = superfluidToken.balanceOf(address(this));
        if (superTokenBalance == 0) {
            return false;
        }

        if (streamingRatePerSecond == 0 || maxConviction == 0 || totalEligibleConviction == 0) {
            return false;
        }

        return true;
    }

    function _isProposalAboveThreshold(Proposal storage proposal, uint256 convictionValue, uint256 poolAmount)
        internal
        view
        returns (bool)
    {
        if (poolAmount == 0) {
            return false;
        }

        // Mirror funding guard to avoid threshold underflow/division issues.
        if (proposal.requestedAmount * ConvictionsUtils.D >= cvParams.maxRatio * poolAmount) {
            return false;
        }

        uint256 threshold = ConvictionsUtils.calculateThreshold(
            proposal.requestedAmount,
            poolAmount,
            totalPointsActivated,
            cvParams.decay,
            cvParams.weight,
            cvParams.maxRatio,
            cvParams.minThresholdPoints
        );

        return convictionValue > threshold;
    }

    function _toInt96StreamingRate(uint256 flowRate) internal pure returns (int96) {
        if (flowRate > uint256(uint96(type(int96).max))) {
            revert StreamingRateOverflow(flowRate);
        }
        return int96(uint96(flowRate));
    }

    function _topUpEscrowDepositIfNeeded(address escrow) internal {
        uint256 requiredDeposit;
        try IStreamingEscrowSync(escrow).depositAmount() returns (uint256 amount) {
            requiredDeposit = amount;
        } catch {
            return;
        }

        if (requiredDeposit == 0) {
            return;
        }

        uint256 escrowBalance = superfluidToken.balanceOf(escrow);
        if (escrowBalance >= requiredDeposit) {
            return;
        }

        uint256 missingDeposit = requiredDeposit - escrowBalance;
        uint256 strategyBalance = superfluidToken.balanceOf(address(this));
        if (strategyBalance == 0) {
            return;
        }

        uint256 topUp = missingDeposit > strategyBalance ? strategyBalance : missingDeposit;
        if (topUp != 0) {
            if (!superfluidToken.transfer(escrow, topUp)) {
                revert SuperTokenTransferFailed(escrow, topUp);
            }
        }
    }
}
