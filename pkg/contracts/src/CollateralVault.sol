// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {ReentrancyGuardUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
// import {console} from "forge-std/console.sol";
import {ICollateralVault} from "./interfaces/ICollateralVault.sol";

contract CollateralVault is ReentrancyGuard, ICollateralVault {
    mapping(uint256 proposalId => mapping(address user => uint256 amount)) public proposalCollateral;
    address public owner;

    event CollateralDeposited(uint256 proposalId, address indexed user, uint256 amount);
    event CollateralWithdrawn(
        uint256 proposalId, address indexed user, uint256 amount, bool isInsufficientAvailableAmount
    );
    event CollateralWithdrawn(
        uint256 proposalId,
        address indexed fromUser,
        address indexed toUser,
        uint256 amount,
        bool isInsufficientAvailableAmount
    );

    error AlreadyInitialized();
    error NotAuthorized();
    error InsufficientCollateral(uint256 requested, uint256 available);
    error InvalidAddress();
    error TransferFailed();
    // Goss: Support zero colateral
    // error AmountCanNotBeZero();

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotAuthorized();
        }
        _;
    }

    constructor() {}

    function initialize() external {
        if (owner != address(0)) {
            revert AlreadyInitialized();
        }
        owner = msg.sender;
    }

    function depositCollateral(uint256 proposalId, address user) external payable onlyOwner nonReentrant {
        proposalCollateral[proposalId][user] += msg.value;
        emit CollateralDeposited(proposalId, user, msg.value);
    }

    function withdrawCollateral(uint256 _proposalId, address _user, uint256 _amount) external onlyOwner nonReentrant {
        uint256 availableAmount = proposalCollateral[_proposalId][_user];
        // if (_amount == 0) {
        //     revert AmountCanNotBeZero();
        // }
        bool isInsufficientAvailableAmount = false;
        if (_amount > availableAmount) {
            // revert InsufficientCollateral(_amount, availableAmount);
            // Goss: When here, its most likely a bug from CVStrategy,
            // so we should just return the available amount rather than blocking it forever
            _amount = availableAmount;
            isInsufficientAvailableAmount = true;
        }
        proposalCollateral[_proposalId][_user] -= _amount;
        (bool success,) = _user.call{value: _amount}("");
        if (!success) {
            revert TransferFailed();
        }
        emit CollateralWithdrawn(_proposalId, _user, _amount, isInsufficientAvailableAmount);
    }

    function withdrawCollateralFor(uint256 _proposalId, address _fromUser, address _toUser, uint256 _amount)
        external
        onlyOwner
        nonReentrant
    {
        uint256 availableAmount = proposalCollateral[_proposalId][_fromUser];
        // if (_amount == 0) {
        //     revert AmountCanNotBeZero();
        // }
        bool isInsufficientAvailableAmount = false;
        if (_amount > availableAmount) {
            // revert InsufficientCollateral(_amount, availableAmount);
            // Goss: When here, its most likely a bug from CVStrategy,
            // so we should just return the available amount rather than blocking it forever
            _amount = availableAmount;
            isInsufficientAvailableAmount = true;
        }
        proposalCollateral[_proposalId][_fromUser] -= _amount;
        (bool success,) = _toUser.call{value: _amount}("");
        if (!success) {
            revert TransferFailed();
        }
        emit CollateralWithdrawn(_proposalId, _fromUser, _toUser, _amount, isInsufficientAvailableAmount);
    }
}
