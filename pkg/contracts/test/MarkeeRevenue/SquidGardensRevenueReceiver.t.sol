// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {SquidGardensRevenueReceiver} from "../../src/MarkeeRevenue/SquidGardensRevenueReceiver.sol";
import {ISquidGardensRevenueReceiver} from "../../src/MarkeeRevenue/interfaces/ISquidGardensRevenueReceiver.sol";
import {MockRegistryCommunity} from "./mocks/MockRegistryCommunity.sol";

contract SquidRejectingSafe {}

contract RevertingRegistryCommunity {
    function councilSafe() external pure returns (address) {
        revert("registry unavailable");
    }
}

contract SwitchableRegistryCommunity {
    address internal safe;
    bool internal unavailable;

    constructor(address initialSafe) {
        safe = initialSafe;
    }

    function setCouncilSafe(address newSafe) external {
        safe = newSafe;
    }

    function setUnavailable(bool isUnavailable) external {
        unavailable = isUnavailable;
    }

    function councilSafe() external view returns (address) {
        if (unavailable) revert("registry unavailable");
        return safe;
    }
}

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

    function _effectivePayoutId(
        uint256 nonce,
        bytes32 suppliedPayoutId,
        bytes32 communityKey,
        address registryCommunity,
        address payoutToken,
        uint256 amount
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                block.chainid,
                address(receiver),
                nonce,
                squidMulticall,
                suppliedPayoutId,
                communityKey,
                registryCommunity,
                payoutToken,
                amount
            )
        );
    }

    function _deliverToken(bytes32 payoutId, MockRegistryCommunity community, uint256 amount)
        internal
        returns (bytes32 effectivePayoutId)
    {
        effectivePayoutId = _effectivePayoutId(
            receiver.tokenRevenueNonce(), payoutId, keccak256("community"), address(community), address(token), amount
        );
        token.mint(squidMulticall, amount);
        vm.startPrank(squidMulticall);
        token.approve(address(receiver), amount);
        receiver.receiveSquidTokenRevenue(payoutId, keccak256("community"), address(community), address(token), amount);
        vm.stopPrank();
    }

    function _deliver(bytes32 payoutId, MockRegistryCommunity community, uint256 amount)
        internal
        returns (bytes32 effectivePayoutId)
    {
        effectivePayoutId = _effectivePayoutId(
            receiver.tokenRevenueNonce(), payoutId, keccak256("community"), address(community), address(0), amount
        );
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

    function test_receiveSquidRevenue_escrowsWhenCouncilSafeLookupReverts() public {
        RevertingRegistryCommunity community = new RevertingRegistryCommunity();
        bytes32 suppliedPayoutId = bytes32(uint256(11));
        bytes32 communityKey = keccak256("community");
        uint256 amount = 1 ether;
        bytes32 effectivePayoutId = _effectivePayoutId(
            receiver.tokenRevenueNonce(), suppliedPayoutId, communityKey, address(community), address(0), amount
        );

        vm.deal(squidMulticall, amount);
        vm.prank(squidMulticall);
        receiver.receiveSquidRevenue{value: amount}(suppliedPayoutId, communityKey, address(community));

        (bytes32 storedCommunityKey, address storedCommunity, uint256 storedAmount, bool resolved) =
            receiver.failedPayouts(effectivePayoutId);
        assertEq(storedCommunityKey, communityKey);
        assertEq(storedCommunity, address(community));
        assertEq(storedAmount, amount);
        assertFalse(resolved);
        assertEq(address(receiver).balance, amount);
    }

    function test_receiveSquidRevenue_collisionCannotBlockLegitimatePayout() public {
        MockRegistryCommunity community = new MockRegistryCommunity(address(0x5AFE));
        bytes32 payoutId = _deliver(bytes32(uint256(1)), community, 1 ether);

        _deliver(payoutId, community, 1 ether);

        assertEq(address(0x5AFE).balance, 2 ether);
        assertEq(receiver.tokenRevenueNonce(), 2);
    }

    function test_retryPayout_usesRotatedSafe() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = _deliver(bytes32(uint256(1)), community, 1 ether);

        address newSafe = address(0x5AFE);
        community.setCouncilSafe(newSafe);
        receiver.retryPayout(payoutId);
        assertEq(newSafe.balance, 1 ether);
    }

    function test_retryPayout_preservesEscrowUntilCouncilSafeLookupRecovers() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        SwitchableRegistryCommunity community = new SwitchableRegistryCommunity(address(rejectingSafe));
        bytes32 suppliedPayoutId = bytes32(uint256(13));
        bytes32 communityKey = keccak256("community");
        uint256 amount = 1 ether;
        bytes32 payoutId = _effectivePayoutId(
            receiver.tokenRevenueNonce(), suppliedPayoutId, communityKey, address(community), address(0), amount
        );

        vm.deal(squidMulticall, amount);
        vm.prank(squidMulticall);
        receiver.receiveSquidRevenue{value: amount}(suppliedPayoutId, communityKey, address(community));

        community.setUnavailable(true);
        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.retryPayout(payoutId);
        (,,, bool resolvedWhileUnavailable) = receiver.failedPayouts(payoutId);
        assertFalse(resolvedWhileUnavailable);
        assertEq(address(receiver).balance, amount);

        address newSafe = address(0x5AFE);
        community.setUnavailable(false);
        community.setCouncilSafe(newSafe);
        receiver.retryPayout(payoutId);

        (,,, bool resolved) = receiver.failedPayouts(payoutId);
        assertTrue(resolved);
        assertEq(newSafe.balance, amount);
    }

    function test_receiveSquidTokenRevenue_deliversTokenToLatestSafe() public {
        address safe = address(0x5AFE);
        MockRegistryCommunity community = new MockRegistryCommunity(safe);

        _deliverToken(bytes32(uint256(2)), community, 1 ether);

        assertEq(token.balanceOf(safe), 1 ether);
        assertEq(token.balanceOf(address(receiver)), 0);
    }

    function test_receiveSquidTokenRevenue_escrowsWhenCouncilSafeLookupReverts() public {
        RevertingRegistryCommunity community = new RevertingRegistryCommunity();
        bytes32 suppliedPayoutId = bytes32(uint256(12));
        bytes32 communityKey = keccak256("community");
        uint256 amount = 1 ether;
        bytes32 effectivePayoutId = _effectivePayoutId(
            receiver.tokenRevenueNonce(), suppliedPayoutId, communityKey, address(community), address(token), amount
        );

        token.mint(squidMulticall, amount);
        vm.startPrank(squidMulticall);
        token.approve(address(receiver), amount);
        receiver.receiveSquidTokenRevenue(suppliedPayoutId, communityKey, address(community), address(token), amount);
        vm.stopPrank();

        (
            bytes32 storedCommunityKey,
            address storedCommunity,
            address storedToken,
            uint256 storedAmount,
            bool resolved
        ) = receiver.failedTokenPayouts(effectivePayoutId);
        assertEq(storedCommunityKey, communityKey);
        assertEq(storedCommunity, address(community));
        assertEq(storedToken, address(token));
        assertEq(storedAmount, amount);
        assertFalse(resolved);
        assertEq(token.balanceOf(address(receiver)), amount);
    }

    function test_receiveTokenRevenue_escrowsWhenCouncilSafeLookupReverts() public {
        RevertingRegistryCommunity community = new RevertingRegistryCommunity();
        bytes32 communityKey = keccak256("community");
        address lifiExecutor = address(0x11F1);
        uint256 amount = 1 ether;
        token.mint(lifiExecutor, amount);

        vm.startPrank(lifiExecutor);
        token.approve(address(receiver), amount);
        receiver.receiveTokenRevenue(communityKey, address(community), address(token), amount);
        vm.stopPrank();

        assertEq(token.balanceOf(address(receiver)), amount);
        assertEq(receiver.tokenRevenueNonce(), 1);
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

    function test_receiveSquidTokenRevenue_nativeIdCollisionCannotBlockTokenPayout() public {
        MockRegistryCommunity community = new MockRegistryCommunity(address(0x5AFE));
        bytes32 payoutId = bytes32(uint256(3));
        _deliver(payoutId, community, 1 ether);

        token.mint(squidMulticall, 1 ether);
        vm.startPrank(squidMulticall);
        token.approve(address(receiver), 1 ether);
        receiver.receiveSquidTokenRevenue(payoutId, bytes32(0), address(community), address(token), 1 ether);
        vm.stopPrank();

        assertEq(token.balanceOf(address(0x5AFE)), 1 ether);
        assertEq(receiver.tokenRevenueNonce(), 2);
    }

    function test_receiveSquidRevenue_collisionCannotOverwriteFailedPayout() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 suppliedPayoutId = bytes32(uint256(44));
        bytes32 firstId = _deliver(suppliedPayoutId, community, 1 ether);
        bytes32 secondId = _deliver(suppliedPayoutId, community, 2 ether);

        (,, uint256 firstAmount,) = receiver.failedPayouts(firstId);
        (,, uint256 secondAmount,) = receiver.failedPayouts(secondId);

        assertEq(firstAmount, 1 ether);
        assertEq(secondAmount, 2 ether);
    }

    function test_retryTokenPayout_usesRotatedSafe() public {
        address rejectingSafe = address(0xBAD5AFE);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = _deliverToken(bytes32(uint256(4)), community, 1 ether);
        assertEq(token.balanceOf(address(receiver)), 1 ether);

        address newSafe = address(0x5AFE);
        community.setCouncilSafe(newSafe);
        receiver.retryTokenPayout(payoutId);

        assertEq(token.balanceOf(newSafe), 1 ether);
        (,,,, bool resolved) = receiver.failedTokenPayouts(payoutId);
        assertTrue(resolved);
    }

    function test_retryTokenPayout_preservesEscrowUntilCouncilSafeLookupRecovers() public {
        address rejectingSafe = address(0xBAD5AFE3);
        token.setRejectedRecipient(rejectingSafe);
        SwitchableRegistryCommunity community = new SwitchableRegistryCommunity(rejectingSafe);
        bytes32 suppliedPayoutId = bytes32(uint256(14));
        bytes32 communityKey = keccak256("community");
        uint256 amount = 1 ether;
        bytes32 payoutId = _effectivePayoutId(
            receiver.tokenRevenueNonce(), suppliedPayoutId, communityKey, address(community), address(token), amount
        );

        token.mint(squidMulticall, amount);
        vm.startPrank(squidMulticall);
        token.approve(address(receiver), amount);
        receiver.receiveSquidTokenRevenue(suppliedPayoutId, communityKey, address(community), address(token), amount);
        vm.stopPrank();

        community.setUnavailable(true);
        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.retryTokenPayout(payoutId);
        (,,,, bool resolvedWhileUnavailable) = receiver.failedTokenPayouts(payoutId);
        assertFalse(resolvedWhileUnavailable);
        assertEq(token.balanceOf(address(receiver)), amount);

        address newSafe = address(0x5AFE);
        community.setUnavailable(false);
        community.setCouncilSafe(newSafe);
        receiver.retryTokenPayout(payoutId);

        (,,,, bool resolved) = receiver.failedTokenPayouts(payoutId);
        assertTrue(resolved);
        assertEq(token.balanceOf(newSafe), amount);
    }

    function test_recoverTokenPayout_onlyOwner() public {
        address rejectingSafe = address(0xBAD5AFE);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = _deliverToken(bytes32(uint256(5)), community, 1 ether);

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
        bytes32 payoutId = _deliver(bytes32(uint256(1)), community, 1 ether);

        community.setCouncilSafe(address(0x5AFE));
        receiver.retryPayout(payoutId);

        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutAlreadyResolved.selector);
        receiver.retryPayout(payoutId);
    }

    function test_retryPayout_revertsWhenSafeIsZero() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = _deliver(bytes32(uint256(1)), community, 1 ether);

        community.setCouncilSafe(address(0));
        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.retryPayout(payoutId);
    }

    function test_retryPayout_revertsIfStillFailing() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = _deliver(bytes32(uint256(1)), community, 1 ether);

        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.retryPayout(payoutId);
    }

    function test_recoverPayout_deliversToRecipient() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = _deliver(bytes32(uint256(1)), community, 1 ether);

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
        bytes32 payoutId = _deliver(bytes32(uint256(1)), community, 1 ether);

        vm.expectRevert();
        receiver.recoverPayout(payoutId, payable(address(0xFEE)));
    }

    function test_recoverPayout_revertsOnZeroAddress() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = _deliver(bytes32(uint256(1)), community, 1 ether);

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
        bytes32 payoutId = _deliver(bytes32(uint256(1)), community, 1 ether);

        vm.startPrank(proxyOwner);
        receiver.recoverPayout(payoutId, payable(address(0xFEE)));

        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutAlreadyResolved.selector);
        receiver.recoverPayout(payoutId, payable(address(0xFEE)));
        vm.stopPrank();
    }

    function test_recoverPayout_revertsOnTransferFailure() public {
        SquidRejectingSafe rejectingSafe = new SquidRejectingSafe();
        MockRegistryCommunity community = new MockRegistryCommunity(address(rejectingSafe));
        bytes32 payoutId = _deliver(bytes32(uint256(1)), community, 1 ether);

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
        bytes32 payoutId = _deliverToken(bytes32(uint256(6)), community, 1 ether);

        community.setCouncilSafe(address(0x5AFE));
        receiver.retryTokenPayout(payoutId);

        vm.expectRevert(ISquidGardensRevenueReceiver.PayoutAlreadyResolved.selector);
        receiver.retryTokenPayout(payoutId);
    }

    function test_retryTokenPayout_revertsWhenSafeIsZero() public {
        address rejectingSafe = address(0xBAD5AFE4);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = _deliverToken(bytes32(uint256(7)), community, 1 ether);

        community.setCouncilSafe(address(0));
        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.retryTokenPayout(payoutId);
    }

    function test_retryTokenPayout_revertsIfStillFailing() public {
        address rejectingSafe = address(0xBAD5AFE5);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = _deliverToken(bytes32(uint256(8)), community, 1 ether);

        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.retryTokenPayout(payoutId);
    }

    function test_recoverTokenPayout_revertsOnZeroAddress() public {
        address rejectingSafe = address(0xBAD5AFE6);
        token.setRejectedRecipient(rejectingSafe);
        MockRegistryCommunity community = new MockRegistryCommunity(rejectingSafe);
        bytes32 payoutId = _deliverToken(bytes32(uint256(9)), community, 1 ether);

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
        bytes32 payoutId = _deliverToken(bytes32(uint256(10)), community, 1 ether);

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
        bytes32 payoutId = _deliverToken(bytes32(uint256(11)), community, 1 ether);

        address badRecoveryTarget = address(0xBAD5AFE9);
        token.setRejectedRecipient(badRecoveryTarget);
        vm.prank(proxyOwner);
        vm.expectRevert(ISquidGardensRevenueReceiver.TransferFailed.selector);
        receiver.recoverTokenPayout(payoutId, badRecoveryTarget);
    }
}
