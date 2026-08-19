// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {
    ReentrancyGuardUpgradeable
} from "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";

import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {IGardensRevenueReceiver} from "./interfaces/IGardensRevenueReceiver.sol";
import {IRegistryCommunitySafe} from "./interfaces/IRegistryCommunitySafe.sol";
import {IWETH9} from "./interfaces/IWETH9.sol";

/// @notice One shared singleton per supported remote Gardens chain. Receives
/// bridged community revenue, resolves the latest council Safe for the
/// destination community at delivery time, and forwards funds. A failed Safe
/// transfer is escrowed rather than reverting the inbound bridge hook, and
/// can be retried permissionlessly or recovered by a maintainer.
///
contract GardensRevenueReceiver is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable, IGardensRevenueReceiver {
    address public acrossSpokePool;
    mapping(bytes32 payoutId => bool processed) public processedPayoutIds;
    mapping(bytes32 payoutId => FailedPayout) public failedPayouts;
    address public wrappedNativeToken;

    uint256[44] private __gap;

    event AcrossConfigUpdated(address indexed spokePool, address indexed wrappedNativeToken);

    modifier onlyAcrossSpokePool() {
        if (acrossSpokePool == address(0) || msg.sender != acrossSpokePool) {
            revert NotAcrossSpokePool();
        }
        _;
    }

    function initialize(address _owner, address _acrossSpokePool, address _wrappedNativeToken) public initializer {
        if (_owner == address(0) || _acrossSpokePool == address(0) || _wrappedNativeToken == address(0)) {
            revert ZeroAddress();
        }
        ProxyOwnableUpgrader.initialize(_owner);
        __ReentrancyGuard_init();
        acrossSpokePool = _acrossSpokePool;
        wrappedNativeToken = _wrappedNativeToken;
    }

    function setAcrossConfig(address _acrossSpokePool, address _wrappedNativeToken) external onlyOwner {
        if (_acrossSpokePool == address(0) || _wrappedNativeToken == address(0)) revert ZeroAddress();
        acrossSpokePool = _acrossSpokePool;
        wrappedNativeToken = _wrappedNativeToken;
        emit AcrossConfigUpdated(_acrossSpokePool, _wrappedNativeToken);
    }

    receive() external payable {
        if (msg.sender != wrappedNativeToken) revert InvalidToken();
    }

    /// @inheritdoc IGardensRevenueReceiver
    function handleV3AcrossMessage(address tokenSent, uint256 amount, address, bytes memory message)
        external
        onlyAcrossSpokePool
        nonReentrant
    {
        if (tokenSent != wrappedNativeToken) revert InvalidToken();
        if (IWETH9(wrappedNativeToken).balanceOf(address(this)) < amount) revert InsufficientBalance();
        IWETH9(wrappedNativeToken).withdraw(amount);

        (bytes32 payoutId, bytes32 communityKey, address registryCommunity) =
            abi.decode(message, (bytes32, bytes32, address));
        if (processedPayoutIds[payoutId]) {
            revert PayoutAlreadyProcessed();
        }
        processedPayoutIds[payoutId] = true;

        address safe = _resolveCouncilSafe(registryCommunity);
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

        address safe = _resolveCouncilSafe(payout.registryCommunity);
        payout.resolved = true;
        bool delivered = false;
        if (safe != address(0)) {
            (delivered,) = payable(safe).call{value: payout.amount}("");
        }
        if (!delivered) {
            revert TransferFailed();
        }

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

    function _resolveCouncilSafe(address registryCommunity) internal view returns (address safe) {
        try IRegistryCommunitySafe(registryCommunity).councilSafe() returns (address resolvedSafe) {
            safe = resolvedSafe;
        } catch {
            safe = address(0);
        }
    }
}
