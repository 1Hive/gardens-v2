// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {ReentrancyGuardUpgradeable} from
    "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
import {console} from "forge-std/console.sol";
import {ICollateralVault} from "./interfaces/ICollateralVault.sol";

contract CollateralVault is ReentrancyGuard, ICollateralVault {
    /// @notice Mapping of proposal collateral
    /// @dev prooposalId => mapping of user => amount as collateral
    mapping(uint256 proposalId => mapping(address user => uint256 amount)) public proposalCollateral;
    address public owner;

    event CollateralDeposited(uint256 proposalId, address indexed user, uint256 amount);
    event CollateralWithdrawn(uint256 proposalId, address indexed user, uint256 amount);
    event CollateralWithdrawn(uint256 proposalId, address indexed fromUser, address indexed toUser, uint256 amount);

    error AlreadyInitialized();
    error NotAuthorized();
    error InsufficientCollateral(uint256 requested, uint256 available);
    error InvalidAddress();
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

    /// @notice Deposit collateral for a proposal
    /// @param proposalId The proposal id
    /// @param user The user who is depositing the collateral
    function depositCollateral(uint256 proposalId, address user) external payable onlyOwner nonReentrant {
        proposalCollateral[proposalId][user] += msg.value;
        emit CollateralDeposited(proposalId, user, msg.value);
    }

    /// @notice Withdraw collateral for a proposal
    /// @param _proposalId The proposal id
    /// @param _user The user who is withdrawing the collateral
    /// @param _amount The amount of collateral to withdraw
    function withdrawCollateral(uint256 _proposalId, address _user, uint256 _amount) external onlyOwner nonReentrant {
        uint256 availableAmount = proposalCollateral[_proposalId][_user];
        // if (_amount == 0) {
        //     revert AmountCanNotBeZero();
        // }
        if (_amount > availableAmount) {
            revert InsufficientCollateral(_amount, availableAmount);
        }
        proposalCollateral[_proposalId][_user] -= _amount;
        (bool success,) = _user.call{value: _amount}("");
        require(success, "Transfer failed");
        emit CollateralWithdrawn(_proposalId, _user, _amount);
    }

    /// @notice Withdraw collateral for a proposal
    /// @param _proposalId The proposal id
    /// @param _fromUser The user who is withdrawing the collateral
    /// @param _toUser The user who is receiving the collateral
    /// @param _amount The amount of collateral to withdraw
    function withdrawCollateralFor(uint256 _proposalId, address _fromUser, address _toUser, uint256 _amount)
        external
        onlyOwner
        nonReentrant
    {
        uint256 availableAmount = proposalCollateral[_proposalId][_fromUser];
        // if (_amount == 0) {
        //     revert AmountCanNotBeZero();
        // }
        if (_amount > availableAmount) {
            revert InsufficientCollateral(_amount, availableAmount);
        }
        proposalCollateral[_proposalId][_fromUser] -= _amount;
        (bool success,) = _toUser.call{value: _amount}("");
        require(success, "Transfer failed");
        emit CollateralWithdrawn(_proposalId, _fromUser, _toUser, _amount);
    }
}
