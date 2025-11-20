// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/GoodDollarSybil.sol";

import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract GooddollarTest is Test {
    GoodDollarSybil public goodDollarSybil;
    address public listManager = address(1);
    address public user = address(2);
    address public strategy = address(3);
    address public councilSafe = address(4);
    address public unauthorizedUser = address(5);
    uint256 public passportScore = 0;

    function setUp() public {
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(new GoodDollarSybil()),
            abi.encodeWithSelector(GoodDollarSybil.initialize.selector, address(listManager), address(listManager))
        );

        goodDollarSybil = GoodDollarSybil(payable(address(proxy)));

        // passportScore = 100;
    }

    function testValidate() public {
        vm.prank(listManager);
        goodDollarSybil.validateUser(user);

        bool storedValidity = goodDollarSybil.userValidity(user);
        assertEq(storedValidity, true);
    }

    function testInvalidate() public {
        vm.prank(listManager);
        goodDollarSybil.validateUser(user);

        bool storedValidity = goodDollarSybil.userValidity(user);
        assertEq(storedValidity, true);
        vm.prank(listManager);
        goodDollarSybil.invalidateUser(user);
        storedValidity = goodDollarSybil.userValidity(user);
        assertEq(storedValidity, false);
    }

    function testRevertOnlyListManger() public {
        // vm.prank(listManager); : not List manager: should revert
        vm.expectRevert(GoodDollarSybil.OnlyAuthorized.selector);
        goodDollarSybil.validateUser(user);
    }

    // function testRemoveUser() public {
    //     vm.prank(listManager);
    //     passportScorer.addUserScore(user, 0);

    //     vm.prank(listManager);
    //     passportScorer.removeUser(user);

    //     uint256 storedScore = passportScorer.userScores(user);
    //     assertEq(storedScore, 0);
    // }

    // function testChangeListManager() public {
    //     address newManager = address(6);

    //     vm.prank(passportScorer.owner());
    //     passportScorer.changeListManager(newManager);

    //     assertEq(passportScorer.listManager(), newManager);
    // }

    // function testOnlyAuthorizedCanAddUserScore() public {
    //     vm.prank(unauthorizedUser);
    //     vm.expectRevert(PassportScorer.OnlyAuthorized.selector);
    //     passportScorer.addUserScore(user, passportScore);
    // }

    // function testOnlyAuthorizedCanRemoveUser() public {
    //     vm.prank(unauthorizedUser);
    //     vm.expectRevert(PassportScorer.OnlyAuthoriexpectzed.selector);
    //     passportScorer.removeUser(user);
    // }

    // function testOnlyOwnerCanChangeListManager() public {
    //     address newManager = address(6);

    //     vm.prank(listManager);
    //     vm.expectRevert("Ownable: caller is not the owner");
    //     passportScorer.changeListManager(newManager);
    // }

    // function testAddStrategy() public {
    //     uint256 threshold = 50;

    //     vm.prank(listManager);
    //     passportScorer.addStrategy(strategy, threshold, councilSafe);

    //     (uint256 storedThreshold, bool storedActive, address storedCouncilSafe) = passportScorer.strategies(strategy);
    //     assertEq(storedThreshold, threshold);
    //     assertEq(storedActive, false);
    //     assertEq(storedCouncilSafe, councilSafe);
    // }

    // function testRemoveStrategy() public {
    //     uint256 threshold = 50;

    //     vm.prank(listManager);
    //     passportScorer.addStrategy(strategy, threshold, councilSafe);

    //     vm.prank(listManager);
    //     passportScorer.removeStrategy(strategy);

    //     (uint256 storedThreshold, bool storedActive, address storedCouncilSafe) = passportScorer.strategies(strategy);
    //     assertEq(storedThreshold, 0);
    //     assertEq(storedActive, false);
    //     // assertEq(storedCouncilSafe, councilSafe); // councilSafe should remain the same // Goss: Commented because we also want to wipe the coucil safe to allow the strategy to be readed
    // }

    // function testModifyThresholdByAuthorized() public {
    //     uint256 threshold = 50;
    //     uint256 newThreshold = 75;

    //     vm.prank(listManager);
    //     passportScorer.addStrategy(strategy, threshold, councilSafe);

    //     vm.prank(listManager);
    //     passportScorer.modifyThreshold(strategy, newThreshold);

    //     (uint256 storedThreshold, bool storedActive, address storedCouncilSafe) = passportScorer.strategies(strategy);
    //     assertEq(storedThreshold, newThreshold);
    //     assertEq(storedActive, false);
    //     assertEq(storedCouncilSafe, councilSafe);
    // }

    // function testModifyThresholdByCouncilSafe() public {
    //     uint256 threshold = 50;
    //     uint256 newThreshold = 75;

    //     vm.prank(listManager);
    //     passportScorer.addStrategy(strategy, threshold, councilSafe);

    //     vm.prank(councilSafe);
    //     passportScorer.modifyThreshold(strategy, newThreshold);

    //     (uint256 storedThreshold, bool storedActive, address storedCouncilSafe) = passportScorer.strategies(strategy);
    //     assertEq(storedThreshold, newThreshold);
    //     assertEq(storedActive, false);
    //     assertEq(storedCouncilSafe, councilSafe);
    // }

    // function testCanExecuteAction() public {
    //     uint256 threshold = 50;

    //     vm.prank(listManager);
    //     passportScorer.addStrategy(strategy, threshold, councilSafe);
    //     vm.startPrank(councilSafe);
    //     passportScorer.activateStrategy(strategy);
    //     vm.stopPrank();

    //     vm.prank(listManager);
    //     passportScorer.addUserScore(user, passportScore);

    //     bool canExecute = passportScorer.canExecuteAction(user, strategy);
    //     assertTrue(canExecute);

    //     vm.prank(listManager);
    //     passportScorer.modifyThreshold(strategy, 150);

    //     canExecute = passportScorer.canExecuteAction(user, strategy);
    //     assertFalse(canExecute);
    // }
}
