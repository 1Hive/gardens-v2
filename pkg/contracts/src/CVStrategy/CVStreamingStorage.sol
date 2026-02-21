// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

library CVStreamingStorage {
    // Unique slot for CVStreamingFacet storage to avoid collisions with CVStrategyBaseFacet layout.
    bytes32 internal constant STORAGE_SLOT = keccak256("cvstrategy.storage.streaming.v1");

    struct Layout {
        uint256 lastRebalanceAt;
        uint256 rebalanceCooldown;
        // Reserved to preserve storage layout compatibility with previous versions.
        bool __deprecated_disabledConvictionSnapshotTaken;
        mapping(uint256 => address) proposalEscrow;
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
    event StreamRateUpdated(address indexed gda, uint256 flowRate);

    function lastRebalanceAt() internal view returns (uint256) {
        return CVStreamingStorage.layout().lastRebalanceAt;
    }

    function setLastRebalanceAt(uint256 _timestamp) internal {
        CVStreamingStorage.layout().lastRebalanceAt = _timestamp;
    }

    function rebalanceCooldown() internal view returns (uint256) {
        return CVStreamingStorage.layout().rebalanceCooldown;
    }

    function setRebalanceCooldown(uint256 _cooldown) internal {
        CVStreamingStorage.layout().rebalanceCooldown = _cooldown;
    }

    function streamingEscrow(uint256 proposalId) internal view returns (address) {
        return CVStreamingStorage.layout().proposalEscrow[proposalId];
    }

    function setStreamingEscrow(uint256 proposalId, address escrow) internal {
        CVStreamingStorage.layout().proposalEscrow[proposalId] = escrow;
    }
}
