// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @notice Minimal surface of `RegistryCommunity` needed to resolve the
/// latest council Safe for a community, on whichever chain that community's
/// `RegistryCommunity` is deployed. Matches the public `councilSafe`
/// state-variable getter declared in `CommunityBaseFacet`.
interface IRegistryCommunitySafe {
    function councilSafe() external view returns (address);
}
