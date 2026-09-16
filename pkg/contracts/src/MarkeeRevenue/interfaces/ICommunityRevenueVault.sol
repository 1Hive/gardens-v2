// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @notice One deterministic clone per Gardens community on Base. Collects
/// the community's streaming-leaderboard revenue in native ETH, canonical
/// Base ETHx, and canonical Base WETH, and normalizes all three into native
/// ETH on release. Only the `GardensMarkeeRouter` that deployed the vault
/// may release its revenue.
interface ICommunityRevenueVault {
    event VaultInitialized(
        address indexed router, bytes32 indexed communityKey, uint256 communityChainId, address registryCommunity
    );
    event RevenueNormalized(uint256 ethxDowngraded, uint256 wethUnwrapped);
    event RevenueReleased(address indexed to, uint256 amount);

    error AlreadyInitialized();
    error NotRouter();
    error TransferFailed();
    error ZeroAddress();

    function router() external view returns (address);
    function communityKey() external view returns (bytes32);
    function communityChainId() external view returns (uint256);
    function registryCommunity() external view returns (address);

    function initialize(
        bytes32 _communityKey,
        uint256 _communityChainId,
        address _registryCommunity,
        address _ethx,
        address _weth
    ) external;

    /// @return nativeETH Native ETH currently held by the vault.
    /// @return ethxBalance Canonical ETHx balance held by the vault.
    /// @return wethBalance Canonical WETH balance held by the vault.
    /// @return combinedETH The sum of all three, expressed in ETH terms.
    function availableRevenue()
        external
        view
        returns (uint256 nativeETH, uint256 ethxBalance, uint256 wethBalance, uint256 combinedETH);

    /// @notice Downgrades all ETHx and unwraps all WETH held by the vault,
    /// then sends the vault's full native ETH balance to `to`.
    /// @dev Router-only, reentrancy-protected, atomic.
    function releaseRevenue(address payable to) external returns (uint256 amountReleased);
}
