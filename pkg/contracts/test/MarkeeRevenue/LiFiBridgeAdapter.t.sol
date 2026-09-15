// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {LiFiBridgeAdapter} from "../../src/MarkeeRevenue/LiFiBridgeAdapter.sol";
import {BridgeRequest} from "../../src/MarkeeRevenue/interfaces/IBridgeAdapter.sol";

contract MockLiFiDiamond {
    uint256 public received;
    bytes public receivedData;
    uint256 public refundAmount;
    bool public shouldRevert;

    function setRefundAmount(uint256 amount) external {
        refundAmount = amount;
    }

    function setShouldRevert(bool value) external {
        shouldRevert = value;
    }

    fallback() external payable {
        if (shouldRevert) revert("lifi route failed");
        received = msg.value;
        receivedData = msg.data;
        uint256 amount = refundAmount;
        if (amount != 0) {
            (bool success,) = payable(msg.sender).call{value: amount}("");
            require(success, "refund failed");
        }
    }
}

// No receive/fallback: any plain ETH transfer to this contract reverts.
contract RejectingRefundRecipient {}

contract LiFiBridgeAdapterTest is Test {
    MockLiFiDiamond internal liFiDiamond;
    LiFiBridgeAdapter internal adapter;
    address internal gardensRouter = address(0xA11CE);
    address internal destinationToken = address(0xD357);
    bytes32 internal destinationExecutor = bytes32(uint256(uint160(address(0xD1A))));
    address internal sourceFeeCollector = address(0xDE1);
    address internal sourceFeeRecipient = address(0xB1D6E);

    function setUp() public {
        liFiDiamond = new MockLiFiDiamond();
        adapter = new LiFiBridgeAdapter(gardensRouter, address(liFiDiamond));
        adapter.setSourceRoute(sourceFeeCollector, sourceFeeRecipient, 13);
        adapter.setDestinationExecutor(100, destinationExecutor);
    }

    function _request(uint256 minAmountOut) internal pure returns (BridgeRequest memory) {
        return BridgeRequest({
            destinationChainId: 100,
            destinationReceiver: address(0xBEEF),
            communityKey: keccak256("community"),
            registryCommunity: address(0xC0DE),
            refundRecipient: address(0xCAFE),
            minAmountOut: minAmountOut
        });
    }

    function _route(uint256 expectedAmountOut, address destinationReceiver) internal view returns (bytes memory) {
        return _routeWithSourceFeeRecipient(expectedAmountOut, destinationReceiver, sourceFeeRecipient);
    }

    function _routeWithSourceFeeRecipient(uint256 expectedAmountOut, address destinationReceiver, address feeRecipient)
        internal
        view
        returns (bytes memory)
    {
        LiFiBridgeAdapter.SwapData[] memory sourceSwaps = new LiFiBridgeAdapter.SwapData[](1);
        sourceSwaps[0] = LiFiBridgeAdapter.SwapData({
            callTo: sourceFeeCollector,
            approveTo: sourceFeeCollector,
            sendingAssetId: address(0),
            receivingAssetId: address(0),
            fromAmount: 1 ether,
            callData: abi.encodeWithSignature(
                "forwardNativeFees((address,uint256)[])", _nativeFees(feeRecipient, 0.01 ether)
            ),
            requiresDeposit: true
        });
        LiFiBridgeAdapter.SwapData[] memory destinationCalls = new LiFiBridgeAdapter.SwapData[](1);
        destinationCalls[0] = LiFiBridgeAdapter.SwapData({
            callTo: destinationReceiver,
            approveTo: destinationReceiver,
            sendingAssetId: destinationToken,
            receivingAssetId: destinationToken,
            fromAmount: expectedAmountOut,
            callData: abi.encodeWithSignature(
                "receiveTokenRevenue(bytes32,address,address,uint256)",
                keccak256("community"),
                address(0xC0DE),
                destinationToken,
                expectedAmountOut
            ),
            requiresDeposit: true
        });
        LiFiBridgeAdapter.BridgeData memory bridgeData = LiFiBridgeAdapter.BridgeData({
            transactionId: keccak256("route"),
            bridge: "stargateV2",
            integrator: "gardens",
            referrer: address(0),
            sendingAssetId: address(0),
            receiver: address(adapter),
            minAmount: 0.95 ether,
            destinationChainId: 100,
            hasSourceSwaps: true,
            hasDestinationCall: true
        });
        LiFiBridgeAdapter.StargateData memory stargateData = LiFiBridgeAdapter.StargateData({
            assetId: 13,
            sendParams: LiFiBridgeAdapter.SendParam({
                dstEid: 30145,
                to: destinationExecutor,
                amountLD: 0.95 ether,
                minAmountLD: expectedAmountOut,
                extraOptions: hex"00",
                composeMsg: abi.encode(keccak256("route"), destinationCalls, address(adapter)),
                oftCmd: hex""
            }),
            fee: LiFiBridgeAdapter.MessagingFee({nativeFee: 0.01 ether, lzTokenFee: 0}),
            refundAddress: payable(address(adapter))
        });
        return abi.encodeWithSelector(bytes4(0xa6010a66), bridgeData, sourceSwaps, stargateData);
    }

    function _nativeFees(address recipient, uint256 amount)
        internal
        pure
        returns (LiFiBridgeAdapter.NativeFee[] memory fees)
    {
        fees = new LiFiBridgeAdapter.NativeFee[](1);
        fees[0] = LiFiBridgeAdapter.NativeFee({recipient: recipient, amount: amount});
    }

    function _quote(uint256 expectedAmountOut, uint256 executionValue) internal view returns (bytes memory) {
        return abi.encode(
            LiFiBridgeAdapter.LiFiQuote({
                inputAmount: 1 ether,
                expectedAmountOut: expectedAmountOut,
                executionValue: executionValue,
                destinationToken: destinationToken,
                routerCalldata: _route(expectedAmountOut, address(0xBEEF))
            })
        );
    }

    function test_bridgeETH_forwardsValueAndCalldata() public {
        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        (, uint256 expectedAmountOut) =
            adapter.bridgeETH{value: 1.01 ether}(_request(0.8 ether), _quote(0.9 ether, 1.01 ether));

        assertEq(expectedAmountOut, 0.9 ether);
        assertEq(liFiDiamond.received(), 1.01 ether);
        assertEq(liFiDiamond.receivedData(), _route(0.9 ether, address(0xBEEF)));
    }

    function test_bridgeETH_refundsRevenueAccruedAfterQuote() public {
        uint256 accruedAfterQuote = 0.001 ether;
        vm.deal(gardensRouter, 1.01 ether + accruedAfterQuote);
        vm.prank(gardensRouter);
        adapter.bridgeETH{value: 1.01 ether + accruedAfterQuote}(_request(0), _quote(0.9 ether, 1.01 ether));

        assertEq(liFiDiamond.received(), 1.01 ether);
        assertEq(address(0xCAFE).balance, accruedAfterQuote);
        assertEq(address(adapter).balance, 0);
    }

    function test_bridgeETH_returnsLiFiNativeRefundToCommunityVault() public {
        uint256 routeRefund = 0.002 ether;
        liFiDiamond.setRefundAmount(routeRefund);
        vm.deal(gardensRouter, 1.01 ether);

        vm.prank(gardensRouter);
        adapter.bridgeETH{value: 1.01 ether}(_request(0), _quote(0.9 ether, 1.01 ether));

        assertEq(address(0xCAFE).balance, routeRefund);
        assertEq(address(adapter).balance, 0);
    }

    function test_bridgeETH_doesNotGivePreexistingBalanceToAnotherCommunityVault() public {
        uint256 unsolicitedBalance = 0.25 ether;
        uint256 routeRefund = 0.002 ether;
        vm.deal(address(adapter), unsolicitedBalance);
        liFiDiamond.setRefundAmount(routeRefund);
        vm.deal(gardensRouter, 1.01 ether);

        vm.prank(gardensRouter);
        adapter.bridgeETH{value: 1.01 ether}(_request(0), _quote(0.9 ether, 1.01 ether));

        assertEq(address(0xCAFE).balance, routeRefund);
        assertEq(address(adapter).balance, unsolicitedBalance);
    }

    function test_bridgeETH_revertsBelowMinimumOutput() public {
        vm.deal(gardensRouter, 1 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(abi.encodeWithSelector(LiFiBridgeAdapter.InsufficientOutput.selector, 0.7 ether, 0.8 ether));
        adapter.bridgeETH{value: 1 ether}(_request(0.8 ether), _quote(0.7 ether, 1 ether));
    }

    function test_bridgeETH_revertsForNonRouter() public {
        vm.expectRevert(LiFiBridgeAdapter.NotRouter.selector);
        adapter.bridgeETH{value: 1 ether}(_request(0), _quote(0.9 ether, 1 ether));
    }

    function test_bridgeETH_revertsWhenExecutionValueIsUnderfunded() public {
        vm.deal(gardensRouter, 1 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(LiFiBridgeAdapter.InvalidQuote.selector);
        adapter.bridgeETH{value: 1 ether}(_request(0), _quote(0.9 ether, 1.01 ether));
    }

    function test_bridgeETH_revertsWhenProviderCalldataIsNotBoundToDestination() public {
        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(LiFiBridgeAdapter.UnboundRoute.selector);
        bytes memory maliciousQuote = abi.encode(
            LiFiBridgeAdapter.LiFiQuote({
                inputAmount: 1 ether,
                expectedAmountOut: 0.9 ether,
                executionValue: 1.01 ether,
                destinationToken: destinationToken,
                routerCalldata: _route(0.9 ether, address(0xBAD))
            })
        );
        adapter.bridgeETH{value: 1.01 ether}(_request(0), maliciousQuote);
    }

    function test_bridgeETH_revertsWhenProviderRedirectsSourceFee() public {
        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(LiFiBridgeAdapter.UnboundRoute.selector);
        bytes memory maliciousQuote = abi.encode(
            LiFiBridgeAdapter.LiFiQuote({
                inputAmount: 1 ether,
                expectedAmountOut: 0.9 ether,
                executionValue: 1.01 ether,
                destinationToken: destinationToken,
                routerCalldata: _routeWithSourceFeeRecipient(0.9 ether, address(0xBEEF), address(0xBAD))
            })
        );
        adapter.bridgeETH{value: 1.01 ether}(_request(0), maliciousQuote);
    }

    function test_constructor_revertsOnZeroLiFiDiamond() public {
        vm.expectRevert(LiFiBridgeAdapter.ZeroAddress.selector);
        new LiFiBridgeAdapter(gardensRouter, address(0));
    }

    function test_setRouter_updatesRouterAndRevertsOnZeroAddress() public {
        adapter.setRouter(address(1));
        assertEq(adapter.router(), address(1));

        vm.expectRevert(LiFiBridgeAdapter.ZeroAddress.selector);
        adapter.setRouter(address(0));
    }

    function test_recoverNative_sendsUnsolicitedBalanceToOwnerSelectedRecipient() public {
        address payable recipient = payable(address(0xFEE));
        vm.deal(address(adapter), 0.25 ether);

        vm.expectEmit(true, false, false, true, address(adapter));
        emit LiFiBridgeAdapter.NativeRecovered(recipient, 0.25 ether);
        adapter.recoverNative(recipient);

        assertEq(recipient.balance, 0.25 ether);
        assertEq(address(adapter).balance, 0);
    }

    function test_recoverNative_revertsForNonOwner() public {
        vm.deal(address(adapter), 1 ether);
        vm.prank(address(0xBAD));
        vm.expectRevert();
        adapter.recoverNative(payable(address(0xFEE)));
    }

    function test_recoverNative_revertsForZeroRecipientOrBalance() public {
        vm.deal(address(adapter), 1 ether);
        vm.expectRevert(LiFiBridgeAdapter.ZeroAddress.selector);
        adapter.recoverNative(payable(address(0)));

        adapter.recoverNative(payable(address(0xFEE)));
        vm.expectRevert(LiFiBridgeAdapter.NoNativeBalance.selector);
        adapter.recoverNative(payable(address(0xFEE)));
    }

    function test_recoverNative_revertsWhenRecipientRejectsTransfer() public {
        RejectingRefundRecipient recipient = new RejectingRefundRecipient();
        vm.deal(address(adapter), 1 ether);

        vm.expectRevert(LiFiBridgeAdapter.RefundFailed.selector);
        adapter.recoverNative(payable(address(recipient)));
    }

    function test_bridgeETH_revertsOnZeroValue() public {
        vm.prank(gardensRouter);
        vm.expectRevert(LiFiBridgeAdapter.ZeroValue.selector);
        adapter.bridgeETH(_request(0), _quote(0.9 ether, 1 ether));
    }

    function test_bridgeETH_revertsOnZeroDestinationReceiver() public {
        BridgeRequest memory request = _request(0);
        request.destinationReceiver = address(0);

        vm.deal(gardensRouter, 1 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(LiFiBridgeAdapter.ZeroAddress.selector);
        adapter.bridgeETH{value: 1 ether}(request, _quote(0.9 ether, 1 ether));
    }

    function test_bridgeETH_revertsOnRefundFailure() public {
        RejectingRefundRecipient badRefund = new RejectingRefundRecipient();
        BridgeRequest memory request = _request(0);
        request.refundRecipient = address(badRefund);

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(LiFiBridgeAdapter.RefundFailed.selector);
        adapter.bridgeETH{value: 1.01 ether}(request, _quote(0.9 ether, 1 ether));
    }

    function test_bridgeETH_revertsOnLiFiCallFailure() public {
        liFiDiamond.setShouldRevert(true);

        vm.deal(gardensRouter, 1 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(
            abi.encodeWithSelector(
                LiFiBridgeAdapter.LiFiCallFailed.selector, abi.encodeWithSignature("Error(string)", "lifi route failed")
            )
        );
        adapter.bridgeETH{value: 1 ether}(_request(0), _quote(0.9 ether, 1 ether));
    }
}
