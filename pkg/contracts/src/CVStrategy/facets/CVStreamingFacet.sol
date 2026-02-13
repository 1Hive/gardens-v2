// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {IArbitrator} from "../../interfaces/IArbitrator.sol";
import {Proposal, ProposalStatus, ArbitrableConfig} from "../ICVStrategy.sol";
import {CVStreamingStorage, CVStreamingBase} from "../CVStreamingStorage.sol";
import {ConvictionsUtils} from "../ConvictionsUtils.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CVStreamingFacet
 * @notice Facet containing streaming-related functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategy
 *      CRITICAL: Inherits storage layout from CVStrategyBaseFacet
 */
contract CVStreamingFacet is CVStrategyBaseFacet, CVStreamingBase {
    using SuperTokenV1Library for ISuperToken;

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

        // Check if funds that needs to be wrapped
        bool shouldStartStream = _shouldStartStream();
        if (shouldStartStream) {
            // TODO: Start the stream
            emit StreamStarted(address(superfluidToken), 0);
        }

        // Rebalancing logic: Update units for each active streaming proposal
        // Loop through all proposals and update their GDA units based on conviction
        for (uint256 i = 1; i <= proposalCounter; i++) {
            Proposal storage proposal = proposals[i];

            // Only process active streaming proposals
            if (proposal.proposalStatus != ProposalStatus.Active) {
                continue;
            }

            // Get the escrow address for this proposal
            address escrow = streamingEscrow(i);
            if (escrow == address(0)) {
                continue; // Skip if no escrow (shouldn't happen for streaming proposals)
            }

            // Calculate current conviction for the proposal
            uint256 convictionValue = calculateProposalConviction(i);

            // Scale down conviction to fit uint128 by dividing by D (10^7)
            // This maintains proportional relationships between proposals while reducing precision
            uint256 scaledConviction = convictionValue / ConvictionsUtils.D;

            // Cast to uint128 for Superfluid GDA (with overflow protection)
            uint128 units = scaledConviction > type(uint128).max ? type(uint128).max : uint128(scaledConviction);

            // Update the member units in the GDA pool
            // This determines the proportional share of the total streaming flow
            superfluidGDA.updateMemberUnits(escrow, units);

            emit StreamMemberUnitUpdated(escrow, int96(int128(units)));
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
    function _shouldStartStream() internal view virtual returns (bool) {
        if (address(superfluidToken) == address(0)) {
            return false;
        }
        // Check if there's a supertoken balance available for streaming
        uint256 superTokenBalance = superfluidToken.balanceOf(address(this));
        return superTokenBalance > 0;
    }
}
