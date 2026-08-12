// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {SquidBridgeAdapter} from "../../src/MarkeeRevenue/SquidBridgeAdapter.sol";
import {BridgeRequest} from "../../src/MarkeeRevenue/interfaces/IBridgeAdapter.sol";

contract MockCanonicalSquidRouter {
    uint256 public received;
    bytes public receivedData;

    fallback() external payable {
        received = msg.value;
        receivedData = msg.data;
    }
}

contract SquidBridgeAdapterTest is Test {
    MockCanonicalSquidRouter internal squidRouter;
    SquidBridgeAdapter internal adapter;
    address internal gardensRouter = address(0xA11CE);

    function setUp() public {
        squidRouter = new MockCanonicalSquidRouter();
        adapter = new SquidBridgeAdapter(gardensRouter, address(squidRouter));
    }

    function _request(uint256 minAmountOut) internal pure returns (BridgeRequest memory) {
        return BridgeRequest({
            destinationChainId: 10,
            destinationReceiver: address(0xBEEF),
            communityKey: keccak256("community"),
            registryCommunity: address(0xC0DE),
            refundRecipient: address(0xCAFE),
            minAmountOut: minAmountOut
        });
    }

    function test_bridgeETH_forwardsValueAndSquidCalldata() public {
        bytes memory routerCalldata = hex"12345678aabbccdd";
        bytes memory quoteData = abi.encode(
            SquidBridgeAdapter.SquidQuote({
                inputAmount: 1 ether,
                expectedAmountOut: 0.9 ether,
                executionValue: 1.01 ether,
                routerCalldata: routerCalldata
            })
        );

        vm.deal(gardensRouter, 1.01 ether);
        vm.prank(gardensRouter);
        (, uint256 expectedAmountOut) = adapter.bridgeETH{value: 1.01 ether}(_request(0.8 ether), quoteData);

        assertEq(expectedAmountOut, 0.9 ether);
        assertEq(squidRouter.received(), 1.01 ether);
        assertEq(squidRouter.receivedData(), routerCalldata);
    }

    function test_bridgeETH_revertsBelowMinimumOutput() public {
        bytes memory quoteData = abi.encode(
            SquidBridgeAdapter.SquidQuote({
                inputAmount: 1 ether,
                expectedAmountOut: 0.7 ether,
                executionValue: 1 ether,
                routerCalldata: hex"12345678"
            })
        );

        vm.deal(gardensRouter, 1 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(abi.encodeWithSelector(SquidBridgeAdapter.InsufficientOutput.selector, 0.7 ether, 0.8 ether));
        adapter.bridgeETH{value: 1 ether}(_request(0.8 ether), quoteData);
    }

    function test_bridgeETH_revertsForNonRouter() public {
        bytes memory quoteData = abi.encode(
            SquidBridgeAdapter.SquidQuote({
                inputAmount: 1 ether,
                expectedAmountOut: 0.9 ether,
                executionValue: 1 ether,
                routerCalldata: hex"12345678"
            })
        );
        vm.expectRevert(SquidBridgeAdapter.NotRouter.selector);
        adapter.bridgeETH{value: 1 ether}(_request(0), quoteData);
    }

    function test_bridgeETH_revertsWhenExecutionValueIsUnderfunded() public {
        bytes memory quoteData = abi.encode(
            SquidBridgeAdapter.SquidQuote({
                inputAmount: 1 ether,
                expectedAmountOut: 0.9 ether,
                executionValue: 1.01 ether,
                routerCalldata: hex"12345678"
            })
        );

        vm.deal(gardensRouter, 1 ether);
        vm.prank(gardensRouter);
        vm.expectRevert(SquidBridgeAdapter.InvalidQuote.selector);
        adapter.bridgeETH{value: 1 ether}(_request(0), quoteData);
    }

    function test_bridgeETH_refundsRevenueAccruedAfterQuote() public {
        bytes memory quoteData = abi.encode(
            SquidBridgeAdapter.SquidQuote({
                inputAmount: 1 ether,
                expectedAmountOut: 0.9 ether,
                executionValue: 1.01 ether,
                routerCalldata: hex"12345678"
            })
        );

        uint256 accruedAfterQuote = 0.001 ether;
        vm.deal(gardensRouter, 1.01 ether + accruedAfterQuote);
        vm.prank(gardensRouter);
        adapter.bridgeETH{value: 1.01 ether + accruedAfterQuote}(_request(0), quoteData);

        assertEq(squidRouter.received(), 1.01 ether);
        assertEq(address(0xCAFE).balance, accruedAfterQuote);
        assertEq(address(adapter).balance, 0);
    }
}
