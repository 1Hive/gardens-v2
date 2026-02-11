// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @title CVRegistryAllowlistStorage
/// @notice Namespaced storage for voting power registry allowlist
/// @dev Uses EIP-7201 style storage slot to avoid collisions with CVStrategyBaseFacet layout.
///      Council safe controls which IVotingPowerRegistry implementations are allowed.
library CVRegistryAllowlistStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("cvstrategy.storage.registryallowlist.v1");

    struct Layout {
        /// @notice Approved voting power registries that can be used in pool config
        mapping(address => bool) allowedRegistries;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
