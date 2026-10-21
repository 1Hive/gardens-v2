// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;
import {Test} from "forge-std/Test.sol";
import {LiFiRelayBridgeAdapter} from "../src/MarkeeRevenue/LiFiRelayBridgeAdapter.sol";
import {LiFiBridgeAdapter} from "../src/MarkeeRevenue/LiFiBridgeAdapter.sol";
import {BridgeRequest} from "../src/MarkeeRevenue/interfaces/IBridgeAdapter.sol";

contract RelayDiamondMock {
    bool public fail;

    function setFail(bool value) external {
        fail = value;
    }

    fallback() external payable {
        require(!fail, "failed");
    }
}

contract LiFiRelayBridgeAdapterTest is Test {
    LiFiRelayBridgeAdapter adapter;
    RelayDiamondMock diamond;
    BridgeRequest request;
    LiFiBridgeAdapter.BridgeData bridge;
    LiFiBridgeAdapter.SwapData[] swaps;
    LiFiRelayBridgeAdapter.RelayData relay;
    address constant COMMUNITY = address(0xC);
    address constant VAULT = address(0xD);

    function setUp() public {
        diamond = new RelayDiamondMock();
        adapter = new LiFiRelayBridgeAdapter(
            address(this), address(diamond), address(0xE), address(0xF), address(0xAA), address(0xBB)
        );
        adapter.setCommunityVault(COMMUNITY, VAULT);
        request = BridgeRequest(
            100, address(0xE), keccak256(abi.encode(uint256(100), COMMUNITY)), COMMUNITY, address(0x123), 0.98 ether
        );
        bridge = LiFiBridgeAdapter.BridgeData(
            bytes32(uint256(1)),
            "relaydepository",
            "gardens",
            address(0),
            address(0),
            VAULT,
            0.99 ether,
            100,
            true,
            false
        );
        LiFiBridgeAdapter.NativeFee[] memory fees = new LiFiBridgeAdapter.NativeFee[](1);
        fees[0] = LiFiBridgeAdapter.NativeFee(address(0xBB), 0.01 ether);
        swaps.push(
            LiFiBridgeAdapter.SwapData(
                address(0xAA),
                address(0xAA),
                address(0),
                address(0),
                1 ether,
                abi.encodeWithSignature("forwardNativeFees((address,uint256)[])", fees),
                true
            )
        );
        relay = LiFiRelayBridgeAdapter.RelayData(bytes32(uint256(2)), address(adapter));
        vm.deal(address(this), 10 ether);
    }

    function quote() internal view returns (bytes memory) {
        return abi.encode(
            LiFiBridgeAdapter.LiFiQuote(
                1 ether,
                0.98 ether,
                1 ether,
                address(0xF),
                abi.encodeWithSelector(bytes4(0xa3443faa), bridge, swaps, relay)
            )
        );
    }

    function testValidRouteAndRefundOnlyCurrentValue() public {
        vm.deal(address(adapter), 2 ether);
        adapter.bridgeETH{value: 1.1 ether}(request, quote());
        assertEq(address(diamond).balance, 1 ether);
        assertEq(address(adapter).balance, 2 ether);
        assertEq(address(0x123).balance, 0.1 ether);
        assertTrue(adapter.usedOrders(relay.orderId));
    }

    function testReplayRejected() public {
        adapter.bridgeETH{value: 1 ether}(request, quote());
        vm.expectRevert(LiFiRelayBridgeAdapter.InvalidRoute.selector);
        adapter.bridgeETH{value: 1 ether}(request, quote());
    }

    function testOnlyRouter() public {
        bytes memory q = quote();
        vm.prank(address(0xBAD));
        vm.expectRevert(LiFiRelayBridgeAdapter.NotRouter.selector);
        adapter.bridgeETH(request, q);
    }

    function testRejectWrongVault() public {
        bridge.receiver = address(0xBAD);
        reject();
    }

    function testRejectDestinationHook() public {
        bridge.hasDestinationCall = true;
        reject();
    }

    function testRejectWrongDepositor() public {
        relay.depositorAddress = address(0xBAD);
        reject();
    }

    function testRejectWrongChain() public {
        bridge.destinationChainId = 1;
        reject();
    }

    function testRejectArbitrarySourceCall() public {
        swaps[0].callTo = address(0xBAD);
        reject();
    }

    function testRejectMismatchedCommunity() public {
        request.registryCommunity = address(0xBAD);
        reject();
    }

    function testRejectBelowMinimum() public {
        request.minAmountOut = 1 ether;
        reject();
    }

    function testRejectRedirectedFee() public {
        LiFiBridgeAdapter.NativeFee[] memory fees = new LiFiBridgeAdapter.NativeFee[](1);
        fees[0] = LiFiBridgeAdapter.NativeFee(address(0xBAD), 0.01 ether);
        swaps[0].callData = abi.encodeWithSignature("forwardNativeFees((address,uint256)[])", fees);
        reject();
    }

    function testRejectExcessiveSourceFee() public {
        LiFiBridgeAdapter.NativeFee[] memory fees = new LiFiBridgeAdapter.NativeFee[](1);
        fees[0] = LiFiBridgeAdapter.NativeFee(address(0xBB), 0.06 ether);
        swaps[0].callData = abi.encodeWithSignature("forwardNativeFees((address,uint256)[])", fees);
        bridge.minAmount = 0.94 ether;
        reject();
    }

    function testOnlyOwnerCanRecoverDelayedRefunds() public {
        vm.deal(address(adapter), 1 ether);
        vm.prank(address(0xBAD));
        vm.expectRevert("Ownable: caller is not the owner");
        adapter.recoverNative(payable(address(0x123)));
        adapter.recoverNative(payable(address(0x123)));
        assertEq(address(0x123).balance, 1 ether);
    }

    function testRouteFailureAllowsRetry() public {
        diamond.setFail(true);
        reject();
        assertFalse(adapter.usedOrders(relay.orderId));
        diamond.setFail(false);
        adapter.bridgeETH{value: 1 ether}(request, quote());
    }

    function reject() internal {
        bytes memory q = quote();
        vm.expectRevert(LiFiRelayBridgeAdapter.InvalidRoute.selector);
        adapter.bridgeETH{value: 1 ether}(request, q);
    }
}
