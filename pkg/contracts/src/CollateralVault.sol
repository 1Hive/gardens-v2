// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";

contract CollateralVault is
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    mapping(uint256 proposalId => mapping(address user => uint256 amount))
        public proposalCollateral;
    address public strategy;

    event CollateralDeposited(
        uint256 proposalId,
        address indexed user,
        uint256 amount
    );
    event CollateralWithdrawn(
        uint256 proposalId,
        address indexed user,
        uint256 amount
    );
    event CollateralWithdrawn(
        uint256 proposalId,
        address indexed fromUser,
        address indexed toUser,
        uint256 amount
    );

    error NotAuthorized();
    error InsufficientCollateral(uint256 requested, uint256 available);
    error InvalidAddress();
    error AmountCanNotBeZero();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
    }

    function depositCollateral(
        uint256 proposalId,
        address user
    ) external payable onlyOwner nonReentrant {
        proposalCollateral[proposalId][user] += msg.value;
        emit CollateralDeposited(proposalId, user, msg.value);
    }

    function withdrawCollateral(
        uint256 _proposalId,
        address _user,
        uint256 _amount
    ) external onlyOwner nonReentrant {
        uint256 availableAmount = proposalCollateral[_proposalId][_user];
        if (_amount == 0) {
            revert AmountCanNotBeZero();
        }
        if (_amount > availableAmount) {
            revert InsufficientCollateral(_amount, availableAmount);
        }
        proposalCollateral[_proposalId][_user] -= _amount;
        (bool success, ) = _user.call{value: _amount}("");
        require(success, "Transfer failed");
        emit CollateralWithdrawn(_proposalId, _user, _amount);
    }

    function withdrawCollateralFor(
        uint256 _proposalId,
        address _fromUser,
        address _toUser,
        uint256 _amount
    ) external onlyOwner nonReentrant {
        uint256 availableAmount = proposalCollateral[_proposalId][_fromUser];
        if (_amount == 0) {
            revert AmountCanNotBeZero();
        }
        if (_amount > availableAmount) {
            revert InsufficientCollateral(_amount, availableAmount);
        }
        proposalCollateral[_proposalId][_fromUser] -= _amount;
        (bool success, ) = _toUser.call{value: _amount}("");
        require(success, "Transfer failed");
        emit CollateralWithdrawn(_proposalId, _fromUser, _toUser, _amount);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    uint256[50] private __gap;
}
