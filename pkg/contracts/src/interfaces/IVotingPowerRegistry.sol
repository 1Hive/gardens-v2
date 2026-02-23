// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/**
 * @title IVotingPowerRegistry
 * @notice Minimal interface exposing the Power functionality required by CVStrategy facets.
 * @dev Implemented by RegistryCommunity diamond; mirrors the functions CVStrategy depends on for
 *      membership checks, allowlist management, voting power accounting, and council governance ties.
 */
interface IVotingPowerRegistry {
    function getMemberPowerInStrategy(address _member, address _strategy) external view returns (uint256);
    function getMemberStakedAmount(address _member) external view returns (uint256);
    function ercAddress() external view returns (address);
    function isMember(address _member) external view returns (bool);
}
