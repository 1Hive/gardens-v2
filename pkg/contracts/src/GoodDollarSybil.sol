// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import {ProxyOwnableUpgrader} from "./ProxyOwnableUpgrader.sol";
import {ISybilScorer, Strategy} from "./ISybilScorer.sol";
import {CVStrategy} from "./CVStrategy/CVStrategy.sol";

/// @custom:oz-upgrades-from PassportScorer
contract GoodDollarSybil is ISybilScorer, ProxyOwnableUpgrader {
    address public listManager;

    mapping(address => bool) public userValidity;
    mapping(address => Strategy) public strategies;

    event UserValidated(address user);
    event UserInvalidated(address indexed user);
    event ListManagerChanged(address indexed oldManager, address indexed newManager);
    event GoodDollarStrategyAdded(address indexed strategy, address councilSafe);

    error OnlyAuthorized();
    // error OnlyAuthorizedOrUser();
    error OnlyCouncilOrAuthorized();
    // error OnlyCouncil();
    error ZeroAddress();
    error NotSupported();
    // error StrategyAlreadyExists();

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
    // /// @param _score score to assign to the user
    function validateUser(address _user) external onlyAuthorized {
        _revertZeroAddress(_user);
        userValidity[_user] = true;
        emit UserValidated(_user);
    }

    /// @notice Remove a user from the list
    /// @param _user address of the user to remove
    function invalidateUser(address _user) external onlyAuthorized {
        _revertZeroAddress(_user);
        userValidity[_user] = false;
        emit UserInvalidated(_user);
    }

    /// @notice Change the list manager address
    /// @param _newManager address of the new list manager
    function changeListManager(address _newManager) external onlyOwner {
        _revertZeroAddress(_newManager);
        address oldManager = listManager;
        listManager = _newManager;
        emit ListManagerChanged(oldManager, _newManager);
    }

    function addStrategy(address _strategy, uint256, address _councilSafe)
        external
        override
        onlyCouncilOrAuthorized(_strategy)
    {
        strategies[_strategy] = Strategy({active: false, threshold: 0, councilSafe: _councilSafe});
        emit GoodDollarStrategyAdded(_strategy, _councilSafe);
    }

    function activateStrategy(address _address) external override {
        strategies[_address].active = true;
    }

    function modifyThreshold(address, uint256) external pure {
        revert NotSupported();
    }

    /// @notice Check if an action can be executed
    /// @param _user address of the user to check
    function canExecuteAction(address _user, address) external view override returns (bool isUserValid) {
        isUserValid = userValidity[_user];
    }

    uint256[50] private __gap;
}
