// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @title CVRegistryWhitelistStorage
/// @notice Namespaced storage for voting power registry whitelist
/// @dev Uses EIP-7201 style storage slot to avoid collisions with CVStrategyBaseFacet layout.
///      Council safe controls which IVotingPowerRegistry implementations are allowed.
library CVRegistryWhitelistStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("cvstrategy.storage.registrywhitelist.v1");

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
