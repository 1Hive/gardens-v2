// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./ISybilScorer.sol";

contract PassportScorer is ISybilScorer {
    address public councilSafe;
    address public listManager;
    uint256 public threshold;

    mapping(address user => uint256 score) private userScores;

    error OnlyCouncilSafe();
    error OnlyAuthorized();
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

    function _revertZeroAddress(address _address) private pure {
        if (_address == address(0)) {
            revert ZeroAddress();
        }
    }

    constructor(address _councilSafe, address _listManager) {
        _revertZeroAddress(_councilSafe);
        _revertZeroAddress(_listManager);

        councilSafe = _councilSafe;
        listManager = _listManager;
    }

    function addUserScore(address _user, uint256 _score) external override onlyAuthorized {
        _revertZeroAddress(_user);
        userScores[_user] = _score;
    }

    function removeUser(address _user) external override onlyAuthorized {
        _revertZeroAddress(_user);
        delete userScores[_user];
    }

    function changeListManager(address _newManager) external override onlyCouncilSafe {
        _revertZeroAddress(_newManager);
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
