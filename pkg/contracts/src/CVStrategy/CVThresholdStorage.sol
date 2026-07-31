// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @title CVThresholdStorage
/// @notice Pool-level threshold checkpoint shared by CVStrategy and its facets.
/// @dev Namespaced storage avoids changing the upgradeable CVStrategy layout.
library CVThresholdStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("cvstrategy.storage.threshold.v1");

    struct Layout {
        uint256 thresholdSnapshot;
        uint256 thresholdUpdatedAtBlock;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
