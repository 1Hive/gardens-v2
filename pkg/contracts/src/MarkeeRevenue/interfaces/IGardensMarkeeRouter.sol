// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @notice Shared seam between the opt-in flow and the community-split
/// bridge. Streaming leaderboards are created with the returned vault as
/// `beneficiaryAddress`.
interface IGardensMarkeeRouter {
    /// @notice Deploys the deterministic vault for `(communityChainId, registryCommunity)`
    /// if it does not already exist, and returns it either way. Idempotent.
    function ensureCommunityVault(uint256 communityChainId, address registryCommunity) external returns (address vault);

    function communityVault(bytes32 communityKey) external view returns (address vault);
}
