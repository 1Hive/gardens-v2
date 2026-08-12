// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {
    ReentrancyGuardUpgradeable
} from "openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {IRegistryCommunitySafe} from "./interfaces/IRegistryCommunitySafe.sol";
import {ISquidGardensRevenueReceiver} from "./interfaces/ISquidGardensRevenueReceiver.sol";

/// @notice One singleton on each remote Gardens chain. Squid's destination
/// multicall invokes this contract with the full native output of a route.
/// The receiver resolves the community's latest council Safe at delivery
/// time and either forwards the funds or escrows a failed payout for retry.
contract SquidGardensRevenueReceiver is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable, ISquidGardensRevenueReceiver {
    using SafeERC20 for IERC20;

    address public squidMulticall;
    mapping(bytes32 payoutId => bool processed) public processedPayoutIds;
    mapping(bytes32 payoutId => FailedPayout) public failedPayouts;
    mapping(bytes32 payoutId => FailedTokenPayout) public failedTokenPayouts;

    uint256[46] private __gap;

    modifier onlySquidMulticall() {
        if (msg.sender != squidMulticall) revert NotSquidMulticall();
        _;
    }

    /// @inheritdoc ISquidGardensRevenueReceiver
    function receiveSquidTokenRevenue(
        bytes32 payoutId,
        bytes32 communityKey,
        address registryCommunity,
        address token,
        uint256 amount
    ) external onlySquidMulticall nonReentrant {
        if (registryCommunity == address(0) || token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroValue();
        if (processedPayoutIds[payoutId]) revert PayoutAlreadyProcessed();
        processedPayoutIds[payoutId] = true;

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        address safe = IRegistryCommunitySafe(registryCommunity).councilSafe();
        bool delivered = safe != address(0) && _tryTokenTransfer(token, safe, amount);

        if (delivered) {
            emit TokenPayoutDelivered(payoutId, communityKey, safe, token, amount);
        } else {
            failedTokenPayouts[payoutId] = FailedTokenPayout({
                communityKey: communityKey,
                registryCommunity: registryCommunity,
                token: token,
                amount: amount,
                resolved: false
            });
            emit TokenPayoutEscrowed(payoutId, communityKey, token, amount);
        }
    }

    function initialize(address initialOwner, address initialSquidMulticall) public initializer {
        if (initialOwner == address(0) || initialSquidMulticall == address(0)) revert ZeroAddress();
        ProxyOwnableUpgrader.initialize(initialOwner);
        __ReentrancyGuard_init();
        squidMulticall = initialSquidMulticall;
    }

    function setSquidMulticall(address newSquidMulticall) external onlyOwner {
        if (newSquidMulticall == address(0)) revert ZeroAddress();
        squidMulticall = newSquidMulticall;
        emit SquidMulticallUpdated(newSquidMulticall);
    }

    /// @inheritdoc ISquidGardensRevenueReceiver
    function receiveSquidRevenue(bytes32 payoutId, bytes32 communityKey, address registryCommunity)
        external
        payable
        onlySquidMulticall
        nonReentrant
    {
        if (msg.value == 0) revert ZeroValue();
        if (registryCommunity == address(0)) revert ZeroAddress();
        if (processedPayoutIds[payoutId]) revert PayoutAlreadyProcessed();
        processedPayoutIds[payoutId] = true;

        address safe = IRegistryCommunitySafe(registryCommunity).councilSafe();
        bool delivered;
        if (safe != address(0)) {
            (delivered,) = payable(safe).call{value: msg.value}("");
        }

        if (delivered) {
            emit PayoutDelivered(payoutId, communityKey, safe, msg.value);
        } else {
            failedPayouts[payoutId] = FailedPayout({
                communityKey: communityKey, registryCommunity: registryCommunity, amount: msg.value, resolved: false
            });
            emit PayoutEscrowed(payoutId, communityKey, msg.value);
        }
    }

    /// @inheritdoc ISquidGardensRevenueReceiver
    function retryPayout(bytes32 payoutId) external nonReentrant {
        FailedPayout storage payout = failedPayouts[payoutId];
        if (payout.registryCommunity == address(0)) revert PayoutNotFound();
        if (payout.resolved) revert PayoutAlreadyResolved();

        address safe = IRegistryCommunitySafe(payout.registryCommunity).councilSafe();
        if (safe == address(0)) revert TransferFailed();
        payout.resolved = true;
        (bool success,) = payable(safe).call{value: payout.amount}("");
        if (!success) revert TransferFailed();

        emit PayoutRetried(payoutId, safe, payout.amount);
    }

    /// @inheritdoc ISquidGardensRevenueReceiver
    function recoverPayout(bytes32 payoutId, address payable to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        FailedPayout storage payout = failedPayouts[payoutId];
        if (payout.registryCommunity == address(0)) revert PayoutNotFound();
        if (payout.resolved) revert PayoutAlreadyResolved();

        payout.resolved = true;
        (bool success,) = to.call{value: payout.amount}("");
        if (!success) revert TransferFailed();

        emit PayoutRecovered(payoutId, to, payout.amount);
    }

    /// @inheritdoc ISquidGardensRevenueReceiver
    function retryTokenPayout(bytes32 payoutId) external nonReentrant {
        FailedTokenPayout storage payout = failedTokenPayouts[payoutId];
        if (payout.registryCommunity == address(0)) revert PayoutNotFound();
        if (payout.resolved) revert PayoutAlreadyResolved();

        address safe = IRegistryCommunitySafe(payout.registryCommunity).councilSafe();
        if (safe == address(0)) revert TransferFailed();
        payout.resolved = true;
        if (!_tryTokenTransfer(payout.token, safe, payout.amount)) revert TransferFailed();

        emit TokenPayoutRetried(payoutId, safe, payout.token, payout.amount);
    }

    /// @inheritdoc ISquidGardensRevenueReceiver
    function recoverTokenPayout(bytes32 payoutId, address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        FailedTokenPayout storage payout = failedTokenPayouts[payoutId];
        if (payout.registryCommunity == address(0)) revert PayoutNotFound();
        if (payout.resolved) revert PayoutAlreadyResolved();

        payout.resolved = true;
        if (!_tryTokenTransfer(payout.token, to, payout.amount)) revert TransferFailed();

        emit TokenPayoutRecovered(payoutId, to, payout.token, payout.amount);
    }

    function _tryTokenTransfer(address token, address to, uint256 amount) internal returns (bool) {
        (bool success, bytes memory returnData) = token.call(abi.encodeCall(IERC20.transfer, (to, amount)));
        return success && (returnData.length == 0 || (returnData.length >= 32 && abi.decode(returnData, (bool))));
    }
}
