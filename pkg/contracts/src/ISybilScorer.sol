// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

struct PassportData {
    uint256 score;
    uint256 lastUpdated;
}

struct Strategy {
    uint256 threshold;
    bool active;
    address councilSafe;
}

interface ISybilScorer {
    function initialize(address _listManager) external;
    function addUserScore(address _user, PassportData memory _passportData) external;
    function removeUser(address _user) external;
    function changeListManager(address _newManager) external;
    function canExecuteAction(address _user, address _strategy) external view returns (bool);
    function modifyThreshold(address _strategy, uint256 _newThreshold) external;
    function addStrategy(address _strategy, uint256 _threshold, address _councilSafe) external;
    function removeStrategy(address _strategy) external;
    function activateStrategy(address _strategy) external;
    function getUserScore(address _user) external view returns (PassportData memory);
    function getStrategy(address _strategy) external view returns (Strategy memory);
}