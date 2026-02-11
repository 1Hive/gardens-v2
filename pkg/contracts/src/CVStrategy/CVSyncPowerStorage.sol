// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @title CVSyncPowerStorage
/// @notice Namespaced storage for CVSyncPowerFacet
/// @dev Uses EIP-7201 style storage slot to avoid collisions with CVStrategyBaseFacet layout.
library CVSyncPowerStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("cvstrategy.storage.syncpower.v1");

    struct Layout {
        /// @notice Addresses authorized to call syncPower (e.g., Hats modules)
        mapping(address => bool) authorizedSyncCallers;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
