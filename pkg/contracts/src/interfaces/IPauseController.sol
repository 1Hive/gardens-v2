// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

interface IPauseController {
    function pause(address target, uint256 duration) external;
    function unpause(address target) external;
    function pauseSelector(address target, bytes4 selector, uint256 duration) external;
    function unpauseSelector(address target, bytes4 selector) external;

    function isPaused(address target) external view returns (bool);
    function isPaused(address target, bytes4 selector) external view returns (bool);
    function pausedUntil(address target) external view returns (uint256);
    function pausedSelectorUntil(address target, bytes4 selector) external view returns (uint256);
}
