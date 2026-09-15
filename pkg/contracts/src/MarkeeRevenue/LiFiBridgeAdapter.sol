// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IBridgeAdapter, BridgeRequest} from "./interfaces/IBridgeAdapter.sol";
import {ISquidGardensRevenueReceiver} from "./interfaces/ISquidGardensRevenueReceiver.sol";

/// @notice Router-configured, replaceable bridge adapter for LI.FI.
/// Route calldata is produced by the off-chain LI.FI API and the only callable
/// target is pinned to LI.FI's canonical source-chain diamond. Route execution
/// remains keeper-only through GardensMarkeeRouter.
contract LiFiBridgeAdapter is Ownable, IBridgeAdapter {
    struct BridgeData {
        bytes32 transactionId;
        string bridge;
        string integrator;
        address referrer;
        address sendingAssetId;
        address receiver;
        uint256 minAmount;
        uint256 destinationChainId;
        bool hasSourceSwaps;
        bool hasDestinationCall;
    }

    struct SwapData {
        address callTo;
        address approveTo;
        address sendingAssetId;
        address receivingAssetId;
        uint256 fromAmount;
        bytes callData;
        bool requiresDeposit;
    }

    struct SendParam {
        uint32 dstEid;
        bytes32 to;
        uint256 amountLD;
        uint256 minAmountLD;
        bytes extraOptions;
        bytes composeMsg;
        bytes oftCmd;
    }

    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }

    struct NativeFee {
        address recipient;
        uint256 amount;
    }

    struct StargateData {
        uint16 assetId;
        SendParam sendParams;
        MessagingFee fee;
        address payable refundAddress;
    }

    struct LiFiQuote {
        uint256 inputAmount;
        uint256 expectedAmountOut;
        uint256 executionValue;
        address destinationToken;
        bytes routerCalldata;
    }

    address public router;
    address public immutable liFiDiamond;
    uint256 public transferNonce;
    mapping(uint256 destinationChainId => bytes32 receiver) public destinationExecutors;
    address public sourceFeeCollector;
    address public sourceFeeRecipient;
    uint16 public sourceStargateAssetId;

    event RouterUpdated(address indexed router);
    event DestinationExecutorUpdated(uint256 indexed destinationChainId, bytes32 indexed destinationExecutor);
    event SourceRouteUpdated(address indexed feeCollector, address indexed feeRecipient, uint16 stargateAssetId);
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
    error UnboundRoute();

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

    function setDestinationExecutor(uint256 destinationChainId, bytes32 destinationExecutor) external onlyOwner {
        if (destinationChainId == 0 || destinationExecutor == bytes32(0)) revert InvalidQuote();
        destinationExecutors[destinationChainId] = destinationExecutor;
        emit DestinationExecutorUpdated(destinationChainId, destinationExecutor);
    }

    function setSourceRoute(address feeCollector, address feeRecipient, uint16 stargateAssetId) external onlyOwner {
        if (feeCollector == address(0) || feeRecipient == address(0) || stargateAssetId == 0) revert InvalidQuote();
        sourceFeeCollector = feeCollector;
        sourceFeeRecipient = feeRecipient;
        sourceStargateAssetId = stargateAssetId;
        emit SourceRouteUpdated(feeCollector, feeRecipient, stargateAssetId);
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
                || quote.executionValue > msg.value || quote.destinationToken == address(0)
                || quote.routerCalldata.length < 4
        ) revert InvalidQuote();
        if (quote.expectedAmountOut < request.minAmountOut) {
            revert InsufficientOutput(quote.expectedAmountOut, request.minAmountOut);
        }

        _validateRoute(request, quote);

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

    function _validateRoute(BridgeRequest calldata request, LiFiQuote memory quote) internal view {
        // LI.FI contract-call quotes currently use Stargate V2. Decode the
        // complete Composer envelope rather than trusting provider metadata.
        if (_selector(quote.routerCalldata) != 0xa6010a66) revert UnboundRoute();
        (BridgeData memory bridgeData, SwapData[] memory sourceSwaps, StargateData memory stargateData) =
            abi.decode(_withoutSelector(quote.routerCalldata), (BridgeData, SwapData[], StargateData));

        bytes32 destinationExecutor = destinationExecutors[request.destinationChainId];
        if (
            bridgeData.sendingAssetId != address(0) || bridgeData.receiver != address(this)
                || bridgeData.destinationChainId != request.destinationChainId || !bridgeData.hasSourceSwaps
                || !bridgeData.hasDestinationCall || sourceSwaps.length != 1
                || keccak256(bytes(bridgeData.bridge)) != keccak256("stargateV2")
                || keccak256(bytes(bridgeData.integrator)) != keccak256("gardens")
                || sourceSwaps[0].callTo != sourceFeeCollector || sourceSwaps[0].approveTo != sourceFeeCollector
                || sourceSwaps[0].sendingAssetId != address(0) || sourceSwaps[0].receivingAssetId != address(0)
                || sourceSwaps[0].fromAmount != quote.inputAmount || !sourceSwaps[0].requiresDeposit
                || bridgeData.minAmount == 0 || bridgeData.minAmount > quote.inputAmount
                || destinationExecutor == bytes32(0) || stargateData.sendParams.to != destinationExecutor
                || stargateData.assetId != sourceStargateAssetId
                || stargateData.sendParams.amountLD != bridgeData.minAmount
                || stargateData.sendParams.minAmountLD != quote.expectedAmountOut
                || stargateData.refundAddress != address(this)
        ) revert UnboundRoute();

        if (_selector(sourceSwaps[0].callData) != bytes4(keccak256("forwardNativeFees((address,uint256)[])"))) {
            revert UnboundRoute();
        }
        NativeFee[] memory nativeFees = abi.decode(_withoutSelector(sourceSwaps[0].callData), (NativeFee[]));
        if (nativeFees.length != 1 || nativeFees[0].recipient != sourceFeeRecipient || nativeFees[0].amount == 0) {
            revert UnboundRoute();
        }

        (bytes32 transactionId, SwapData[] memory destinationCalls, address residualReceiver) =
            abi.decode(stargateData.sendParams.composeMsg, (bytes32, SwapData[], address));
        if (
            transactionId != bridgeData.transactionId || destinationCalls.length != 1
                || residualReceiver != address(this)
        ) revert UnboundRoute();

        SwapData memory destinationCall = destinationCalls[0];
        bytes memory expectedDestinationCall = abi.encodeCall(
            ISquidGardensRevenueReceiver.receiveTokenRevenue,
            (request.communityKey, request.registryCommunity, quote.destinationToken, quote.expectedAmountOut)
        );
        if (
            destinationCall.callTo != request.destinationReceiver
                || destinationCall.approveTo != request.destinationReceiver
                || destinationCall.sendingAssetId != quote.destinationToken
                || destinationCall.receivingAssetId != quote.destinationToken
                || destinationCall.fromAmount != quote.expectedAmountOut || !destinationCall.requiresDeposit
                || keccak256(destinationCall.callData) != keccak256(expectedDestinationCall)
        ) revert UnboundRoute();
    }

    function _selector(bytes memory data) internal pure returns (bytes4 selector) {
        if (data.length < 4) return bytes4(0);
        assembly {
            selector := mload(add(data, 0x20))
        }
    }

    function _withoutSelector(bytes memory data) internal pure returns (bytes memory result) {
        if (data.length < 4) revert UnboundRoute();
        result = new bytes(data.length - 4);
        for (uint256 i; i < result.length; ++i) {
            result[i] = data[i + 4];
        }
    }
}
