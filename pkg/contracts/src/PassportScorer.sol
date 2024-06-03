// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ISybilScorer.sol";

contract SybilScorer is ISybilScorer {
    address public councilSafe;
    address public listManager;
    uint256 public threshold;
    mapping(address => uint256) private userScores;

    modifier onlyCouncilSafe() {
        require(msg.sender == councilSafe, "Only councilSafe can call this function");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == councilSafe || msg.sender == listManager, "Only councilSafe or listManager can call this function");
        _;
    }

    constructor(address _councilSafe, address _listManager) {
        require(_councilSafe != address(0), "councilSafe address cannot be zero");
        require(_listManager != address(0), "listManager address cannot be zero");

        councilSafe = _councilSafe;
        listManager = _listManager;
    }

    function addUserScore(address _user, uint256 _score) external override onlyAuthorized {
        require(_user != address(0), "User address cannot be zero");
        userScores[_user] = _score;
    }

    function removeUser(address _user) external override onlyAuthorized {
        require(_user != address(0), "User address cannot be zero");
        delete userScores[_user];
    }

    function changeListManager(address _newManager) external override onlyCouncilSafe {
        require(_newManager != address(0), "New manager address cannot be zero");
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
