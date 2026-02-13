// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import {ProxyOwnableUpgrader} from "./ProxyOwnableUpgrader.sol";
import {ISybilScorer, Strategy} from "./ISybilScorer.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {CVStrategy} from "./CVStrategy/CVStrategy.sol";

/// @custom:oz-upgrades-from PassportScorer
contract PassportScorer is ISybilScorer, ProxyOwnableUpgrader {
    address public listManager;

    mapping(address => uint256) public userScores;
    mapping(address => Strategy) public strategies;

    event UserScoreAdded(address indexed user, uint256 score);
    event UserRemoved(address indexed user);
    event ListManagerChanged(address indexed oldManager, address indexed newManager);
    event StrategyAdded(address indexed strategy, uint256 threshold, bool active, address councilSafe);
    event StrategyRemoved(address indexed strategy);
    event StrategyActivated(address indexed strategy);
    event ThresholdModified(address indexed strategy, uint256 newThreshold);

    error OnlyAuthorized();
    error OnlyAuthorizedOrUser();
    error OnlyCouncilOrAuthorized();
    error OnlyCouncil();
    error ZeroAddress();
    error StrategyAlreadyExists();

    modifier onlyAuthorized() {
        if (msg.sender == owner() || msg.sender == listManager) {
            _;
        } else {
            revert OnlyAuthorized();
        }
    }

    modifier onlyCouncilOrAuthorized(address _strategy) {
        address registryCommunity = address(CVStrategy(payable(_strategy)).registryCommunity());
        if (
            msg.sender == owner() || msg.sender == _strategy || msg.sender == registryCommunity
                || msg.sender == listManager || msg.sender == strategies[_strategy].councilSafe
        ) {
            _;
        } else {
            revert OnlyCouncilOrAuthorized();
        }
    }

    modifier onlyCouncil(address _strategy) {
        if (msg.sender == strategies[_strategy].councilSafe) {
            _;
        } else {
            revert OnlyCouncil();
        }
    }

    function _revertZeroAddress(address _address) private pure {
        if (_address == address(0)) {
            revert ZeroAddress();
        }
    }

    // slither-disable-next-line unprotected-upgrade
    function initialize(address _listManager, address _owner) public initializer {
        super.initialize(_owner);
        _revertZeroAddress(_listManager);
        listManager = _listManager;
    }

    /// @notice Add a userScore to the list
    /// @param _user address of the user to add
    /// @param _score score to assign to the user
    function addUserScore(address _user, uint256 _score) external onlyAuthorized {
        _revertZeroAddress(_user);
        userScores[_user] = _score;
        emit UserScoreAdded(_user, _score);
    }

    /// @notice Remove a user from the list
    /// @param _user address of the user to remove
    function removeUser(address _user) external onlyAuthorized {
        _revertZeroAddress(_user);
        delete userScores[_user];
        emit UserRemoved(_user);
    }

    /// @notice Change the list manager address
    /// @param _newManager address of the new list manager
    function changeListManager(address _newManager) external onlyOwner {
        _revertZeroAddress(_newManager);
        address oldManager = listManager;
        listManager = _newManager;
        emit ListManagerChanged(oldManager, _newManager);
    }

    /// @notice Add a strategy to the contract
    /// @param _threshold is expressed on a scale of 10**4
    /// @param _councilSafe address of the council safe
    function addStrategy(address _strategy, uint256 _threshold, address _councilSafe)
        external
        override
        onlyCouncilOrAuthorized(_strategy)
    {
        _revertZeroAddress(_strategy);
        _revertZeroAddress(_councilSafe);
        if (strategies[_strategy].threshold != 0 || strategies[_strategy].councilSafe != address(0)) {
            revert StrategyAlreadyExists();
        }
        strategies[_strategy] = Strategy({threshold: _threshold, active: false, councilSafe: _councilSafe});
        emit StrategyAdded(_strategy, _threshold, false, _councilSafe);
    }

    /// @notice Remove a strategy from the contract
    /// @param _strategy address of the strategy to remove
    function removeStrategy(address _strategy) external onlyCouncilOrAuthorized(_strategy) {
        _revertZeroAddress(_strategy);
        delete strategies[_strategy];
        emit StrategyRemoved(_strategy);
    }

    /// @notice Activate a strategy
    /// @param _strategy address of the strategy to activate
    function activateStrategy(address _strategy) external onlyCouncilOrAuthorized(_strategy) {
        _revertZeroAddress(_strategy);
        strategies[_strategy].active = true;
        emit StrategyActivated(_strategy);
    }

    /// @notice Modify the threshold of a strategy
    /// @param _strategy address of the strategy to modify
    /// @param _newThreshold new threshold to set expressed on a scale of 10**4
    function modifyThreshold(address _strategy, uint256 _newThreshold) external onlyCouncilOrAuthorized(_strategy) {
        _revertZeroAddress(_strategy);
        strategies[_strategy].threshold = _newThreshold;
        emit ThresholdModified(_strategy, _newThreshold);
    }

    /// @notice Check if an action can be executed
    /// @param _user address of the user to check
    /// @param _strategy address of the strategy to check
    function canExecuteAction(address _user, address _strategy) external view override returns (bool) {
        uint256 userScore = userScores[_user];
        Strategy memory strategy = strategies[_strategy];

        if (!strategy.active) {
            return true;
        }

        return userScore >= strategy.threshold;
    }

    uint256[50] private __gap;
}
