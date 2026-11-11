// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import {ProxyOwnableUpgrader} from "./ProxyOwnableUpgrader.sol";
import {ISybilScorer, Strategy} from "./ISybilScorer.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import {CVStrategy} from "./CVStrategy/CVStrategy.sol";

interface IStrategyRegistryStatus {
    function enabledStrategies(address strategy) external view returns (bool);
}

interface IScorerStrategyCommunity {
    function registryCommunity() external view returns (address);
}

interface IScorerCommunityCouncil {
    function councilSafe() external view returns (address);
}

/// @custom:oz-upgrades-from PassportScorer
contract PassportScorer is ISybilScorer, ProxyOwnableUpgrader {
    address public listManager;

    mapping(address => uint256) public userScores;
    mapping(address => Strategy) public strategies;
    mapping(address => uint256) public userScoreUpdatedAt;
    uint256 public legacyScoreGracePeriodEnd;
    /// @custom:oz-renamed-from __gap
    uint256[48] private __passportScorerGap;

    uint256 public constant SCORE_VALIDITY_PERIOD = 30 days;

    event UserScoreAdded(address indexed user, uint256 score);
    event UserRemoved(address indexed user);
    event ListManagerChanged(address indexed oldManager, address indexed newManager);
    event StrategyAdded(address indexed strategy, uint256 threshold, bool active, address councilSafe);
    event StrategyRemoved(address indexed strategy);
    event StrategyActivated(address indexed strategy);
    event ThresholdModified(address indexed strategy, uint256 newThreshold);
    event ScoreExpirationInitialized(uint256 legacyScoreGracePeriodEnd);

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
        if (
            msg.sender == owner() || msg.sender == _strategy || msg.sender == listManager
                || _isCurrentCouncilOrCommunity(_strategy, msg.sender)
        ) {
            _;
        } else {
            revert OnlyCouncilOrAuthorized();
        }
    }

    modifier onlyCouncil(address _strategy) {
        if (_isCurrentCouncil(_strategy, msg.sender)) {
            _;
        } else {
            revert OnlyCouncil();
        }
    }

    function _isCurrentCouncilOrCommunity(address strategy, address caller) internal view returns (bool) {
        if (strategy.code.length == 0) return false;
        try IScorerStrategyCommunity(strategy).registryCommunity() returns (address community) {
            if (community == address(0) || community.code.length == 0) return false;
            if (caller == community) return true;
            try IScorerCommunityCouncil(community).councilSafe() returns (address currentCouncil) {
                return currentCouncil != address(0) && caller == currentCouncil;
            } catch {
                return false;
            }
        } catch {
            return false;
        }
    }

    function _isCurrentCouncil(address strategy, address caller) internal view returns (bool) {
        if (strategy.code.length == 0) return false;
        try IScorerStrategyCommunity(strategy).registryCommunity() returns (address community) {
            if (community == address(0) || community.code.length == 0) return false;
            try IScorerCommunityCouncil(community).councilSafe() returns (address currentCouncil) {
                return currentCouncil != address(0) && caller == currentCouncil;
            } catch {
                return false;
            }
        } catch {
            return false;
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

    /// @notice Starts a one-time grace period for scores written before timestamps were introduced.
    function initializeScoreExpiration() external reinitializer(2) onlyOwner {
        legacyScoreGracePeriodEnd = block.timestamp + SCORE_VALIDITY_PERIOD;
        emit ScoreExpirationInitialized(legacyScoreGracePeriodEnd);
    }

    /// @notice Add a userScore to the list
    /// @param _user address of the user to add
    /// @param _score score to assign to the user
    function addUserScore(address _user, uint256 _score) external onlyAuthorized {
        _revertZeroAddress(_user);
        userScores[_user] = _score;
        userScoreUpdatedAt[_user] = block.timestamp;
        emit UserScoreAdded(_user, _score);
    }

    /// @notice Remove a user from the list
    /// @param _user address of the user to remove
    function removeUser(address _user) external onlyAuthorized {
        _revertZeroAddress(_user);
        delete userScores[_user];
        delete userScoreUpdatedAt[_user];
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
            if (strategy.councilSafe == address(0)) {
                return true;
            }

            address registryCommunity = address(CVStrategy(payable(_strategy)).registryCommunity());
            if (!IStrategyRegistryStatus(registryCommunity).enabledStrategies(_strategy)) {
                return true;
            }
        }

        if (strategy.threshold == 0) {
            return true;
        }

        uint256 updatedAt = userScoreUpdatedAt[_user];
        // Zero distinguishes pre-upgrade scores that use the bounded migration grace period.
        // slither-disable-next-line incorrect-equality
        bool scoreIsFresh = updatedAt == 0
            ? legacyScoreGracePeriodEnd != 0 && block.timestamp <= legacyScoreGracePeriodEnd
            : block.timestamp <= updatedAt + SCORE_VALIDITY_PERIOD;
        return scoreIsFresh && userScore >= strategy.threshold;
    }
}
