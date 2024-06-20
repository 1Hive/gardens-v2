// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ISybilScorer, PassportData} from "./ISybilScorer.sol";

contract PassportScorer is Ownable, ISybilScorer {
    address public listManager;
    uint256 public threshold;

    mapping(address => PassportData) public userScores;

    event UserScoreAdded(address user, uint256 score, uint256 lastUpdated);
    event UserRemoved(address user);
    event ListManagerChanged(address oldManager, address newManager);

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

    function getUserScore(address _user) external view returns (PassportData memory) {
        return userScores[_user];
    }
}
