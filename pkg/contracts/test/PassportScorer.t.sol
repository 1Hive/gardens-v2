// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/PassportScorer.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockStrategyMinimal {
    address public registryCommunity;

    constructor(address _registryCommunity) {
        registryCommunity = _registryCommunity;
    }
}

contract PassportScorerHarness is PassportScorer {
    function seedStrategy(address strat, address council) external {
        strategies[strat] = Strategy({threshold: 0, active: false, councilSafe: council});
    }

    function callOnlyCouncil(address strat) external onlyCouncil(strat) {}
}

contract PassportScorerTest is Test {
    PassportScorerHarness public passportScorer;
    address public listManager = address(1);
    address public user = address(2);
    address public strategy = address(3);
    address public councilSafe = address(4);
    address public unauthorizedUser = address(5);
    address public owner = address(0xA11CE);
    uint256 public passportScore = 0;

    function setUp() public {
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(new PassportScorerHarness()),
            abi.encodeWithSelector(PassportScorer.initialize.selector, address(listManager), owner)
        );

        passportScorer = PassportScorerHarness(payable(address(proxy)));

        passportScore = 100;
    }

    function testAddUserScore() public {
        vm.prank(listManager);
        passportScorer.addUserScore(user, passportScore);

        uint256 storedScore = passportScorer.userScores(user);
        assertEq(storedScore, passportScore);
    }

    function testAddUserScore_zeroAddressReverts() public {
        vm.prank(listManager);
        vm.expectRevert(PassportScorer.ZeroAddress.selector);
        passportScorer.addUserScore(address(0), passportScore);
    }

    function testRemoveUser() public {
        vm.prank(listManager);
        passportScorer.addUserScore(user, 0);

        vm.prank(listManager);
        passportScorer.removeUser(user);

        uint256 storedScore = passportScorer.userScores(user);
        assertEq(storedScore, 0);
    }

    function testRemoveUser_zeroAddressReverts() public {
        vm.prank(listManager);
        vm.expectRevert(PassportScorer.ZeroAddress.selector);
        passportScorer.removeUser(address(0));
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
        passportScorer.addUserScore(user, passportScore);
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

    function testChangeListManager_zeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(PassportScorer.ZeroAddress.selector);
        passportScorer.changeListManager(address(0));
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

    function testAddStrategy_zeroInputsRevert() public {
        vm.prank(listManager);
        vm.expectRevert(); // zero strategy hits external call in modifier
        passportScorer.addStrategy(address(0), 1, councilSafe);

        vm.prank(listManager);
        vm.expectRevert(PassportScorer.ZeroAddress.selector);
        passportScorer.addStrategy(strategy, 1, address(0));
    }

    function testAddStrategy_rejectsDuplicates() public {
        vm.prank(listManager);
        passportScorer.addStrategy(strategy, 10, councilSafe);

        vm.prank(listManager);
        vm.expectRevert(PassportScorer.StrategyAlreadyExists.selector);
        passportScorer.addStrategy(strategy, 20, councilSafe);
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
        // assertEq(storedCouncilSafe, councilSafe); // councilSafe should remain the same // Goss: Commented because we also want to wipe the coucil safe to allow the strategy to be readed
    }

    function testRemoveStrategy_zeroAddressReverts() public {
        vm.prank(listManager);
        vm.expectRevert(); // modifier will revert when _strategy is zero
        passportScorer.removeStrategy(address(0));
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

    function testModifyThreshold_unauthorizedReverts() public {
        vm.prank(listManager);
        passportScorer.addStrategy(strategy, 10, councilSafe);

        vm.prank(unauthorizedUser);
        vm.expectRevert(PassportScorer.OnlyCouncilOrAuthorized.selector);
        passportScorer.modifyThreshold(strategy, 20);
    }

    function testCanExecuteAction() public {
        uint256 threshold = 50;

        vm.prank(listManager);
        passportScorer.addStrategy(strategy, threshold, councilSafe);
        vm.startPrank(councilSafe);
        passportScorer.activateStrategy(strategy);
        vm.stopPrank();

        vm.prank(listManager);
        passportScorer.addUserScore(user, passportScore);

        bool canExecute = passportScorer.canExecuteAction(user, strategy);
        assertTrue(canExecute);

        vm.prank(listManager);
        passportScorer.modifyThreshold(strategy, 150);

        canExecute = passportScorer.canExecuteAction(user, strategy);
        assertFalse(canExecute);
    }

    function testCanExecuteAction_inactiveAlwaysTrue() public {
        vm.prank(listManager);
        passportScorer.addStrategy(strategy, 500, councilSafe); // inactive by default

        vm.prank(listManager);
        passportScorer.addUserScore(user, 1);

        bool canExecute = passportScorer.canExecuteAction(user, strategy);
        assertTrue(canExecute);
    }

    function testActivateStrategy_onlyAuthorizedOrCouncil() public {
        MockStrategyMinimal mockStrategy = new MockStrategyMinimal(address(0));

        vm.prank(listManager);
        passportScorer.addStrategy(address(mockStrategy), 10, councilSafe);

        vm.prank(unauthorizedUser);
        vm.expectRevert(PassportScorer.OnlyCouncilOrAuthorized.selector);
        passportScorer.activateStrategy(address(mockStrategy));

        vm.prank(councilSafe);
        passportScorer.activateStrategy(address(mockStrategy));
        (, bool active,) = passportScorer.strategies(address(mockStrategy));
        assertTrue(active);
    }

    function testOnlyCouncilModifier() public {
        passportScorer.seedStrategy(strategy, councilSafe);

        vm.expectRevert(PassportScorer.OnlyCouncil.selector);
        passportScorer.callOnlyCouncil(strategy);

        vm.prank(councilSafe);
        passportScorer.callOnlyCouncil(strategy);
    }
}
