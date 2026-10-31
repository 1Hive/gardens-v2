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

contract MockStrategyRegistryStatus {
    bool public enabled;
    address public councilSafe = address(4);

    function setEnabled(bool _enabled) external {
        enabled = _enabled;
    }

    function setCouncilSafe(address _councilSafe) external {
        councilSafe = _councilSafe;
    }

    function enabledStrategies(address) external view returns (bool) {
        return enabled;
    }
}

contract PassportScorerHarness is PassportScorer {
    function seedStrategy(address strat, address council) external {
        strategies[strat] = Strategy({threshold: 0, active: false, councilSafe: council});
    }

    function callOnlyCouncil(address strat) external onlyCouncil(strat) {}

    function seedLegacyScore(address account, uint256 score) external {
        userScores[account] = score;
        delete userScoreUpdatedAt[account];
    }
}

contract PassportScorerTest is Test {
    PassportScorerHarness public passportScorer;
    MockStrategyRegistryStatus public registry;
    address public listManager = address(1);
    address public user = address(2);
    address public strategy = address(3);
    address public councilSafe = address(4);
    address public unauthorizedUser = address(5);
    address public owner = address(0xA11CE);
    uint256 public passportScore = 0;

    function setUp() public {
        registry = new MockStrategyRegistryStatus();
        strategy = address(new MockStrategyMinimal(address(registry)));
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(new PassportScorerHarness()),
            abi.encodeWithSelector(PassportScorer.initialize.selector, address(listManager), owner)
        );

        passportScorer = PassportScorerHarness(payable(address(proxy)));

        passportScore = 100;
    }

    function testAddUserScore() public {
        vm.warp(100);
        vm.prank(listManager);
        passportScorer.addUserScore(user, passportScore);

        uint256 storedScore = passportScorer.userScores(user);
        assertEq(storedScore, passportScore);
        assertEq(passportScorer.userScoreUpdatedAt(user), 100);
    }

    function testAddUserScore_zeroAddressReverts() public {
        vm.prank(listManager);
        vm.expectRevert(PassportScorer.ZeroAddress.selector);
        passportScorer.addUserScore(address(0), passportScore);
    }

    function testRemoveUser() public {
        vm.warp(100);
        vm.prank(listManager);
        passportScorer.addUserScore(user, passportScore);

        vm.prank(listManager);
        passportScorer.removeUser(user);

        uint256 storedScore = passportScorer.userScores(user);
        assertEq(storedScore, 0);
        assertEq(passportScorer.userScoreUpdatedAt(user), 0);
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

    function testFormerCouncilLosesAccessAfterRotation() public {
        vm.prank(listManager);
        passportScorer.addStrategy(strategy, 50, councilSafe);
        address newCouncil = address(0xB0B);
        registry.setCouncilSafe(newCouncil);

        vm.prank(councilSafe);
        vm.expectRevert(PassportScorer.OnlyCouncilOrAuthorized.selector);
        passportScorer.removeStrategy(strategy);
        vm.prank(councilSafe);
        vm.expectRevert(PassportScorer.OnlyCouncilOrAuthorized.selector);
        passportScorer.modifyThreshold(strategy, 0);

        vm.prank(newCouncil);
        passportScorer.modifyThreshold(strategy, 75);
        (uint256 threshold,,) = passportScorer.strategies(strategy);
        assertEq(threshold, 75);
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

    function testCanExecuteAction_rejectsExpiredScore() public {
        vm.prank(listManager);
        passportScorer.addStrategy(strategy, 50, councilSafe);
        vm.prank(councilSafe);
        passportScorer.activateStrategy(strategy);

        vm.warp(100);
        vm.prank(listManager);
        passportScorer.addUserScore(user, passportScore);

        vm.warp(100 + passportScorer.SCORE_VALIDITY_PERIOD());
        assertTrue(passportScorer.canExecuteAction(user, strategy));

        vm.warp(101 + passportScorer.SCORE_VALIDITY_PERIOD());
        assertFalse(passportScorer.canExecuteAction(user, strategy));
    }

    function testAddUserScore_refreshesUnchangedScoreExpiry() public {
        vm.prank(listManager);
        passportScorer.addStrategy(strategy, 50, councilSafe);
        vm.prank(councilSafe);
        passportScorer.activateStrategy(strategy);

        vm.warp(100);
        vm.prank(listManager);
        passportScorer.addUserScore(user, passportScore);

        vm.warp(100 + passportScorer.SCORE_VALIDITY_PERIOD());
        vm.prank(listManager);
        passportScorer.addUserScore(user, passportScore);

        assertEq(passportScorer.userScoreUpdatedAt(user), block.timestamp);
        assertTrue(passportScorer.canExecuteAction(user, strategy));
    }

    function testCanExecuteAction_zeroThresholdRemainsPermissiveWithoutScore() public {
        vm.prank(listManager);
        passportScorer.addStrategy(strategy, 0, councilSafe);
        vm.prank(councilSafe);
        passportScorer.activateStrategy(strategy);

        assertTrue(passportScorer.canExecuteAction(user, strategy));
    }

    function testInitializeScoreExpiration_grantsLegacyScoresTemporaryGrace() public {
        vm.prank(listManager);
        passportScorer.addStrategy(strategy, 50, councilSafe);
        vm.prank(councilSafe);
        passportScorer.activateStrategy(strategy);

        passportScorer.seedLegacyScore(user, passportScore);
        assertEq(passportScorer.userScoreUpdatedAt(user), 0);

        vm.warp(100);
        vm.prank(owner);
        passportScorer.initializeScoreExpiration();

        assertTrue(passportScorer.canExecuteAction(user, strategy));
        vm.warp(101 + passportScorer.SCORE_VALIDITY_PERIOD());
        assertFalse(passportScorer.canExecuteAction(user, strategy));
    }

    function testInitializeScoreExpiration_onlyOwnerAndOnlyOnce() public {
        vm.prank(unauthorizedUser);
        vm.expectRevert("Ownable: caller is not the owner");
        passportScorer.initializeScoreExpiration();

        vm.prank(owner);
        passportScorer.initializeScoreExpiration();

        vm.prank(owner);
        vm.expectRevert("Initializable: contract is already initialized");
        passportScorer.initializeScoreExpiration();
    }

    function testCanExecuteAction_inactiveUnregisteredStrategyRemainsPermissive() public {
        MockStrategyRegistryStatus registry = new MockStrategyRegistryStatus();
        MockStrategyMinimal registeredStrategy = new MockStrategyMinimal(address(registry));

        vm.prank(listManager);
        passportScorer.addStrategy(address(registeredStrategy), 500, councilSafe);

        vm.prank(listManager);
        passportScorer.addUserScore(user, 1);

        bool canExecute = passportScorer.canExecuteAction(user, address(registeredStrategy));
        assertTrue(canExecute);
    }

    function testCanExecuteAction_inactiveEnabledStrategyEnforcesThreshold() public {
        MockStrategyRegistryStatus registry = new MockStrategyRegistryStatus();
        MockStrategyMinimal registeredStrategy = new MockStrategyMinimal(address(registry));
        registry.setEnabled(true);

        vm.prank(listManager);
        passportScorer.addStrategy(address(registeredStrategy), 500, councilSafe);

        vm.prank(listManager);
        passportScorer.addUserScore(user, 1);

        assertFalse(passportScorer.canExecuteAction(user, address(registeredStrategy)));

        vm.prank(listManager);
        passportScorer.addUserScore(user, 500);

        assertTrue(passportScorer.canExecuteAction(user, address(registeredStrategy)));
    }

    function testActivateStrategy_onlyAuthorizedOrCouncil() public {
        MockStrategyMinimal mockStrategy = new MockStrategyMinimal(address(registry));

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

        vm.prank(address(registry));
        vm.expectRevert(PassportScorer.OnlyCouncil.selector);
        passportScorer.callOnlyCouncil(strategy);

        vm.prank(councilSafe);
        passportScorer.callOnlyCouncil(strategy);
    }

    function testMalformedStrategyCannotAuthorizeCouncil() public {
        address malformedStrategy = address(registry);

        vm.prank(unauthorizedUser);
        vm.expectRevert(PassportScorer.OnlyCouncilOrAuthorized.selector);
        passportScorer.modifyThreshold(malformedStrategy, 10);

        vm.prank(unauthorizedUser);
        vm.expectRevert(PassportScorer.OnlyCouncil.selector);
        passportScorer.callOnlyCouncil(malformedStrategy);
    }

    function testMalformedCommunityCannotAuthorizeCouncil() public {
        address malformedCommunity = address(new MockStrategyMinimal(address(0)));
        address malformedStrategy = address(new MockStrategyMinimal(malformedCommunity));

        vm.prank(unauthorizedUser);
        vm.expectRevert(PassportScorer.OnlyCouncilOrAuthorized.selector);
        passportScorer.modifyThreshold(malformedStrategy, 10);

        vm.prank(unauthorizedUser);
        vm.expectRevert(PassportScorer.OnlyCouncil.selector);
        passportScorer.callOnlyCouncil(malformedStrategy);
    }
}
