// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @notice One shared receiver per supported remote Gardens chain. Resolves
/// the latest council Safe for the destination community and forwards
/// delivered native ETH. Failures are escrowed instead of reverting the
/// inbound bridge hook, and can be retried permissionlessly.
interface IGardensRevenueReceiver {
    struct FailedPayout {
        bytes32 communityKey;
        address registryCommunity;
        uint256 amount;
        bool resolved;
    }

    event PayoutDelivered(bytes32 indexed payoutId, bytes32 indexed communityKey, address safe, uint256 amount);
    event PayoutEscrowed(bytes32 indexed payoutId, bytes32 indexed communityKey, uint256 amount);
    event PayoutRetried(bytes32 indexed payoutId, address safe, uint256 amount);
    event PayoutRecovered(bytes32 indexed payoutId, address indexed to, uint256 amount);

    error NotSquidExecutor();
    error PayoutAlreadyProcessed();
    error PayoutAlreadyResolved();
    error PayoutNotFound();
    error TransferFailed();
    error ValueMismatch();
    error ZeroAddress();

    /// @notice Entry point invoked by the trusted Squid executor on delivery.
    function onReceive(bytes32 payoutId, bytes32 communityKey, address registryCommunity, uint256 amount)
        external
        payable;

    /// @notice Permissionless retry against the latest `councilSafe()`. Cannot
    /// change the community, registry, or amount recorded for `payoutId`.
    function retryPayout(bytes32 payoutId) external;

    /// @notice Maintainer-only recovery, scoped to a recorded unresolved
    /// failed payout. Cannot withdraw unrelated funds.
    function recoverPayout(bytes32 payoutId, address payable to) external;

    function failedPayouts(bytes32 payoutId)
        external
        view
        returns (bytes32 communityKey, address registryCommunity, uint256 amount, bool resolved);
}
