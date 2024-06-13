// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ISybilScorer.sol";

contract PassportScorer is ISybilScorer {
    address public councilSafe;
    address public listManager;
    uint256 public threshold;
    mapping(address => uint256) private userScores;

    error OnlyCouncilSafe();
    error OnlyAuthorized();
    error InvalidAddress();
    error ZeroAddress();

    modifier onlyCouncilSafe() {
        if (msg.sender != councilSafe) {
            revert OnlyCouncilSafe();
        }
        _;
    }

    modifier onlyAuthorized() {
        if (msg.sender != councilSafe && msg.sender != listManager) {
            revert OnlyAuthorized();
        }
        _;
    }

    constructor(address _councilSafe, address _listManager) {
        if (_councilSafe == address(0) || _listManager == address(0)) {
            revert ZeroAddress();
        }

        councilSafe = _councilSafe;
        listManager = _listManager;
    }

    function addUserScore(address _user, uint256 _score) external override onlyAuthorized {
        if (_user == address(0)) {
            revert InvalidAddress();
        }
        userScores[_user] = _score;
    }

    function removeUser(address _user) external override onlyAuthorized {
        if (_user == address(0)) {
            revert InvalidAddress();
        }
        delete userScores[_user];
    }

    function changeListManager(address _newManager) external override onlyCouncilSafe {
        if (_newManager == address(0)) {
            revert InvalidAddress();
        }
        listManager = _newManager;
    }

    function setThreshold(uint256 _newThreshold) external override onlyCouncilSafe {
        threshold = _newThreshold;
    }

    function canExecuteAction(address _user) external view override returns (bool) {
        return userScores[_user] >= threshold;
    }

    function getUserScore(address _user) external view returns (uint256) {
        return userScores[_user];
    }
}
