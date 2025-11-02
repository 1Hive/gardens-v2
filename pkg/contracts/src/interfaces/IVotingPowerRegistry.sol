// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISafe} from "./ISafe.sol";

/**
 * @title IVotingPowerRegistry
 * @notice Minimal interface exposing the Registry functionality required by CVStrategy facets.
 * @dev Implemented by RegistryCommunity diamond; mirrors the functions CVStrategy depends on for
 *      membership checks, allowlist management, voting power accounting, and council governance ties.
 */
interface IVotingPowerRegistry {
    /*|--------------------------------------------|*/
    /*|              MEMBERSHIP                   |*/
    /*|--------------------------------------------|*/

    function isMember(address _member) external view returns (bool);

    function onlyStrategyEnabled(address _strategy) external view;

    /*|--------------------------------------------|*/
    /*|              ACCESS CONTROL               |*/
    /*|--------------------------------------------|*/

    function hasRole(bytes32 role, address account) external view returns (bool);

    function grantRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function councilSafe() external view returns (ISafe);

    /*|--------------------------------------------|*/
    /*|           STRATEGY POWER LIFECYCLE         |*/
    /*|--------------------------------------------|*/

    function activateMemberInStrategy(address _member, address _strategy) external;

    function deactivateMemberInStrategy(address _member, address _strategy) external;

    function memberActivatedInStrategies(address _member, address _strategy) external view returns (bool);

    function getMemberPowerInStrategy(address _member, address _strategy) external view returns (uint256);

    function getMemberStakedAmount(address _member) external view returns (uint256);

    function getBasisStakedAmount() external view returns (uint256);

    /*|--------------------------------------------|*/
    /*|              ECONOMIC CONTEXT             |*/
    /*|--------------------------------------------|*/

    function governanceToken() external view returns (IERC20);
}
