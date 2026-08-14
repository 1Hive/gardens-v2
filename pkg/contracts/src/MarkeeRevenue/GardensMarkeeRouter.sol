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
import {IStreamingLeaderboardFactory} from "./interfaces/IStreamingLeaderboardFactory.sol";

/// @notice Singleton Gardens router, one per deployed network. Deploys and
/// tracks one deterministic `CommunityRevenueVault` per opted-in community,
/// and is the only caller authorized to release vault revenue — either paid
/// locally to a community's council Safe on this same chain, or handed to
/// the destination chain's configured bridge adapter for remote delivery.
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

    struct BridgeConfiguration {
        address adapter;
        BridgeProtocol protocol;
    }

    address public ethx;
    address public weth;
    address public vaultImplementation;
    mapping(address keeper => bool authorized) public keepers;
    mapping(bytes32 communityKey => address vault) public vaults;
    mapping(bytes32 communityKey => CommunityInfo) public communities;
    mapping(uint256 chainId => address receiver) public remoteReceivers;
    address public streamingLeaderboardFactory;
    mapping(bytes32 communityKey => CommunityIntegration integration) private _communityIntegrations;
    mapping(uint256 destinationChainId => BridgeConfiguration configuration) private _bridgeConfigurations;

    uint256[36] private __gap;

    event KeeperUpdated(address indexed keeper, bool authorized);
    event BridgeConfigurationUpdated(
        uint256 indexed destinationChainId, address indexed adapter, BridgeProtocol protocol
    );
    event VaultImplementationUpdated(address indexed implementation);
    event TokensUpdated(address indexed ethx, address indexed weth);
    event RemoteReceiverUpdated(uint256 indexed chainId, address indexed receiver);
    event VaultCreated(
        bytes32 indexed communityKey, address indexed vault, uint256 communityChainId, address registryCommunity
    );
    event RevenueSwept(bytes32 indexed communityKey, address indexed destination, uint256 amount, bool bridged);
    event BridgeTransferStarted(bytes32 indexed communityKey, bytes32 indexed transferId);

    error NotKeeper();
    error ZeroAddress();
    error UnexpectedValue();
    error VaultNotFound();
    error BridgeAdapterNotConfigured();
    error RemoteReceiverNotConfigured(uint256 chainId);
    error InsufficientOutput(uint256 expected, uint256 minimum);
    error StreamingLeaderboardFactoryNotConfigured();
    error InvalidDestinationChain();
    error InvalidBridgeProtocol();
    error GasCostExceedsRevenue(uint256 gasCost, uint256 revenue);
    error KeeperReimbursementFailed();
    error RevenueTransferFailed();

    modifier onlyKeeper() {
        if (!keepers[msg.sender]) {
            revert NotKeeper();
        }
        _;
    }

    function initialize(address _owner, address _vaultImplementation, address _ethx, address _weth)
        external
        initializer
    {
        if (_owner == address(0) || _vaultImplementation == address(0) || _ethx == address(0) || _weth == address(0)) {
            revert ZeroAddress();
        }

        ProxyOwnableUpgrader.initialize(_owner);
        __ReentrancyGuard_init();

        vaultImplementation = _vaultImplementation;
        ethx = _ethx;
        weth = _weth;
    }

    receive() external payable {}

    /// @inheritdoc IGardensMarkeeRouter
    function ensureCommunityVault(uint256 communityChainId, address registryCommunity)
        external
        onlyKeeper
        nonReentrant
        returns (address vault)
    {
        return _ensureCommunityVault(communityChainId, registryCommunity);
    }

    function _ensureCommunityVault(uint256 communityChainId, address registryCommunity)
        internal
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
        vaults[key] = vault;
        communities[key] = CommunityInfo({communityChainId: communityChainId, registryCommunity: registryCommunity});
        ICommunityRevenueVault(vault).initialize(key, communityChainId, registryCommunity, ethx, weth);

        emit VaultCreated(key, vault, communityChainId, registryCommunity);
    }

    // nonReentrant protects the integration write from callbacks through the
    // initialized vault or the configured leaderboard factory.
    // slither-disable-next-line reentrancy-no-eth
    function createCommunityLeaderboard(
        uint256 communityChainId,
        address registryCommunity,
        string calldata leaderboardName,
        string calldata platformId
    ) external onlyKeeper nonReentrant returns (address vault, address leaderboard, address seedMarkee) {
        if (registryCommunity == address(0)) {
            revert ZeroAddress();
        }

        bytes32 key = CommunityKeyLib.communityKey(communityChainId, registryCommunity);
        CommunityIntegration storage existing = _communityIntegrations[key];
        if (existing.leaderboard != address(0)) {
            return (existing.vault, existing.leaderboard, existing.seedMarkee);
        }

        address factory = streamingLeaderboardFactory;
        if (factory == address(0)) {
            revert StreamingLeaderboardFactoryNotConfigured();
        }

        vault = _ensureCommunityVault(communityChainId, registryCommunity);
        (leaderboard, seedMarkee) =
            IStreamingLeaderboardFactory(factory).createLeaderboard(vault, leaderboardName, "Gardens", platformId);

        _communityIntegrations[key] = CommunityIntegration({
            communityChainId: communityChainId,
            registryCommunity: registryCommunity,
            vault: vault,
            factory: factory,
            leaderboard: leaderboard,
            seedMarkee: seedMarkee
        });

        emit CommunityLeaderboardRegistered(
            key, communityChainId, registryCommunity, vault, factory, leaderboard, seedMarkee
        );
    }

    function communityIntegration(bytes32 communityKey)
        external
        view
        returns (CommunityIntegration memory integration)
    {
        return _communityIntegrations[communityKey];
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
    /// communities are handed to that destination's bridge adapter. `quoteData` and
    /// `minAmountOut` are ignored for local payouts.
    function sweep(bytes32 communityKey, bytes calldata quoteData, uint256 minAmountOut, uint256 gasCost)
        external
        payable
        onlyKeeper
        nonReentrant
    {
        address vault = vaults[communityKey];
        if (vault == address(0)) {
            revert VaultNotFound();
        }
        CommunityInfo memory info = communities[communityKey];

        if (info.communityChainId == block.chainid) {
            if (msg.value != 0) revert UnexpectedValue();
            address safe = IRegistryCommunitySafe(info.registryCommunity).councilSafe();
            if (safe == address(0)) {
                revert ZeroAddress();
            }
            uint256 localGrossAmount = ICommunityRevenueVault(vault).releaseRevenue(payable(address(this)));
            uint256 localAmount = _reimburseKeeper(communityKey, localGrossAmount, gasCost);
            (bool success,) = payable(safe).call{value: localAmount}("");
            if (!success) revert RevenueTransferFailed();
            emit RevenueSwept(communityKey, safe, localAmount, false);
            return;
        }

        (address adapter,) = bridgeConfiguration(info.communityChainId);
        if (adapter == address(0)) {
            revert BridgeAdapterNotConfigured();
        }
        address receiver = remoteReceivers[info.communityChainId];
        if (receiver == address(0)) {
            revert RemoteReceiverNotConfigured(info.communityChainId);
        }

        uint256 grossAmount = ICommunityRevenueVault(vault).releaseRevenue(payable(address(this)));
        uint256 amount = _reimburseKeeper(communityKey, grossAmount, gasCost);

        BridgeRequest memory request = BridgeRequest({
            destinationChainId: info.communityChainId,
            destinationReceiver: receiver,
            communityKey: communityKey,
            registryCommunity: info.registryCommunity,
            refundRecipient: vault,
            minAmountOut: minAmountOut
        });
        uint256 expectedAmountOut = _executeBridge(adapter, request, quoteData, amount + msg.value);
        if (expectedAmountOut < minAmountOut) {
            revert InsufficientOutput(expectedAmountOut, minAmountOut);
        }

        emit RevenueSwept(communityKey, receiver, amount, true);
    }

    function _executeBridge(address adapter, BridgeRequest memory request, bytes calldata quoteData, uint256 value)
        internal
        returns (uint256 expectedAmountOut)
    {
        bytes32 transferId;
        (transferId, expectedAmountOut) = IBridgeAdapter(adapter).bridgeETH{value: value}(request, quoteData);
        emit BridgeTransferStarted(request.communityKey, transferId);
    }

    function _reimburseKeeper(bytes32 communityKey, uint256 grossAmount, uint256 gasCost)
        internal
        returns (uint256 netAmount)
    {
        if (gasCost >= grossAmount) {
            revert GasCostExceedsRevenue(gasCost, grossAmount);
        }
        netAmount = grossAmount - gasCost;
        if (gasCost == 0) return netAmount;

        // msg.sender is constrained by onlyKeeper on sweep. Operationally,
        // keepers must be EOAs; reimbursing that owner-authorized caller is the
        // intended destination and a reverting receiver must fail the sweep.
        // slither-disable-next-line arbitrary-send-eth
        (bool success,) = payable(msg.sender).call{value: gasCost}("");
        if (!success) revert KeeperReimbursementFailed();
        emit KeeperGasReimbursed(communityKey, msg.sender, gasCost);
    }

    function setKeeper(address keeper, bool authorized) external onlyOwner {
        keepers[keeper] = authorized;
        emit KeeperUpdated(keeper, authorized);
    }

    function setStreamingLeaderboardFactory(address newFactory) external onlyOwner {
        if (newFactory == address(0)) {
            revert ZeroAddress();
        }
        address oldFactory = streamingLeaderboardFactory;
        streamingLeaderboardFactory = newFactory;
        emit StreamingLeaderboardFactoryChanged(oldFactory, newFactory);
    }

    /// @notice Selects the adapter and quote format used for one destination
    /// chain. Every remote destination must be configured explicitly.
    function setBridgeConfiguration(uint256 destinationChainId, address adapter, BridgeProtocol protocol)
        external
        onlyOwner
    {
        if (destinationChainId == 0) {
            revert InvalidDestinationChain();
        }
        if (adapter == address(0)) {
            revert ZeroAddress();
        }
        if (protocol == BridgeProtocol.None) {
            revert InvalidBridgeProtocol();
        }
        _bridgeConfigurations[destinationChainId] = BridgeConfiguration({adapter: adapter, protocol: protocol});
        emit BridgeConfigurationUpdated(destinationChainId, adapter, protocol);
    }

    /// @notice Disables bridging to a destination until it is configured again.
    function clearBridgeConfiguration(uint256 destinationChainId) external onlyOwner {
        if (destinationChainId == 0) {
            revert InvalidDestinationChain();
        }
        delete _bridgeConfigurations[destinationChainId];
        emit BridgeConfigurationUpdated(destinationChainId, address(0), BridgeProtocol.None);
    }

    /// @notice Returns the destination-specific bridge configuration.
    function bridgeConfiguration(uint256 destinationChainId)
        public
        view
        returns (address adapter, BridgeProtocol protocol)
    {
        BridgeConfiguration memory configuration = _bridgeConfigurations[destinationChainId];
        return (configuration.adapter, configuration.protocol);
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
