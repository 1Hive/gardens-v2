// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @notice Shared seam between the opt-in flow and the community-split
/// bridge. Streaming leaderboards are created with the returned vault as
/// `beneficiaryAddress`.
interface IGardensMarkeeRouter {
    enum BridgeProtocol {
        None,
        Across,
        Squid,
        LiFi
    }

    struct CommunityIntegration {
        uint256 communityChainId;
        address registryCommunity;
        address vault;
        address factory;
        address leaderboard;
        address seedMarkee;
    }

    event CommunityLeaderboardRegistered(
        bytes32 indexed communityKey,
        uint256 indexed communityChainId,
        address indexed registryCommunity,
        address vault,
        address factory,
        address leaderboard,
        address seedMarkee
    );

    event StreamingLeaderboardFactoryChanged(address indexed oldFactory, address indexed newFactory);

    /// @notice Deploys the deterministic vault for `(communityChainId, registryCommunity)`
    /// if it does not already exist, and returns it either way. Idempotent.
    function ensureCommunityVault(uint256 communityChainId, address registryCommunity) external returns (address vault);

    function communityVault(bytes32 communityKey) external view returns (address vault);

    function createCommunityLeaderboard(
        uint256 communityChainId,
        address registryCommunity,
        string calldata leaderboardName,
        string calldata platformId
    ) external returns (address vault, address leaderboard, address seedMarkee);

    function communityIntegration(bytes32 communityKey) external view returns (CommunityIntegration memory integration);

    function streamingLeaderboardFactory() external view returns (address factory);

    function setStreamingLeaderboardFactory(address newFactory) external;

    function bridgeConfiguration(uint256 destinationChainId)
        external
        view
        returns (address adapter, BridgeProtocol protocol);

    function setBridgeConfiguration(uint256 destinationChainId, address adapter, BridgeProtocol protocol) external;

    function clearBridgeConfiguration(uint256 destinationChainId) external;
}
