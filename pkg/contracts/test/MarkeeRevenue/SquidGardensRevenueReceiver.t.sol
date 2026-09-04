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

    function test_initialize_revertsOnZeroAddresses() public {
        address implementation = address(new SquidGardensRevenueReceiver());

        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroAddress.selector);
        new ERC1967Proxy(
            implementation, abi.encodeWithSignature("initialize(address,address)", address(0), squidMulticall)
        );

        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroAddress.selector);
        new ERC1967Proxy(implementation, abi.encodeWithSignature("initialize(address,address)", proxyOwner, address(0)));
    }

    function test_setSquidMulticall_revertsOnZeroAddress() public {
        vm.prank(proxyOwner);
        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroAddress.selector);
        receiver.setSquidMulticall(address(0));
    }

    function test_receiveSquidTokenRevenue_revertsOnZeroRegistryCommunity() public {
        vm.prank(squidMulticall);
        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroAddress.selector);
        receiver.receiveSquidTokenRevenue(bytes32(uint256(1)), bytes32(0), address(0), address(token), 1 ether);
    }

    function test_receiveSquidTokenRevenue_revertsOnZeroToken() public {
        MockRegistryCommunity community = new MockRegistryCommunity(address(0x5AFE));
        vm.prank(squidMulticall);
        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroAddress.selector);
        receiver.receiveSquidTokenRevenue(bytes32(uint256(1)), bytes32(0), address(community), address(0), 1 ether);
    }

    function test_receiveSquidTokenRevenue_revertsOnZeroAmount() public {
        MockRegistryCommunity community = new MockRegistryCommunity(address(0x5AFE));
        vm.prank(squidMulticall);
        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroValue.selector);
        receiver.receiveSquidTokenRevenue(bytes32(uint256(1)), bytes32(0), address(community), address(token), 0);
    }

    function test_receiveTokenRevenue_revertsOnZeroRegistryCommunity() public {
        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroAddress.selector);
        receiver.receiveTokenRevenue(bytes32(0), address(0), address(token), 1 ether);
    }

    function test_receiveTokenRevenue_revertsOnZeroToken() public {
        MockRegistryCommunity community = new MockRegistryCommunity(address(0x5AFE));
        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroAddress.selector);
        receiver.receiveTokenRevenue(bytes32(0), address(community), address(0), 1 ether);
    }

    function test_receiveTokenRevenue_revertsOnZeroAmount() public {
        MockRegistryCommunity community = new MockRegistryCommunity(address(0x5AFE));
        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroValue.selector);
        receiver.receiveTokenRevenue(bytes32(0), address(community), address(token), 0);
    }

    function test_receiveTokenRevenue_escrowsOnSafeTransferFailure() public {
        address rejectingSafe = address(0xBAD5AFE2);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        address caller = address(0x11F2);
        token.mint(caller, 1 ether);

        vm.startPrank(caller);
        token.approve(address(receiver), 1 ether);
        receiver.receiveTokenRevenue(keccak256("community"), address(community), address(token), 1 ether);
        vm.stopPrank();

        assertEq(token.balanceOf(address(receiver)), 1 ether);
    }

    function test_receiveSquidRevenue_revertsOnZeroValue() public {
        MockRegistryCommunity community = new MockRegistryCommunity(address(0x5AFE));
        vm.prank(squidMulticall);
        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroValue.selector);
        receiver.receiveSquidRevenue(bytes32(uint256(1)), bytes32(0), address(community));
    }

    function test_receiveSquidRevenue_revertsOnZeroRegistryCommunity() public {
        vm.deal(squidMulticall, 1 ether);
        vm.prank(squidMulticall);
        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroAddress.selector);
        receiver.receiveSquidRevenue{value: 1 ether}(bytes32(uint256(1)), bytes32(0), address(0));
    }

    function test_retryPayout_revertsForUnknownPayout() public {
        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutNotFound.selector);
        receiver.retryPayout(bytes32(uint256(999)));
    }

    function test_retryPayout_revertsIfAlreadyResolved() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, community, 1 ether);

        community.setCouncilSafe(address(0x5AFE));
        receiver.retryPayout(payoutId);

        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutAlreadyResolved.selector);
        receiver.retryPayout(payoutId);
    }

    function test_retryPayout_revertsWhenSafeIsZero() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, community, 1 ether);

        community.setCouncilSafe(address(0));
        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.retryPayout(payoutId);
    }

    function test_retryPayout_revertsIfStillFailing() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, community, 1 ether);

        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.retryPayout(payoutId);
    }

    function test_recoverPayout_deliversToRecipient() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, community, 1 ether);

        address recoveryTarget = address(0xFEE);
        vm.prank(proxyOwner);
        receiver.recoverPayout(payoutId, payable(recoveryTarget));

        assertEq(recoveryTarget.balance, 1 ether);
        (,,, bool resolved) = receiver.failedPayouts(payoutId);
        assertTrue(resolved);
    }

    function test_recoverPayout_revertsForNonOwner() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, community, 1 ether);

        vm.expectRevert();
        receiver.recoverPayout(payoutId, payable(address(0xFEE)));
    }

    function test_recoverPayout_revertsOnZeroAddress() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, community, 1 ether);

        vm.prank(proxyOwner);
        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroAddress.selector);
        receiver.recoverPayout(payoutId, payable(address(0)));
    }

    function test_recoverPayout_revertsForUnknownPayout() public {
        vm.prank(proxyOwner);
        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutNotFound.selector);
        receiver.recoverPayout(bytes32(uint256(999)), payable(address(0xFEE)));
    }

    function test_recoverPayout_revertsIfAlreadyResolved() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, community, 1 ether);

        vm.startPrank(proxyOwner);
        receiver.recoverPayout(payoutId, payable(address(0xFEE)));

        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutAlreadyResolved.selector);
        receiver.recoverPayout(payoutId, payable(address(0xFEE)));
        vm.stopPrank();
    }

    function test_recoverPayout_revertsOnTransferFailure() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, community, 1 ether);

        SquidRejectingSafe badRecoveryTarget = new SquidRejectingSafe();
        vm.prank(proxyOwner);
        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.recoverPayout(payoutId, payable(address(badRecoveryTarget)));
    }

    function test_retryTokenPayout_revertsForUnknownPayout() public {
        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutNotFound.selector);
        receiver.retryTokenPayout(bytes32(uint256(999)));
    }

    function test_retryTokenPayout_revertsIfAlreadyResolved() public {
        address rejectingSafe = address(0xBAD5AFE3);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = bytes32(uint256(6));
        _deliverToken(payoutId, community, 1 ether);

        community.setCouncilSafe(address(0x5AFE));
        receiver.retryTokenPayout(payoutId);

        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutAlreadyResolved.selector);
        receiver.retryTokenPayout(payoutId);
    }

    function test_retryTokenPayout_revertsWhenSafeIsZero() public {
        address rejectingSafe = address(0xBAD5AFE4);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = bytes32(uint256(7));
        _deliverToken(payoutId, community, 1 ether);

        community.setCouncilSafe(address(0));
        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.retryTokenPayout(payoutId);
    }

    function test_retryTokenPayout_revertsIfStillFailing() public {
        address rejectingSafe = address(0xBAD5AFE5);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = bytes32(uint256(8));
        _deliverToken(payoutId, community, 1 ether);

        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.retryTokenPayout(payoutId);
    }

    function test_recoverTokenPayout_revertsOnZeroAddress() public {
        address rejectingSafe = address(0xBAD5AFE6);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = bytes32(uint256(9));
        _deliverToken(payoutId, community, 1 ether);

        vm.prank(proxyOwner);
        vm.expectRevert(ISquidGardensRevenueReceiver.ZeroAddress.selector);
        receiver.recoverTokenPayout(payoutId, address(0));
    }

    function test_recoverTokenPayout_revertsForUnknownPayout() public {
        vm.prank(proxyOwner);
        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutNotFound.selector);
        receiver.recoverTokenPayout(bytes32(uint256(999)), address(0xBEEF));
    }

    function test_recoverTokenPayout_revertsIfAlreadyResolved() public {
        address rejectingSafe = address(0xBAD5AFE7);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = bytes32(uint256(10));
        _deliverToken(payoutId, community, 1 ether);

        vm.startPrank(proxyOwner);
        receiver.recoverTokenPayout(payoutId, address(0xBEEF));

        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutAlreadyResolved.selector);
        receiver.recoverTokenPayout(payoutId, address(0xBEEF));
        vm.stopPrank();
    }

    function test_recoverTokenPayout_revertsOnTransferFailure() public {
        address rejectingSafe = address(0xBAD5AFE8);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = bytes32(uint256(11));
        _deliverToken(payoutId, community, 1 ether);

        address badRecoveryTarget = address(0xBAD5AFE9);
        token.setRejectedRecipient(badRecoveryTarget);
        vm.prank(proxyOwner);
        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.recoverTokenPayout(payoutId, badRecoveryTarget);
    }
}
