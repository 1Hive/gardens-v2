// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {GardensRevenueReceiver} from "../../src/MarkeeRevenue/GardensRevenueReceiver.sol";
import {IGardensRevenueReceiver} from "../../src/MarkeeRevenue/interfaces/IGardensRevenueReceiver.sol";
import {MockRegistryCommunity} from "./mocks/MockRegistryCommunity.sol";

contract RejectingReceiver {
    // No receive/fallback: any plain ETH transfer to this contract reverts.

    }

contract GardensRevenueReceiverTest is Test {
    GardensRevenueReceiver internal receiver;
    address internal proxyOwner = address(0xA11CE);
    address internal squidExecutor = address(0x5921D);

    function setUp() public {
        address implementation = address(new GardensRevenueReceiver());
        address proxy = address(
            new ERC1967Proxy(
                implementation, abi.encodeWithSelector(GardensRevenueReceiver.initialize.selector, proxyOwner)
            )
        );
        receiver = GardensRevenueReceiver(payable(proxy));

        vm.prank(proxyOwner);
        receiver.setSquidExecutor(squidExecutor);
    }

    function _deliver(bytes32 payoutId, MockRegistryCommunity registryCommunity, uint256 amount) internal {
        vm.deal(squidExecutor, amount);
        vm.prank(squidExecutor);
        receiver.onReceive{value: amount}(payoutId, keccak256("key"), address(registryCommunity), amount);
    }

    function test_onReceive_revertsWhenExecutorUnset() public {
        address implementation = address(new GardensRevenueReceiver());
        address proxy = address(
            new ERC1967Proxy(
                implementation, abi.encodeWithSelector(GardensRevenueReceiver.initialize.selector, proxyOwner)
            )
        );
        GardensRevenueReceiver fresh = GardensRevenueReceiver(payable(proxy));

        vm.expectRevert(IGardensRevenueReceiver.NotSquidExecutor.selector);
        fresh.onReceive(bytes32(uint256(1)), bytes32(uint256(2)), address(0xC0DE), 0);
    }

    function test_onReceive_revertsForWrongCaller() public {
        vm.expectRevert(IGardensRevenueReceiver.NotSquidExecutor.selector);
        receiver.onReceive(bytes32(uint256(1)), bytes32(uint256(2)), address(0xC0DE), 0);
    }

    function test_onReceive_revertsOnValueMismatch() public {
        vm.deal(squidExecutor, 1 ether);
        vm.prank(squidExecutor);
        vm.expectRevert(IGardensRevenueReceiver.ValueMismatch.selector);
        receiver.onReceive{value: 1 ether}(bytes32(uint256(1)), bytes32(uint256(2)), address(0xC0DE), 0.5 ether);
    }

    function test_onReceive_deliversToCouncilSafe() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0x5AFE1));
        bytes32 payoutId = bytes32(uint256(1));

        _deliver(payoutId, registryCommunity, 1 ether);

        assertEq(address(0x5AFE1).balance, 1 ether);
        (,,, bool resolved) = receiver.failedPayouts(payoutId);
        assertFalse(resolved);
    }

    function test_onReceive_revertsOnDuplicatePayoutId() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0x5AFE1));
        bytes32 payoutId = bytes32(uint256(1));

        _deliver(payoutId, registryCommunity, 1 ether);

        vm.deal(squidExecutor, 1 ether);
        vm.prank(squidExecutor);
        vm.expectRevert(IGardensRevenueReceiver.PayoutAlreadyProcessed.selector);
        receiver.onReceive{value: 1 ether}(payoutId, keccak256("key"), address(registryCommunity), 1 ether);
    }

    function test_onReceive_escrowsOnSafeTransferFailure() public {
        RejectingReceiver badSafe = new RejectingReceiver();
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(badSafe));
        bytes32 payoutId = bytes32(uint256(1));

        _deliver(payoutId, registryCommunity, 1 ether);

        (bytes32 communityKey, address regCommunity, uint256 amount, bool resolved) = receiver.failedPayouts(payoutId);
        assertEq(communityKey, keccak256("key"));
        assertEq(regCommunity, address(registryCommunity));
        assertEq(amount, 1 ether);
        assertFalse(resolved);
        assertEq(address(receiver).balance, 1 ether);
    }

    function test_retryPayout_succeedsAfterSafeRotation() public {
        RejectingReceiver badSafe = new RejectingReceiver();
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(badSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, registryCommunity, 1 ether);

        address newSafe = address(0x5AFE2);
        registryCommunity.setCouncilSafe(newSafe);

        receiver.retryPayout(payoutId);

        assertEq(newSafe.balance, 1 ether);
        (,,, bool resolved) = receiver.failedPayouts(payoutId);
        assertTrue(resolved);
    }

    function test_retryPayout_revertsForUnknownPayout() public {
        vm.expectRevert(IGardensRevenueReceiver.PayoutNotFound.selector);
        receiver.retryPayout(bytes32(uint256(999)));
    }

    function test_retryPayout_revertsIfAlreadyResolved() public {
        RejectingReceiver badSafe = new RejectingReceiver();
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(badSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, registryCommunity, 1 ether);

        registryCommunity.setCouncilSafe(address(0x5AFE2));
        receiver.retryPayout(payoutId);

        vm.expectRevert(IGardensRevenueReceiver.PayoutAlreadyResolved.selector);
        receiver.retryPayout(payoutId);
    }

    function test_retryPayout_revertsIfStillFailing() public {
        RejectingReceiver badSafe = new RejectingReceiver();
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(badSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, registryCommunity, 1 ether);

        vm.expectRevert(IGardensRevenueReceiver.TransferFailed.selector);
        receiver.retryPayout(payoutId);
    }

    function test_recoverPayout_onlyOwnerAndScopedToUnresolvedEntries() public {
        RejectingReceiver badSafe = new RejectingReceiver();
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(badSafe));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, registryCommunity, 1 ether);

        address recoveryTarget = address(0xFEE);

        vm.expectRevert();
        receiver.recoverPayout(payoutId, payable(recoveryTarget));

        vm.prank(proxyOwner);
        receiver.recoverPayout(payoutId, payable(recoveryTarget));
        assertEq(recoveryTarget.balance, 1 ether);

        vm.prank(proxyOwner);
        vm.expectRevert(IGardensRevenueReceiver.PayoutAlreadyResolved.selector);
        receiver.recoverPayout(payoutId, payable(recoveryTarget));

        vm.prank(proxyOwner);
        vm.expectRevert(IGardensRevenueReceiver.PayoutNotFound.selector);
        receiver.recoverPayout(bytes32(uint256(999)), payable(recoveryTarget));
    }
}
