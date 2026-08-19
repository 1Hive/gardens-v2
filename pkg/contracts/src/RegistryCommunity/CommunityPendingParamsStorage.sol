// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @notice Guarded community parameters awaiting ProxyOwner-resolved owner approval.
struct PendingCommunityParams {
    uint8 fields;
    uint256 registerStakeAmount;
    bool isKickEnabled;
    string covenantIpfsHash;
}

/// @notice Namespaced storage for pending community parameter changes.
/// @dev Keeps the RegistryCommunity and CommunityBaseFacet storage layouts unchanged.
library CommunityPendingParamsStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("gardens.storage.registry-community.pending-params");

    struct Layout {
        PendingCommunityParams pending;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
