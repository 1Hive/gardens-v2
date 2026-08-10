// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {GardensRevenueReceiver} from "../../src/MarkeeRevenue/GardensRevenueReceiver.sol";
import {IGardensRevenueReceiver} from "../../src/MarkeeRevenue/interfaces/IGardensRevenueReceiver.sol";
import {MockRegistryCommunity} from "./mocks/MockRegistryCommunity.sol";
import {MockWETH9} from "./mocks/MockWETH9.sol";

contract RejectingReceiver {
    // No receive/fallback: any plain ETH transfer to this contract reverts.

    }

contract GardensRevenueReceiverTest is Test {
    GardensRevenueReceiver internal receiver;
    address internal proxyOwner = address(0xA11CE);
    address internal acrossSpokePool = address(0xAC2055);
    MockWETH9 internal wrappedNativeToken;

    function setUp() public {
        wrappedNativeToken = new MockWETH9();
        receiver = _deployReceiver();
    }

    function _deployReceiver() internal returns (GardensRevenueReceiver deployed) {
        address implementation = address(new GardensRevenueReceiver());
        address proxy = address(
            new ERC1967Proxy(
                implementation,
                abi.encodeWithSignature(
                    "initialize(address,address,address)", proxyOwner, acrossSpokePool, address(wrappedNativeToken)
                )
            )
        );
        deployed = GardensRevenueReceiver(payable(proxy));
    }

    function _deliver(bytes32 payoutId, MockRegistryCommunity registryCommunity, uint256 amount) internal {
        vm.deal(address(this), amount);
        wrappedNativeToken.mint{value: amount}(address(receiver));
        vm.prank(acrossSpokePool);
        receiver.handleV3AcrossMessage(
            address(wrappedNativeToken),
            amount,
            address(0xBEEF),
            abi.encode(payoutId, keccak256("key"), address(registryCommunity))
        );
    }

    function test_initialize_revertsOnZeroAddresses() public {
        address implementation = address(new GardensRevenueReceiver());
        vm.expectRevert(IGardensRevenueReceiver.ZeroAddress.selector);
        new ERC1967Proxy(
            implementation,
            abi.encodeWithSignature(
                "initialize(address,address,address)", proxyOwner, address(0), address(wrappedNativeToken)
            )
        );
    }

    function test_handleV3AcrossMessage_revertsForWrongCaller() public {
        vm.expectRevert(IGardensRevenueReceiver.NotAcrossSpokePool.selector);
        receiver.handleV3AcrossMessage(
            address(wrappedNativeToken), 1, address(0), abi.encode(bytes32(0), bytes32(0), address(0))
        );
    }

    function test_handleV3AcrossMessage_revertsForWrongToken() public {
        vm.prank(acrossSpokePool);
        vm.expectRevert(IGardensRevenueReceiver.InvalidToken.selector);
        receiver.handleV3AcrossMessage(address(0xBAD), 1, address(0), abi.encode(bytes32(0), bytes32(0), address(0)));
    }

    function test_handleV3AcrossMessage_revertsWithoutTransferredFunds() public {
        vm.prank(acrossSpokePool);
        vm.expectRevert(IGardensRevenueReceiver.InsufficientBalance.selector);
        receiver.handleV3AcrossMessage(
            address(wrappedNativeToken),
            1 ether,
            address(0),
            abi.encode(bytes32(uint256(1)), bytes32(0), address(0xC0DE))
        );
    }

    function test_handleV3AcrossMessage_deliversToCouncilSafe() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0x5AFE1));
        _deliver(bytes32(uint256(1)), registryCommunity, 1 ether);

        assertEq(address(0x5AFE1).balance, 1 ether);
    }

    function test_handleV3AcrossMessage_revertsOnDuplicatePayoutId() public {
        MockRegistryCommunity registryCommunity = new MockRegistryCommunity(address(0x5AFE1));
        bytes32 payoutId = bytes32(uint256(1));
        _deliver(payoutId, registryCommunity, 1 ether);

        vm.deal(address(this), 1 ether);
        wrappedNativeToken.mint{value: 1 ether}(address(receiver));
        vm.prank(acrossSpokePool);
        vm.expectRevert(IGardensRevenueReceiver.PayoutAlreadyProcessed.selector);
        receiver.handleV3AcrossMessage(
            address(wrappedNativeToken),
            1 ether,
            address(0),
            abi.encode(payoutId, keccak256("key"), address(registryCommunity))
        );
    }

    function test_handleV3AcrossMessage_escrowsOnSafeTransferFailure() public {
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
    }

    function test_setAcrossConfig_onlyOwner() public {
        vm.expectRevert();
        receiver.setAcrossConfig(address(1), address(2));

        vm.prank(proxyOwner);
        receiver.setAcrossConfig(address(1), address(2));
        assertEq(receiver.acrossSpokePool(), address(1));
        assertEq(receiver.wrappedNativeToken(), address(2));
    }
}
