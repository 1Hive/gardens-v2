// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CollateralVault is Ownable, ReentrancyGuard {
    mapping(uint256 proposalId => mapping(address user => uint256 amount)) public proposalCollateral;
    address public strategy;

    event CollateralDeposited(uint256 proposalId, address indexed user, uint256 amount);
    event CollateralWithdrawn(uint256 proposalId, address indexed user, uint256 amount);

    error NotAuthorized();
    error InsufficientCollateral(uint256 requested, uint256 available);
    error InvalidAddress();

    modifier onlyStrategy() {
        if (msg.sender != strategy) revert NotAuthorized();
        _;
    }

    constructor(address _strategy) {
        if (_strategy == address(0)) revert InvalidAddress();
        strategy = _strategy;
    }

    function depositCollateral(uint256 proposalId, address user) external payable onlyStrategy nonReentrant {
        proposalCollateral[proposalId][user] += msg.value;
        emit CollateralDeposited(proposalId, user, msg.value);
    }

    function withdrawCollateral(uint256 proposalId, address user, uint256 amount) external onlyStrategy nonReentrant {
        uint256 availableAmount = proposalCollateral[proposalId][user];
        if (amount == 0 || amount > availableAmount) {
            revert InsufficientCollateral(amount, availableAmount);
        }
        proposalCollateral[proposalId][user] -= amount;
        (bool success,) = user.call{value: amount}("");
        require(success, "Transfer failed");
        emit CollateralWithdrawn(proposalId, user, amount);
    }
}
