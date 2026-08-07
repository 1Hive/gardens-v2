// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {
    ReentrancyGuardUpgradeable
} from "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";

import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {IGardensRevenueReceiver} from "./interfaces/IGardensRevenueReceiver.sol";
import {IRegistryCommunitySafe} from "./interfaces/IRegistryCommunitySafe.sol";

/// @notice One shared singleton per supported remote Gardens chain. Receives
/// bridged community revenue, resolves the latest council Safe for the
/// destination community at delivery time, and forwards funds. A failed Safe
/// transfer is escrowed rather than reverting the inbound bridge hook, and
/// can be retried permissionlessly or recovered by a maintainer.
///
/// V1 status: `squidExecutor` defaults to the zero address, so `onReceive`
/// reverts until an owner configures the real Squid executor for this chain
/// (see SquidBridgeAdapter's integration-pending note) — safe by default.
contract GardensRevenueReceiver is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable, IGardensRevenueReceiver {
    address public squidExecutor;
    mapping(bytes32 payoutId => bool processed) public processedPayoutIds;
    mapping(bytes32 payoutId => FailedPayout) public failedPayouts;

    uint256[45] private __gap;

    event SquidExecutorUpdated(address indexed executor);

    modifier onlySquidExecutor() {
        if (squidExecutor == address(0) || msg.sender != squidExecutor) {
            revert NotSquidExecutor();
        }
        _;
    }

    function initialize(address _owner) public override initializer {
        if (_owner == address(0)) {
            revert ZeroAddress();
        }
        ProxyOwnableUpgrader.initialize(_owner);
        __ReentrancyGuard_init();
    }

    function setSquidExecutor(address executor) external onlyOwner {
        squidExecutor = executor;
        emit SquidExecutorUpdated(executor);
    }

    /// @inheritdoc IGardensRevenueReceiver
    function onReceive(bytes32 payoutId, bytes32 communityKey, address registryCommunity, uint256 amount)
        external
        payable
        onlySquidExecutor
        nonReentrant
    {
        if (msg.value != amount) {
            revert ValueMismatch();
        }
        if (processedPayoutIds[payoutId]) {
            revert PayoutAlreadyProcessed();
        }
        processedPayoutIds[payoutId] = true;

        address safe = IRegistryCommunitySafe(registryCommunity).councilSafe();
        bool delivered = false;
        if (safe != address(0)) {
            (delivered,) = payable(safe).call{value: amount}("");
        }

        if (delivered) {
            emit PayoutDelivered(payoutId, communityKey, safe, amount);
        } else {
            failedPayouts[payoutId] = FailedPayout({
                communityKey: communityKey, registryCommunity: registryCommunity, amount: amount, resolved: false
            });
            emit PayoutEscrowed(payoutId, communityKey, amount);
        }
    }

    /// @inheritdoc IGardensRevenueReceiver
    function retryPayout(bytes32 payoutId) external nonReentrant {
        FailedPayout storage payout = failedPayouts[payoutId];
        if (payout.registryCommunity == address(0)) {
            revert PayoutNotFound();
        }
        if (payout.resolved) {
            revert PayoutAlreadyResolved();
        }

        address safe = IRegistryCommunitySafe(payout.registryCommunity).councilSafe();
        bool delivered = false;
        if (safe != address(0)) {
            (delivered,) = payable(safe).call{value: payout.amount}("");
        }
        if (!delivered) {
            revert TransferFailed();
        }

        payout.resolved = true;
        emit PayoutRetried(payoutId, safe, payout.amount);
    }

    /// @inheritdoc IGardensRevenueReceiver
    function recoverPayout(bytes32 payoutId, address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) {
            revert ZeroAddress();
        }
        FailedPayout storage payout = failedPayouts[payoutId];
        if (payout.registryCommunity == address(0)) {
            revert PayoutNotFound();
        }
        if (payout.resolved) {
            revert PayoutAlreadyResolved();
        }

        payout.resolved = true;
        (bool success,) = to.call{value: payout.amount}("");
        if (!success) {
            revert TransferFailed();
        }

        emit PayoutRecovered(payoutId, to, payout.amount);
    }
}
