// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ISybilScorer, PassportData} from "./ISybilScorer.sol";

contract PassportScorer is Ownable, ISybilScorer {
    address public listManager;

    struct Strategy {
        uint256 threshold;
        bool active;
    }

    mapping(address => PassportData) public userScores;
    mapping(address => Strategy) public strategies;

    event UserScoreAdded(address indexed user, uint256 score, uint256 lastUpdated);
    event UserRemoved(address indexed user);
    event ListManagerChanged(address indexed oldManager, address indexed newManager);
    event StrategyAdded(address indexed strategy, uint256 threshold, bool active);
    event StrategyRemoved(address indexed strategy);
    event ThresholdModified(address indexed strategy, uint256 newThreshold);

    error OnlyAuthorized();
    error ZeroAddress();

    modifier onlyAuthorized() {
        if (msg.sender == owner() || msg.sender == listManager) {
            _;
        } else {
            revert OnlyAuthorized();
        }
    }

    function _revertZeroAddress(address _address) private pure {
        if (_address == address(0)) {
            revert ZeroAddress();
        }
    }

    constructor(address _listManager) Ownable() {
        _revertZeroAddress(_listManager);
        listManager = _listManager;
    }

    function addUserScore(address _user, PassportData memory _passportData) external override onlyAuthorized {
        _revertZeroAddress(_user);
        userScores[_user] = _passportData;
        emit UserScoreAdded(_user, _passportData.score, _passportData.lastUpdated);
    }

    function removeUser(address _user) external override onlyAuthorized {
        _revertZeroAddress(_user);
        delete userScores[_user];
        emit UserRemoved(_user);
    }

    function changeListManager(address _newManager) external override onlyOwner {
        _revertZeroAddress(_newManager);
        address oldManager = listManager;
        listManager = _newManager;
        emit ListManagerChanged(oldManager, _newManager);
    }

    function addStrategy(address _strategy, uint256 _threshold) external override onlyAuthorized {
        _revertZeroAddress(_strategy);
        strategies[_strategy] = Strategy({threshold: _threshold, active: true});
        emit StrategyAdded(_strategy, _threshold, true);
    }

    function removeStrategy(address _strategy) external override onlyAuthorized {
        _revertZeroAddress(_strategy);
        strategies[_strategy].active = false;
        strategies[_strategy].threshold = 0;
        emit StrategyRemoved(_strategy);
    }

    function modifyThreshold(address _strategy, uint256 _newThreshold) external onlyAuthorized {
        _revertZeroAddress(_strategy);
        strategies[_strategy].threshold = _newThreshold;
        emit ThresholdModified(_strategy, _newThreshold);
    }

    function canExecuteAction(address _user, address _strategy) external view override returns (bool) {
        PassportData memory userScore = userScores[_user];
        Strategy memory strategy = strategies[_strategy];

        if (!strategy.active) {
            return true;
        }

        return userScore.score >= strategy.threshold;
    }

    function getUserScore(address _user) external view returns (PassportData memory) {
        return userScores[_user];
    }
}
