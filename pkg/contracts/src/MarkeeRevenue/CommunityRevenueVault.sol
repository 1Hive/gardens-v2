// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISETH} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/tokens/ISETH.sol";

import {ICommunityRevenueVault} from "./interfaces/ICommunityRevenueVault.sol";
import {IWETH9} from "./interfaces/IWETH9.sol";

/// @notice Deployed once per Gardens community via
/// `GardensMarkeeRouter.ensureCommunityVault`, as a deterministic
/// `Clones.cloneDeterministic` copy of this implementation. Follows the
/// repo's clone-then-initialize convention (see `CollateralVault.sol`):
/// a plain constructor plus a one-shot `initialize`, rather than OZ
/// `Initializable`, since every clone shares this implementation's bytecode.
contract CommunityRevenueVault is ReentrancyGuard, ICommunityRevenueVault {
    address public router;
    bytes32 public communityKey;
    uint256 public communityChainId;
    address public registryCommunity;
    ISETH public ethx;
    IWETH9 public weth;

    modifier onlyRouter() {
        if (msg.sender != router) {
            revert NotRouter();
        }
        _;
    }

    constructor() {}

    /// @dev Called by the router immediately after cloning, so `msg.sender`
    /// at initialization time is the router itself — mirrors
    /// `CollateralVault.initialize()`'s `owner = msg.sender` pattern.
    function initialize(
        bytes32 _communityKey,
        uint256 _communityChainId,
        address _registryCommunity,
        address _ethx,
        address _weth
    ) external {
        if (router != address(0)) {
            revert AlreadyInitialized();
        }
        if (_registryCommunity == address(0) || _ethx == address(0) || _weth == address(0)) {
            revert ZeroAddress();
        }

        router = msg.sender;
        communityKey = _communityKey;
        communityChainId = _communityChainId;
        registryCommunity = _registryCommunity;
        ethx = ISETH(_ethx);
        weth = IWETH9(_weth);

        emit VaultInitialized(router, _communityKey, _communityChainId, _registryCommunity);
    }

    receive() external payable {}

    function availableRevenue()
        external
        view
        returns (uint256 nativeETH, uint256 ethxBalance, uint256 wethBalance, uint256 combinedETH)
    {
        nativeETH = address(this).balance;
        ethxBalance = ethx.balanceOf(address(this));
        wethBalance = weth.balanceOf(address(this));
        combinedETH = nativeETH + ethxBalance + wethBalance;
    }

    function releaseRevenue(address payable to) external onlyRouter nonReentrant returns (uint256 amountReleased) {
        if (to == address(0)) {
            revert ZeroAddress();
        }

        uint256 ethxBalance = ethx.balanceOf(address(this));
        if (ethxBalance > 0) {
            ethx.downgradeToETH(ethxBalance);
        }

        uint256 wethBalance = weth.balanceOf(address(this));
        if (wethBalance > 0) {
            weth.withdraw(wethBalance);
        }

        if (ethxBalance > 0 || wethBalance > 0) {
            emit RevenueNormalized(ethxBalance, wethBalance);
        }

        amountReleased = address(this).balance;
        (bool success,) = to.call{value: amountReleased}("");
        if (!success) {
            revert TransferFailed();
        }

        emit RevenueReleased(to, amountReleased);
    }
}
