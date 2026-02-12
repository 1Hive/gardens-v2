// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CommunityPowerFacet} from "../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {PointSystem} from "../src/CVStrategy/ICVStrategy.sol";
import {TERC20} from "./shared/TERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPowerStrategy {
    PointSystem public pointSystem;
    uint256 public increaseReturn;
    uint256 public decreaseReturn;
    uint256 public lastIncreaseAmount;
    uint256 public lastDecreaseAmount;

    constructor(PointSystem system, uint256 inc, uint256 dec) {
        pointSystem = system;
        increaseReturn = inc;
        decreaseReturn = dec;
    }

    function getPointSystem() external view returns (PointSystem) {
        return pointSystem;
    }

    function increasePower(address, uint256 amount) external returns (uint256) {
        lastIncreaseAmount = amount;
        return increaseReturn;
    }

    function decreasePower(address, uint256 amount) external returns (uint256) {
        lastDecreaseAmount = amount;
        return decreaseReturn;
    }
}

contract CommunityPowerFacetHarness is CommunityPowerFacet {
    function init(address token, uint256 stake) external {
        gardenToken = IERC20(token);
        registerStakeAmount = stake;
    }

    function setMember(address member, bool registered, uint256 staked) external {
        addressToMemberInfo[member].member = member;
        addressToMemberInfo[member].stakedAmount = staked;
        addressToMemberInfo[member].isRegistered = registered;
    }

    function setActivated(address member, address strategy, bool active, uint256 power) external {
        memberActivatedInStrategies[member][strategy] = active;
        memberPowerInStrategy[member][strategy] = power;
    }

    function setEnabledStrategy(address strategy, bool enabled) external {
        enabledStrategies[strategy] = enabled;
    }

    function addStrategyForMember(address member, address strategy) external {
        strategiesByMember[member].push(strategy);
    }

    function strategiesByMemberLength(address member) external view returns (uint256) {
        return strategiesByMember[member].length;
    }

    function exposedRemoveStrategyFromMember(address member, address strategy) external {
        removeStrategyFromMember(member, strategy);
    }
}

