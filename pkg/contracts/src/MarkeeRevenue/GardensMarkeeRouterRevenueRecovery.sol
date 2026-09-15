// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {
    ReentrancyGuardUpgradeable
} from "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";

import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {ICommunityRevenueVault} from "./interfaces/ICommunityRevenueVault.sol";

/// @notice Temporary recovery implementation for the retired production
/// GardensMarkeeRouter. Its storage declarations intentionally match the
/// legacy implementation exactly so an owner can atomically release one
/// community vault and then restore the previous implementation.
contract GardensMarkeeRouterRevenueRecovery is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable {
    struct CommunityInfo {
        uint256 communityChainId;
        address registryCommunity;
    }

    address public ethx;
    address public weth;
    address public vaultImplementation;
    address public bridgeAdapter;
    mapping(address keeper => bool authorized) public keepers;
    // This temporary implementation reads vault entries initialized by the
    // retired router through the proxy. It must not initialize new storage.
    // slither-disable-next-line uninitialized-state
    mapping(bytes32 communityKey => address vault) public vaults;
    mapping(bytes32 communityKey => CommunityInfo) public communities;
    mapping(uint256 chainId => address receiver) public remoteReceivers;

    uint256[38] private __gap;

    event CommunityRevenueRecovered(
        bytes32 indexed communityKey, address indexed vault, address indexed recipient, uint256 amount
    );

    error VaultNotFound();
    error ZeroAddress();

    function recoverCommunityRevenue(bytes32 communityKey, address payable recipient)
        external
        onlyOwner
        nonReentrant
        returns (uint256 amount)
    {
        if (recipient == address(0)) revert ZeroAddress();

        address vault = vaults[communityKey];
        if (vault == address(0)) revert VaultNotFound();

        amount = ICommunityRevenueVault(vault).releaseRevenue(recipient);
        emit CommunityRevenueRecovered(communityKey, vault, recipient, amount);
    }
}
