// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @notice Shared community-key derivation so the router, vaults, and the
/// off-chain opt-in/claim signing flow always agree on the same identity.
library CommunityKeyLib {
    function communityKey(uint256 communityChainId, address registryCommunity) internal pure returns (bytes32) {
        return keccak256(abi.encode(communityChainId, registryCommunity));
    }
}
