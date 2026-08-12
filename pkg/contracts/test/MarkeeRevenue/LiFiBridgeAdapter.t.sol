// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {LiFiBridgeAdapter} from "../../src/MarkeeRevenue/LiFiBridgeAdapter.sol";
import {BridgeRequest} from "../../src/MarkeeRevenue/interfaces/IBridgeAdapter.sol";

contract MockLiFiDiamond {
    uint256 public received;
    bytes public receivedData;

    fallback() external payable {
        received = msg.value;
        receivedData = msg.data;
    }
}

contract LiFiBridgeAdapterTest is Test {
    MockLiFiDiamond internal liFiDiamond;
    LiFiBridgeAdapter internal adapter;
    address internal gardensRouter = address(0xA11CE);

    function setUp() public {
        liFiDiamond = new MockLiFiDiamond();
        adapter = new LiFiBridgeAdapter(gardensRouter, address(liFiDiamond));
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

    function _quote(uint256 expectedAmountOut, uint256 executionValue) internal pure returns (bytes memory) {
        return abi.encode(
            LiFiBridgeAdapter.LiFiQuote({
                inputAmount: 1 ether,
                expectedAmountOut: expectedAmountOut,
                executionValue: executionValue,
                routerCalldata: hex"12345678aabbccdd"
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
        assertEq(liFiDiamond.receivedData(), hex"12345678aabbccdd");
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
}