contract CommunityPowerFacetTest is Test {
    CommunityPowerFacetHarness internal facet;
    TERC20 internal token;
    address internal member = makeAddr("member");

    function setUp() public {
        token = new TERC20("Token", "TOK", 18);
        facet = new CommunityPowerFacetHarness();
        facet.init(address(token), 10);
    }

    function test_activateMemberInStrategy_fixed_uses_register_stake_and_no_duplicate() public {
        MockPowerStrategy strategy = new MockPowerStrategy(PointSystem.Fixed, 999, 0);
        facet.setMember(member, true, 50);
        facet.setEnabledStrategy(address(strategy), true);
        facet.addStrategyForMember(member, address(strategy));

        vm.prank(address(strategy));
        facet.activateMemberInStrategy(member, address(strategy));

        assertEq(facet.memberPowerInStrategy(member, address(strategy)), 10);
        assertTrue(facet.memberActivatedInStrategies(member, address(strategy)));
        assertEq(facet.strategiesByMemberLength(member), 1);
        assertEq(strategy.lastIncreaseAmount(), 0);
    }

    function test_activateMemberInStrategy_quadratic_and_unlimited_paths() public {
        MockPowerStrategy quadratic = new MockPowerStrategy(PointSystem.Quadratic, 3, 0);
        MockPowerStrategy unlimited = new MockPowerStrategy(PointSystem.Unlimited, 7, 0);

        facet.setMember(member, true, 40);
        facet.setEnabledStrategy(address(quadratic), true);
        facet.setEnabledStrategy(address(unlimited), true);

        vm.prank(address(quadratic));
        facet.activateMemberInStrategy(member, address(quadratic));
        assertEq(quadratic.lastIncreaseAmount(), 0);
        assertEq(facet.memberPowerInStrategy(member, address(quadratic)), 3);

        vm.prank(address(unlimited));
        facet.activateMemberInStrategy(member, address(unlimited));
        assertEq(unlimited.lastIncreaseAmount(), 40);
        assertEq(facet.memberPowerInStrategy(member, address(unlimited)), 7);
        assertEq(facet.strategiesByMemberLength(member), 2);
    }

    function test_activateMemberInStrategy_reverts_for_invalid_state() public {
        MockPowerStrategy strategy = new MockPowerStrategy(PointSystem.Fixed, 0, 0);

        vm.prank(address(strategy));
        vm.expectRevert(CommunityPowerFacet.UserNotInRegistry.selector);
        facet.activateMemberInStrategy(member, address(strategy));

        facet.setMember(member, true, 1);
        vm.prank(address(strategy));
        vm.expectRevert(CommunityPowerFacet.StrategyDisabled.selector);
        facet.activateMemberInStrategy(member, address(strategy));

        facet.setEnabledStrategy(address(strategy), true);
        vm.expectRevert(CommunityPowerFacet.SenderNotStrategy.selector);
        facet.activateMemberInStrategy(member, address(strategy));

        facet.setActivated(member, address(strategy), true, 0);
        vm.prank(address(strategy));
        vm.expectRevert(CommunityPowerFacet.UserAlreadyActivated.selector);
        facet.activateMemberInStrategy(member, address(strategy));
    }

    function test_getMemberPowerInStrategy_returns_value() public {
        address strategy = address(0xBEEF);
        facet.setActivated(member, strategy, true, 42);
        assertEq(facet.getMemberPowerInStrategy(member, strategy), 42);
    }

    function test_deactivateMemberInStrategy_returns_when_not_activated_and_succeeds() public {
        MockPowerStrategy strategy = new MockPowerStrategy(PointSystem.Fixed, 0, 0);
        facet.setMember(member, true, 0);

        vm.prank(address(strategy));
        facet.deactivateMemberInStrategy(member, address(strategy));

        assertFalse(facet.memberActivatedInStrategies(member, address(strategy)));
        assertEq(facet.memberPowerInStrategy(member, address(strategy)), 0);

        facet.setActivated(member, address(strategy), true, 4);
        vm.prank(address(strategy));
        facet.deactivateMemberInStrategy(member, address(strategy));
        assertFalse(facet.memberActivatedInStrategies(member, address(strategy)));
        assertEq(facet.memberPowerInStrategy(member, address(strategy)), 0);
    }

    function test_increasePower_updates_balances_and_points() public {
        MockPowerStrategy strategy1 = new MockPowerStrategy(PointSystem.Unlimited, 2, 0);
        MockPowerStrategy strategy2 = new MockPowerStrategy(PointSystem.Unlimited, 0, 0);

        facet.setMember(member, true, 0);
        facet.addStrategyForMember(member, address(strategy1));
        facet.addStrategyForMember(member, address(strategy2));

        token.mint(member, 5);
        vm.prank(member);
        token.approve(address(facet), 5);

        vm.prank(member);
        facet.increasePower(5);

        assertEq(facet.getMemberStakedAmount(member), 5);
        assertEq(facet.memberPowerInStrategy(member, address(strategy1)), 2);
        assertEq(facet.memberPowerInStrategy(member, address(strategy2)), 0);
        assertEq(token.balanceOf(member), 0);
        assertEq(token.balanceOf(address(facet)), 5);
    }

    function test_increasePower_reverts_for_non_member() public {
        vm.expectRevert(CommunityPowerFacet.UserNotInRegistry.selector);
        facet.increasePower(1);
    }

    function test_decreasePower_reverts_under_minimum() public {
        MockPowerStrategy strategy = new MockPowerStrategy(PointSystem.Unlimited, 0, 1);
        facet.setMember(member, true, 10);
        facet.addStrategyForMember(member, address(strategy));

        vm.prank(member);
        vm.expectRevert(CommunityPowerFacet.DecreaseUnderMinimum.selector);
        facet.decreasePower(1);
    }

    function test_decreasePower_reverts_for_non_member() public {
        vm.expectRevert(CommunityPowerFacet.UserNotInRegistry.selector);
        facet.decreasePower(1);
    }

    function test_decreasePower_reverts_when_decrease_exceeds_power() public {
        MockPowerStrategy strategy = new MockPowerStrategy(PointSystem.Unlimited, 0, 5);
        facet.setMember(member, true, 20);
        facet.addStrategyForMember(member, address(strategy));
        facet.setActivated(member, address(strategy), true, 3);

        token.mint(address(facet), 5);

        vm.prank(member);
        vm.expectRevert(
            abi.encodeWithSelector(CommunityPowerFacet.CantDecreaseMoreThanPower.selector, 5, 3)
        );
        facet.decreasePower(5);
    }

    function test_decreasePower_updates_balances_and_points() public {
        MockPowerStrategy strategy = new MockPowerStrategy(PointSystem.Unlimited, 0, 4);
        facet.setMember(member, true, 20);
        facet.addStrategyForMember(member, address(strategy));
        facet.setActivated(member, address(strategy), true, 6);

        token.mint(address(facet), 5);

        vm.prank(member);
        facet.decreasePower(5);

        assertEq(facet.getMemberStakedAmount(member), 15);
        assertEq(facet.memberPowerInStrategy(member, address(strategy)), 2);
        assertEq(token.balanceOf(member), 5);
    }

    function test_removeStrategyFromMember_removes_entry() public {
        address strategy1 = address(new MockPowerStrategy(PointSystem.Unlimited, 0, 0));
        address strategy2 = address(new MockPowerStrategy(PointSystem.Unlimited, 0, 0));

        facet.addStrategyForMember(member, strategy1);
        facet.addStrategyForMember(member, strategy2);
        assertEq(facet.strategiesByMemberLength(member), 2);

        facet.exposedRemoveStrategyFromMember(member, strategy1);
        assertEq(facet.strategiesByMemberLength(member), 1);
    }
}
