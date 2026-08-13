// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {SquidGardensRevenueReceiver} from "../../src/MarkeeRevenue/SquidGardensRevenueReceiver.sol";
import {ISquidGardensRevenueReceiver} from "../../src/MarkeeRevenue/interfaces/ISquidGardensRevenueReceiver.sol";
import {MockRegistryCommunity} from "./mocks/MockRegistryCommunity.sol";

contract SquidRejectingSafe {}

contract MockSquidToken is ERC20 {
    address public rejectedRecipient;

    constructor() ERC20("Mock Squid Token", "MST") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setRejectedRecipient(address recipient) external {
        rejectedRecipient = recipient;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (to == rejectedRecipient) return false;
        return super.transfer(to, amount);
    }
}

contract SquidGardensRevenueReceiverTest is Test {
    SquidGardensRevenueReceiver internal receiver;
    address internal proxyOwner = address(0xA11CE);
    address internal squidMulticall = address(0x5A01D);
    MockSquidToken internal token;

    function setUp() public {
        address implementation = address(new SquidGardensRevenueReceiver());
        receiver = SquidGardensRevenueReceiver(
            payable(address(
                    new ERC1967Proxy(
                        implementation,
                        abi.encodeWithSignature("initialize(address,address)", proxyOwner, squidMulticall)
                    )
                ))
        );
        token = new MockSquidToken();
    }

    function _deliverToken(bytes32 payoutId, MockRegistryCommunity community, uint256 amount) internal {
        token.mint(squidMulticall, amount);
        vm.startPrank(squidMulticall);
        token.approve(address(receiver), amount);
        receiver.receiveSquidTokenRevenue(payoutId, keccak256("community"), address(community), address(token), amount);
        vm.stopPrank();
    }

    function _deliver(bytes32 payoutId, MockRegistryCommunity community, uint256 amount) internal {
        vm.deal(squidMulticall, amount);
        vm.prank(squidMulticall);
        receiver.receiveSquidRevenue{value: amount}(payoutId, keccak256("community"), address(community));
    }

    function test_receiveSquidRevenue_deliversNativeCurrencyToLatestSafe() public {
        MockRegistryCommunity community = new MockRegistryCommunity(address(0x5AFE));
        _deliver(bytes32(uint256(1)), community, 1 ether);
        assertEq(address(0x5AFE).balance, 1 ether);
    }

    function test_receiveSquidRevenue_revertsForWrongCaller() public {
        MockRegistryCommunity community = new MockRegistryCommunity(address(0x5AFE));
        vm.expectRevert(ISquidGardensRevenueReceiver.NotSquidMulticall.selector);
        receiver.receiveSquidRevenue{value: 1}(bytes32(uint256(1)), bytes32(0), address(community));
    }

    function test_receiveSquidRevenue_rejectsDuplicatePayout() public {
        MockRegistryCommunity community = new MockRegistryCommunity(address(0x5AFE));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, community, 1 ether);

        vm.deal(squidMulticall, 1 ether);
        vm.prank(squidMulticall);
        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutAlreadyProcessed.selector);
        receiver.receiveSquidRevenue{value: 1 ether}(payoutId, bytes32(0), address(community));
    }

    function test_retryPayout_usesRotatedSafe() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, community, 1 ether);

        address newSafe = address(0x5AFE);
        community.setCouncilSafe(newSafe);
        receiver.retryPayout(payoutId);
        assertEq(newSafe.balance, 1 ether);
    }

    function test_receiveSquidTokenRevenue_deliversTokenToLatestSafe() public {
        address safe = address(0x5AFE);
        MockRegistryCommunity community = new MockRegistryCommunity(safe);

        _deliverToken(bytes32(uint256(2)), community, 1 ether);

        assertEq(token.balanceOf(safe), 1 ether);
        assertEq(token.balanceOf(address(receiver)), 0);
    }

    function test_receiveTokenRevenue_deliversCallerApprovedTokenToLatestSafe() public {
        address safe = address(0x5AFE);
        MockRegistryCommunity community = new MockRegistryCommunity(safe);
        address lifiExecutor = address(0x11F1);
        token.mint(lifiExecutor, 1 ether);

        vm.startPrank(lifiExecutor);
        token.approve(address(receiver), 1 ether);
        receiver.receiveTokenRevenue(keccak256("community"), address(community), address(token), 1 ether);
        vm.stopPrank();

        assertEq(token.balanceOf(safe), 1 ether);
        assertEq(token.balanceOf(address(receiver)), 0);
        assertEq(receiver.tokenRevenueNonce(), 1);
    }

    function test_receiveTokenRevenue_cannotSpendExistingReceiverBalance() public {
        MockRegistryCommunity community = new MockRegistryCommunity(address(0x5AFE));
        token.mint(address(receiver), 1 ether);

        vm.expectRevert();
        receiver.receiveTokenRevenue(keccak256("community"), address(community), address(token), 1 ether);

        assertEq(token.balanceOf(address(receiver)), 1 ether);
        assertEq(token.balanceOf(address(0x5AFE)), 0);
    }

    function test_receiveSquidTokenRevenue_rejectsDuplicateNativePayoutId() public {
        MockRegistryCommunity community = new MockRegistryCommunity(address(0x5AFE));
        bytes32 payoutId = bytes32(uint256(3));
        _deliver(payoutId, community, 1 ether);

        token.mint(squidMulticall, 1 ether);
        vm.startPrank(squidMulticall);
        token.approve(address(receiver), 1 ether);
        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutAlreadyProcessed.selector);
        receiver.receiveSquidTokenRevenue(payoutId, bytes32(0), address(community), address(token), 1 ether);
        vm.stopPrank();
    }

    function test_retryTokenPayout_usesRotatedSafe() public {
        address rejectingSafe = address(0xBAD5AFE);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = bytes32(uint256(4));
        _deliverToken(payoutId, community, 1 ether);
        assertEq(token.balanceOf(address(receiver)), 1 ether);

        address newSafe = address(0x5AFE);
        community.setCouncilSafe(newSafe);
        receiver.retryTokenPayout(payoutId);

        assertEq(token.balanceOf(newSafe), 1 ether);
        (,,,, bool resolved) = receiver.failedTokenPayouts(payoutId);
        assertTrue(resolved);
    }

    function test_recoverTokenPayout_onlyOwner() public {
        address rejectingSafe = address(0xBAD5AFE);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = bytes32(uint256(5));
        _deliverToken(payoutId, community, 1 ether);

        vm.expectRevert();
        receiver.recoverTokenPayout(payoutId, address(0xBEEF));

        vm.prank(proxyOwner);
        receiver.recoverTokenPayout(payoutId, address(0xBEEF));
        assertEq(token.balanceOf(address(0xBEEF)), 1 ether);
    }

    function test_setSquidMulticall_onlyOwner() public {
        vm.expectRevert();
        receiver.setSquidMulticall(address(0xBEEF));

        vm.prank(proxyOwner);
        receiver.setSquidMulticall(address(0xBEEF));
        assertEq(receiver.squidMulticall(), address(0xBEEF));
    }
}
