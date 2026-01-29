// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {IArbitrator} from "../../interfaces/IArbitrator.sol";
import {Proposal, ProposalStatus, ArbitrableConfig} from "../ICVStrategy.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

library CVStreamingStorage {
    // Unique slot for CVStreamingFacet storage to avoid collisions with CVStrategyBaseFacet layout.
    bytes32 internal constant STORAGE_SLOT = keccak256("cvstrategy.storage.streaming.v1");

    struct Layout {
        uint256 lastRebalanceAt;
        uint256 rebalanceCooldown;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}

abstract contract CVStreamingBase {
    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error RebalanceCooldownActive(uint256 secondsRemaining); // 0x9f3df5e1

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event StreamMemberUnitUpdated(address indexed member, int96 newUnit);
    event StreamStarted(address indexed gda, uint256 flowRate);

    function lastRebalanceAt() internal view returns (uint256) {
        return CVStreamingStorage.layout().lastRebalanceAt;
    }

    function setLastRebalanceAt(uint256 _timestamp) internal {
        CVStreamingStorage.layout().lastRebalanceAt = _timestamp;
    }

    function rebalanceCooldown() public view returns (uint256) {
        return CVStreamingStorage.layout().rebalanceCooldown;
    }

    function setRebalanceCooldown(uint256 _cooldown) external onlyOwner {
        CVStreamingStorage.layout().rebalanceCooldown = _cooldown;
    }
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
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    /**
     * @notice Rebalance the outgoing streams based on current active proposals and their conviction levels
     * @dev This function should be called periodically to ensure that the outgoing streams reflect the current
     *      state of active proposals and their conviction levels. (rate limiting to be implemented in future)
     */
    function rebalance() external {
        // Rate limiting
        if (rebalanceCooldown() != 0 && block.timestamp < lastRebalanceAt() + rebalanceCooldown()) {
            revert RebalanceCooldownActive(lastRebalanceAt() + rebalanceCooldown() - block.timestamp);
        }
        setLastRebalanceAt(block.timestamp);

        // Check if funds that needs to be wrapped


        boolean shouldStartStream = // If stoped and funds available;
        if (shouldStartStream) {
            // TODO: Start the stream
            emit StreamStarted(address(superToken), 0);
        }

        // Rebalancing logic

    }
}
