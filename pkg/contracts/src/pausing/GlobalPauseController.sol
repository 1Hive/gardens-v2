// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";

contract GlobalPauseController is ProxyOwnableUpgrader {
    error NotAuthorized(address caller, address target);
    error InvalidDuration(uint256 duration);

    event ContractPaused(address indexed target, uint64 until, address indexed account);
    event ContractUnpaused(address indexed target, address indexed account);
    event SelectorPaused(address indexed target, bytes4 indexed selector, uint64 until, address indexed account);
    event SelectorUnpaused(address indexed target, bytes4 indexed selector, address indexed account);

    mapping(address => uint64) private pausedUntilByTarget;
    mapping(address => mapping(bytes4 => uint64)) private pausedSelectorUntilByTarget;
    uint256[47] private __gap;

    function initialize(address initialOwner) public override initializer {
        ProxyOwnableUpgrader.initialize(initialOwner);
    }

    function pause(address target, uint256 duration) external onlyAuthorized(target) {
        uint64 until = _computeUntil(duration);
        pausedUntilByTarget[target] = until;
        emit ContractPaused(target, until, msg.sender);
    }

    function unpause(address target) external onlyAuthorized(target) {
        delete pausedUntilByTarget[target];
        emit ContractUnpaused(target, msg.sender);
    }

    function pauseSelector(address target, bytes4 selector, uint256 duration) external onlyAuthorized(target) {
        uint64 until = _computeUntil(duration);
        pausedSelectorUntilByTarget[target][selector] = until;
        emit SelectorPaused(target, selector, until, msg.sender);
    }

    function unpauseSelector(address target, bytes4 selector) external onlyAuthorized(target) {
        delete pausedSelectorUntilByTarget[target][selector];
        emit SelectorUnpaused(target, selector, msg.sender);
    }

    function isPaused(address target) public view returns (bool) {
        return _isActive(pausedUntilByTarget[target]);
    }

    function isPaused(address target, bytes4 selector) public view returns (bool) {
        if (_isActive(pausedUntilByTarget[target])) {
            return true;
        }
        return _isActive(pausedSelectorUntilByTarget[target][selector]);
    }

    function pausedUntil(address target) external view returns (uint256) {
        return pausedUntilByTarget[target];
    }

    function pausedSelectorUntil(address target, bytes4 selector) external view returns (uint256) {
        return pausedSelectorUntilByTarget[target][selector];
    }

    function _computeUntil(uint256 duration) internal view returns (uint64) {
        if (duration == 0) {
            revert InvalidDuration(duration);
        }
        uint64 nowTs = uint64(block.timestamp);
        if (duration > type(uint64).max - nowTs) {
            revert InvalidDuration(duration);
        }
        return nowTs + uint64(duration);
    }

    function _isActive(uint64 until) internal view returns (bool) {
        return until != 0 && until > block.timestamp;
    }

    modifier onlyAuthorized(address target) {
        if (msg.sender != target && msg.sender != owner()) {
            revert NotAuthorized(msg.sender, target);
        }
        _;
    }

}
