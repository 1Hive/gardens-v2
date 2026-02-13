// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {CollateralVault} from "../src/CollateralVault.sol";

contract ReentrantReceiver {
    CollateralVault internal vault;
    uint256 internal proposalId;
    bool internal shouldReenter;

    constructor(CollateralVault _vault, uint256 _proposalId) {
        vault = _vault;
        proposalId = _proposalId;
    }

    receive() external payable {
        if (shouldReenter) {
            // Attempt reentrancy; should be blocked by nonReentrant
            shouldReenter = false;
            vault.withdrawCollateral(proposalId, address(this), 1);
        }
    }

    function attemptReenter() external {
        shouldReenter = true;
    }
}

contract RecipientRevertsOnReceive {
    receive() external payable {
        revert("no receive");
    }
}

contract CollateralVaultTest is Test {
    CollateralVault internal vault;
    address internal owner = address(0xA11CE);
    address internal user = address(0xB0B);
    address internal receiver = address(0xC0DE);
    uint256 internal constant PROPOSAL_ID = 1;

    function setUp() public {
        vm.deal(owner, 10 ether);
        vm.deal(address(this), 1 ether);
        vault = new CollateralVault();
        vm.prank(owner);
        vault.initialize();
    }

    function test_initialize_setsOwner_once() public {
        assertEq(vault.owner(), owner);
        vm.prank(owner);
        vm.expectRevert(CollateralVault.AlreadyInitialized.selector);
        vault.initialize();
    }

    function test_deposit_and_withdraw_fullAmount() public {
        vm.prank(owner);
        vault.depositCollateral{value: 1 ether}(PROPOSAL_ID, user);
        assertEq(vault.proposalCollateral(PROPOSAL_ID, user), 1 ether);

        vm.prank(owner);
        vault.withdrawCollateral(PROPOSAL_ID, user, 1 ether);
        assertEq(vault.proposalCollateral(PROPOSAL_ID, user), 0);
    }

    function test_withdraw_excessReturnsAvailable() public {
        vm.prank(owner);
        vault.depositCollateral{value: 1 ether}(PROPOSAL_ID, user);
        assertEq(user.balance, 0);

        vm.prank(owner);
        vault.withdrawCollateral(PROPOSAL_ID, user, 2 ether);

        assertEq(user.balance, 1 ether);
        assertEq(vault.proposalCollateral(PROPOSAL_ID, user), 0);
    }

    function test_withdrawFor_excessReturnsAvailableToRecipient() public {
        vm.prank(owner);
        vault.depositCollateral{value: 1 ether}(PROPOSAL_ID, user);

        vm.prank(owner);
        vault.withdrawCollateralFor(PROPOSAL_ID, user, receiver, 5 ether);

        assertEq(receiver.balance, 1 ether);
        assertEq(vault.proposalCollateral(PROPOSAL_ID, user), 0);
    }

    function test_withdrawFor_fullAmountToRecipient() public {
        vm.prank(owner);
        vault.depositCollateral{value: 1 ether}(PROPOSAL_ID, user);

        vm.prank(owner);
        vault.withdrawCollateralFor(PROPOSAL_ID, user, receiver, 1 ether);

        assertEq(receiver.balance, 1 ether);
        assertEq(vault.proposalCollateral(PROPOSAL_ID, user), 0);
    }

    function test_withdrawFor_revertsForNonOwner() public {
        vm.prank(owner);
        vault.depositCollateral{value: 1 ether}(PROPOSAL_ID, user);

        vm.prank(address(0xBEEF));
        vm.expectRevert(CollateralVault.NotAuthorized.selector);
        vault.withdrawCollateralFor(PROPOSAL_ID, user, receiver, 0.5 ether);
    }

    function test_onlyOwnerControlsDepositAndWithdraw() public {
        vm.expectRevert(CollateralVault.NotAuthorized.selector);
        vault.depositCollateral{value: 1 ether}(PROPOSAL_ID, user);

        vm.prank(owner);
        vault.depositCollateral{value: 1 ether}(PROPOSAL_ID, user);

        vm.expectRevert(CollateralVault.NotAuthorized.selector);
        vault.withdrawCollateral(PROPOSAL_ID, user, 1 ether);
    }

    function test_reentrancyGuard_blocksRecursiveWithdraw() public {
        ReentrantReceiver reentrant = new ReentrantReceiver(vault, PROPOSAL_ID);

        vm.prank(owner);
        vault.depositCollateral{value: 1 ether}(PROPOSAL_ID, address(reentrant));

        reentrant.attemptReenter();
        vm.prank(owner);
        // The internal reentrant attempt reverts, causing the external transfer to fail
        vm.expectRevert(CollateralVault.TransferFailed.selector);
        vault.withdrawCollateral(PROPOSAL_ID, address(reentrant), 1 ether);
    }

    function test_withdrawFor_revertsOnTransferFailure() public {
        vm.prank(owner);
        vault.depositCollateral{value: 1 ether}(PROPOSAL_ID, user);
        RecipientRevertsOnReceive badRecipient = new RecipientRevertsOnReceive();

        vm.prank(owner);
        vm.expectRevert(CollateralVault.TransferFailed.selector);
        vault.withdrawCollateralFor(PROPOSAL_ID, user, address(badRecipient), 0.4 ether);
    }
}
