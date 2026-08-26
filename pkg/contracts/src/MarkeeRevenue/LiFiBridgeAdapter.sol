// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IBridgeAdapter, BridgeRequest} from "./interfaces/IBridgeAdapter.sol";

/// @notice Router-configured, replaceable bridge adapter for LI.FI.
/// Route calldata is produced by the off-chain LI.FI API and the only callable
/// target is pinned to LI.FI's canonical source-chain diamond. Route execution
/// remains keeper-only through GardensMarkeeRouter.
contract LiFiBridgeAdapter is Ownable, IBridgeAdapter {
    struct LiFiQuote {
        uint256 inputAmount;
        uint256 expectedAmountOut;
        uint256 executionValue;
        bytes routerCalldata;
    }

    address public router;
    address public immutable liFiDiamond;
    uint256 public transferNonce;

    event RouterUpdated(address indexed router);
    event NativeRecovered(address indexed recipient, uint256 amount);
    event LiFiRouteExecuted(
        bytes32 indexed transferId,
        uint256 indexed destinationChainId,
        address indexed destinationReceiver,
        uint256 inputAmount,
        uint256 expectedAmountOut,
        bytes32 routerCalldataHash
    );

    error NotRouter();
    error ZeroAddress();
    error ZeroValue();
    error InvalidQuote();
    error InsufficientOutput(uint256 expected, uint256 minimum);
    error RefundFailed();
    error NoNativeBalance();
    error LiFiCallFailed(bytes reason);

    modifier onlyRouter() {
        if (msg.sender != router) revert NotRouter();
        _;
    }

    constructor(address _router, address _liFiDiamond) {
        if (_liFiDiamond == address(0)) revert ZeroAddress();
        router = _router;
        liFiDiamond = _liFiDiamond;
    }

    /// @notice Accepts unused native-token value refunded by LI.FI while a
    /// route is executing. Any balance left after the call is returned to the
    /// community vault below.
    receive() external payable {}

    function setRouter(address _router) external onlyOwner {
        if (_router == address(0)) revert ZeroAddress();
        router = _router;
        emit RouterUpdated(_router);
    }

    /// @notice Recovers native value sent outside an active LI.FI route.
    /// Route-scoped refunds are still returned to the originating community
    /// vault by `bridgeETH`; this escape hatch only prevents unsolicited or
    /// delayed native transfers from becoming permanently trapped.
    function recoverNative(address payable recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        uint256 amount = address(this).balance;
        if (amount == 0) revert NoNativeBalance();

        (bool recovered,) = recipient.call{value: amount}("");
        if (!recovered) revert RefundFailed();
        emit NativeRecovered(recipient, amount);
    }

    /// @inheritdoc IBridgeAdapter
    function bridgeETH(BridgeRequest calldata request, bytes calldata quoteData)
        external
        payable
        onlyRouter
        returns (bytes32 transferId, uint256 expectedAmountOut)
    {
        if (msg.value == 0) revert ZeroValue();
        uint256 preexistingBalance = address(this).balance - msg.value;
        if (request.destinationReceiver == address(0) || request.refundRecipient == address(0)) {
            revert ZeroAddress();
        }

        LiFiQuote memory quote = abi.decode(quoteData, (LiFiQuote));
        if (
            quote.inputAmount == 0 || quote.expectedAmountOut == 0 || quote.executionValue < quote.inputAmount
                || quote.executionValue > msg.value || quote.routerCalldata.length < 4
        ) revert InvalidQuote();
        if (quote.expectedAmountOut < request.minAmountOut) {
            revert InsufficientOutput(quote.expectedAmountOut, request.minAmountOut);
        }

        uint256 nonce = transferNonce++;
        transferId = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                nonce,
                request.destinationChainId,
                request.destinationReceiver,
                request.communityKey,
                request.registryCommunity,
                quote.inputAmount,
                quote.expectedAmountOut,
                keccak256(quote.routerCalldata)
            )
        );

        uint256 surplus = msg.value - quote.executionValue;
        if (surplus != 0) {
            (bool refunded,) = payable(request.refundRecipient).call{value: surplus}("");
            if (!refunded) revert RefundFailed();
        }

        (bool success, bytes memory result) = liFiDiamond.call{value: quote.executionValue}(quote.routerCalldata);
        if (!success) revert LiFiCallFailed(result);

        uint256 routeRefund = address(this).balance - preexistingBalance;
        if (routeRefund != 0) {
            (bool refunded,) = payable(request.refundRecipient).call{value: routeRefund}("");
            if (!refunded) revert RefundFailed();
        }

        expectedAmountOut = quote.expectedAmountOut;
        emit LiFiRouteExecuted(
            transferId,
            request.destinationChainId,
            request.destinationReceiver,
            quote.inputAmount,
            expectedAmountOut,
            keccak256(quote.routerCalldata)
        );
    }
}
