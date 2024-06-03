// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ISybilScorer {
    function addUserScore(address _user, uint256 _score) external;
    function removeUser(address _user) external;
    function changeListManager(address _newManager) external;
    function setThreshold(uint256 _newThreshold) external;
    function canExecuteAction(address _user) external view returns (bool);
}
