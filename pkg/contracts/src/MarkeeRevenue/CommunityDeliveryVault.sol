// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IRegistryCommunitySafe} from "./interfaces/IRegistryCommunitySafe.sol";

/// @notice Token-only bridge inbox for exactly one community. No caller can
/// select a beneficiary. A failed registry lookup or transfer retains funds
/// here for a permissionless retry after the community fixes its Safe.
contract CommunityDeliveryVault is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public immutable registryCommunity;
    IERC20 public immutable token;
    uint256 public totalDelivered;
    event Delivered(address indexed councilSafe, uint256 amount, uint256 totalDelivered);
    error InvalidConfiguration();

    constructor(address community, address asset) {
        if (community.code.length == 0 || asset.code.length == 0) revert InvalidConfiguration();
        registryCommunity = community;
        token = IERC20(asset);
    }

    function deliver() external nonReentrant returns (uint256 amount) {
        amount = token.balanceOf(address(this));
        if (amount == 0) return 0;
        address safe = IRegistryCommunitySafe(registryCommunity).councilSafe();
        if (safe == address(0) || safe == address(this)) revert InvalidConfiguration();
        totalDelivered += amount;
        token.safeTransfer(safe, amount);
        emit Delivered(safe, amount, totalDelivered);
    }
}
