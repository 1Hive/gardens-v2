// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/PassportScorer.sol";

contract PassportScorerTest is Test {
    PassportScorer public passportScorer;
    address public listManager = address(1);
    address public user = address(2);
    address public strategy = address(3);
    address public councilSafe = address(4);
    address public unauthorizedUser = address(5);
    PassportData public passportData;

    function setUp() public {
        passportScorer = new PassportScorer();
        passportScorer.initialize(listManager);
        passportData = PassportData({score: 100, lastUpdated: block.timestamp});
    }

    function testAddUserScore() public {
        vm.prank(listManager);
        passportScorer.addUserScore(user, passportData);

        PassportData memory storedData = passportScorer.getUserScore(user);
        assertEq(storedData.score, passportData.score);
        assertEq(storedData.lastUpdated, passportData.lastUpdated);
    }

    function testRemoveUser() public {
        vm.prank(listManager);
        passportScorer.addUserScore(user, passportData);

        vm.prank(listManager);
        passportScorer.removeUser(user);

        PassportData memory storedData = passportScorer.getUserScore(user);
        assertEq(storedData.score, 0);
        assertEq(storedData.lastUpdated, 0);
    }

    function testChangeListManager() public {
        address newManager = address(6);

        vm.prank(passportScorer.owner());
        passportScorer.changeListManager(newManager);

        assertEq(passportScorer.listManager(), newManager);
    }

    function testOnlyAuthorizedCanAddUserScore() public {
        vm.prank(unauthorizedUser);
        vm.expectRevert(PassportScorer.OnlyAuthorized.selector);
        passportScorer.addUserScore(user, passportData);
    }

    function testOnlyAuthorizedCanRemoveUser() public {
        vm.prank(unauthorizedUser);
        vm.expectRevert(PassportScorer.OnlyAuthorized.selector);
        passportScorer.removeUser(user);
    }

    function testOnlyOwnerCanChangeListManager() public {
        address newManager = address(6);

        vm.prank(listManager);
        vm.expectRevert("Ownable: caller is not the owner");
        passportScorer.changeListManager(newManager);
    }

    function testAddStrategy() public {
        uint256 threshold = 50;

        vm.prank(listManager);
        passportScorer.addStrategy(strategy, threshold, councilSafe);

        (uint256 storedThreshold, bool storedActive, address storedCouncilSafe) = passportScorer.strategies(strategy);
        assertEq(storedThreshold, threshold);
        assertEq(storedActive, false);
        assertEq(storedCouncilSafe, councilSafe);
    }

    function testRemoveStrategy() public {
        uint256 threshold = 50;

        vm.prank(listManager);
        passportScorer.addStrategy(strategy, threshold, councilSafe);

        vm.prank(listManager);
        passportScorer.removeStrategy(strategy);

        (uint256 storedThreshold, bool storedActive, address storedCouncilSafe) = passportScorer.strategies(strategy);
        assertEq(storedThreshold, 0);
        assertEq(storedActive, false);
        assertEq(storedCouncilSafe, councilSafe); // councilSafe should remain the same
    }

    function testModifyThresholdByAuthorized() public {
        uint256 threshold = 50;
        uint256 newThreshold = 75;

        vm.prank(listManager);
        passportScorer.addStrategy(strategy, threshold, councilSafe);

        vm.prank(listManager);
        passportScorer.modifyThreshold(strategy, newThreshold);

        (uint256 storedThreshold, bool storedActive, address storedCouncilSafe) = passportScorer.strategies(strategy);
        assertEq(storedThreshold, newThreshold);
        assertEq(storedActive, false);
        assertEq(storedCouncilSafe, councilSafe);
    }

    function testModifyThresholdByCouncilSafe() public {
        uint256 threshold = 50;
        uint256 newThreshold = 75;

        vm.prank(listManager);
        passportScorer.addStrategy(strategy, threshold, councilSafe);

        vm.prank(councilSafe);
        passportScorer.modifyThreshold(strategy, newThreshold);

        (uint256 storedThreshold, bool storedActive, address storedCouncilSafe) = passportScorer.strategies(strategy);
        assertEq(storedThreshold, newThreshold);
        assertEq(storedActive, false);
        assertEq(storedCouncilSafe, councilSafe);
    }

    function testCanExecuteAction() public {
        uint256 threshold = 50;

        vm.prank(listManager);
        passportScorer.addStrategy(strategy, threshold, councilSafe);
        vm.startPrank(councilSafe);
        passportScorer.activateStrategy(strategy);
        vm.stopPrank();

        vm.prank(listManager);
        passportScorer.addUserScore(user, passportData);

        bool canExecute = passportScorer.canExecuteAction(user, strategy);
        assertTrue(canExecute);

        vm.prank(listManager);
        passportScorer.modifyThreshold(strategy, 150);

        canExecute = passportScorer.canExecuteAction(user, strategy);
        assertFalse(canExecute);
    }
}
