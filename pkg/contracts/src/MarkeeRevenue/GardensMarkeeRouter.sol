// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import {
    ReentrancyGuardUpgradeable
} from "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";

import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {CommunityKeyLib} from "./libraries/CommunityKeyLib.sol";
import {ICommunityRevenueVault} from "./interfaces/ICommunityRevenueVault.sol";
import {IGardensMarkeeRouter} from "./interfaces/IGardensMarkeeRouter.sol";
import {IBridgeAdapter, BridgeRequest} from "./interfaces/IBridgeAdapter.sol";
import {IRegistryCommunitySafe} from "./interfaces/IRegistryCommunitySafe.sol";

/// @notice Singleton Gardens router, one per deployed network. Deploys and
/// tracks one deterministic `CommunityRevenueVault` per opted-in community,
/// and is the only caller authorized to release vault revenue — either paid
/// locally to a community's council Safe on this same chain, or handed to
/// the configured bridge adapter for remote delivery.
///
/// `ethx`/`weth` are configured per deployment rather than hardcoded,
/// since they're network-specific (e.g. the production Base deployment
/// passes the canonical Base ETHx `0x46fd5cfB4c12D87acD3a13e92BAa53240C661D93`
/// and WETH `0x4200000000000000000000000000000000000006` at `initialize`,
/// per the locked V1 decisions; a testnet deployment passes that network's
/// own Super ETH / WETH addresses).
///
/// Threshold policy (the 1% automatic-sweep ratio vs. a signed manual-claim
/// fee limit) is decided off-chain by the API before it authorizes the
/// keeper to call `sweep`; on-chain this contract only enforces quote
/// validity, destination integrity, minimum output, and funds conservation.
contract GardensMarkeeRouter is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable, IGardensMarkeeRouter {
    struct CommunityInfo {
        uint256 communityChainId;
        address registryCommunity;
    }

    address public ethx;
    address public weth;
    address public vaultImplementation;
    address public bridgeAdapter;
    mapping(address keeper => bool authorized) public keepers;
    mapping(bytes32 communityKey => address vault) public vaults;
    mapping(bytes32 communityKey => CommunityInfo) public communities;
    mapping(uint256 chainId => address receiver) public remoteReceivers;

    uint256[38] private __gap;

    event KeeperUpdated(address indexed keeper, bool authorized);
    event BridgeAdapterUpdated(address indexed adapter);
    event VaultImplementationUpdated(address indexed implementation);
    event TokensUpdated(address indexed ethx, address indexed weth);
    event RemoteReceiverUpdated(uint256 indexed chainId, address indexed receiver);
    event VaultCreated(
        bytes32 indexed communityKey, address indexed vault, uint256 communityChainId, address registryCommunity
    );
    event RevenueSwept(bytes32 indexed communityKey, address indexed destination, uint256 amount, bool bridged);

    error NotKeeper();
    error ZeroAddress();
    error VaultNotFound();
    error BridgeAdapterNotConfigured();
    error RemoteReceiverNotConfigured(uint256 chainId);
    error InsufficientOutput(uint256 expected, uint256 minimum);

    modifier onlyKeeper() {
        if (!keepers[msg.sender]) {
            revert NotKeeper();
        }
        _;
    }

    function initialize(
        address _owner,
        address _vaultImplementation,
        address _bridgeAdapter,
        address _ethx,
        address _weth
    ) external initializer {
        if (
            _owner == address(0) || _vaultImplementation == address(0) || _bridgeAdapter == address(0)
                || _ethx == address(0) || _weth == address(0)
        ) {
            revert ZeroAddress();
        }

        ProxyOwnableUpgrader.initialize(_owner);
        __ReentrancyGuard_init();

        vaultImplementation = _vaultImplementation;
        bridgeAdapter = _bridgeAdapter;
        ethx = _ethx;
        weth = _weth;
    }

    receive() external payable {}

    /// @inheritdoc IGardensMarkeeRouter
    function ensureCommunityVault(uint256 communityChainId, address registryCommunity)
        external
        onlyKeeper
        returns (address vault)
    {
        if (registryCommunity == address(0)) {
            revert ZeroAddress();
        }

        bytes32 key = CommunityKeyLib.communityKey(communityChainId, registryCommunity);
        vault = vaults[key];
        if (vault != address(0)) {
            return vault;
        }

        vault = Clones.cloneDeterministic(vaultImplementation, key);
        ICommunityRevenueVault(vault).initialize(key, communityChainId, registryCommunity, ethx, weth);

        vaults[key] = vault;
        communities[key] = CommunityInfo({communityChainId: communityChainId, registryCommunity: registryCommunity});

        emit VaultCreated(key, vault, communityChainId, registryCommunity);
    }

    /// @inheritdoc IGardensMarkeeRouter
    function communityVault(bytes32 communityKey) external view returns (address vault) {
        return vaults[communityKey];
    }

    function predictVaultAddress(bytes32 communityKey) external view returns (address) {
        return Clones.predictDeterministicAddress(vaultImplementation, communityKey, address(this));
    }

    /// @notice Releases a community's accumulated revenue. Base-local
    /// communities are paid directly to their council Safe; remote
    /// communities are handed to the bridge adapter. `quoteData` and
    /// `minAmountOut` are ignored for local payouts.
    function sweep(bytes32 communityKey, bytes calldata quoteData, uint256 minAmountOut)
        external
        onlyKeeper
        nonReentrant
    {
        address vault = vaults[communityKey];
        if (vault == address(0)) {
            revert VaultNotFound();
        }
        CommunityInfo memory info = communities[communityKey];

        if (info.communityChainId == block.chainid) {
            address safe = IRegistryCommunitySafe(info.registryCommunity).councilSafe();
            if (safe == address(0)) {
                revert ZeroAddress();
            }
            uint256 localAmount = ICommunityRevenueVault(vault).releaseRevenue(payable(safe));
            emit RevenueSwept(communityKey, safe, localAmount, false);
            return;
        }

        address adapter = bridgeAdapter;
        if (adapter == address(0)) {
            revert BridgeAdapterNotConfigured();
        }
        address receiver = remoteReceivers[info.communityChainId];
        if (receiver == address(0)) {
            revert RemoteReceiverNotConfigured(info.communityChainId);
        }

        uint256 amount = ICommunityRevenueVault(vault).releaseRevenue(payable(address(this)));

        BridgeRequest memory request = BridgeRequest({
            destinationChainId: info.communityChainId,
            destinationReceiver: receiver,
            communityKey: communityKey,
            registryCommunity: info.registryCommunity,
            refundRecipient: vault,
            minAmountOut: minAmountOut
        });
        (, uint256 expectedAmountOut) = IBridgeAdapter(adapter).bridgeETH{value: amount}(request, quoteData);
        if (expectedAmountOut < minAmountOut) {
            revert InsufficientOutput(expectedAmountOut, minAmountOut);
        }

        emit RevenueSwept(communityKey, receiver, amount, true);
    }

    function setKeeper(address keeper, bool authorized) external onlyOwner {
        keepers[keeper] = authorized;
        emit KeeperUpdated(keeper, authorized);
    }

    function setBridgeAdapter(address adapter) external onlyOwner {
        if (adapter == address(0)) {
            revert ZeroAddress();
        }
        bridgeAdapter = adapter;
        emit BridgeAdapterUpdated(adapter);
    }

    function setVaultImplementation(address implementation) external onlyOwner {
        if (implementation == address(0)) {
            revert ZeroAddress();
        }
        vaultImplementation = implementation;
        emit VaultImplementationUpdated(implementation);
    }

    function setRemoteReceiver(uint256 chainId, address receiver) external onlyOwner {
        remoteReceivers[chainId] = receiver;
        emit RemoteReceiverUpdated(chainId, receiver);
    }

    /// @dev Only affects vaults created after this call — existing vaults
    /// keep whatever ethx/weth they were initialized with.
    function setTokens(address _ethx, address _weth) external onlyOwner {
        if (_ethx == address(0) || _weth == address(0)) {
            revert ZeroAddress();
        }
        ethx = _ethx;
        weth = _weth;
        emit TokensUpdated(_ethx, _weth);
    }
}
