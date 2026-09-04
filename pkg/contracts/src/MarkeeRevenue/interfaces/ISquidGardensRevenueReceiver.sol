// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

interface ISquidGardensRevenueReceiver {
    struct FailedPayout {
        bytes32 communityKey;
        address registryCommunity;
        uint256 amount;
        bool resolved;
    }

    struct FailedTokenPayout {
        bytes32 communityKey;
        address registryCommunity;
        address token;
        uint256 amount;
        bool resolved;
    }

    event PayoutDelivered(
        bytes32 indexed payoutId, bytes32 indexed communityKey, address indexed councilSafe, uint256 amount
    );
    event PayoutEscrowed(bytes32 indexed payoutId, bytes32 indexed communityKey, uint256 amount);
    event PayoutRetried(bytes32 indexed payoutId, address indexed councilSafe, uint256 amount);
    event PayoutRecovered(bytes32 indexed payoutId, address indexed recipient, uint256 amount);
    event TokenPayoutDelivered(
        bytes32 indexed payoutId,
        bytes32 indexed communityKey,
        address indexed councilSafe,
        address token,
        uint256 amount
    );
    event TokenPayoutEscrowed(
        bytes32 indexed payoutId, bytes32 indexed communityKey, address indexed token, uint256 amount
    );
    event TokenPayoutRetried(
        bytes32 indexed payoutId, address indexed councilSafe, address indexed token, uint256 amount
    );
    event TokenPayoutRecovered(
        bytes32 indexed payoutId, address indexed recipient, address indexed token, uint256 amount
    );
    event SquidMulticallUpdated(address indexed squidMulticall);
    event TokenRevenueReceived(
        bytes32 indexed payoutId,
        bytes32 indexed communityKey,
        address indexed councilSafe,
        address token,
        uint256 amount
    );

    error NotSquidMulticall();
    error ZeroAddress();
    error ZeroValue();
    error PayoutAlreadyProcessed();
    error PayoutNotFound();
    error PayoutAlreadyResolved();
    error TransferFailed();

    function receiveSquidRevenue(bytes32 payoutId, bytes32 communityKey, address registryCommunity) external payable;
    function receiveSquidTokenRevenue(
        bytes32 payoutId,
        bytes32 communityKey,
        address registryCommunity,
        address token,
        uint256 amount
    ) external;
    function receiveTokenRevenue(bytes32 communityKey, address registryCommunity, address token, uint256 amount)
        external;
    function retryPayout(bytes32 payoutId) external;
    function retryTokenPayout(bytes32 payoutId) external;
    function recoverPayout(bytes32 payoutId, address payable to) external;
    function recoverTokenPayout(bytes32 payoutId, address to) external;
}
