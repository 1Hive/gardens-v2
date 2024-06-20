// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

struct PassportData {
    uint256 score;
    uint256 lastUpdated;
}

interface ISybilScorer {
    function addUserScore(address _user, PassportData memory _passportData) external;
    function removeUser(address _user) external;
    function changeListManager(address _newManager) external;
}
