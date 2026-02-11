// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TERC20} from "./shared/TERC20.sol";

contract MockRegistryFactoryFees {
    uint256 public protocolFee;
    address public gardensFeeReceiver;

    function setProtocolFee(uint256 fee) external {
        protocolFee = fee;
    }

    function setGardensFeeReceiver(address receiver) external {
        gardensFeeReceiver = receiver;
    }

    function getProtocolFee(address) external view returns (uint256) {
        return protocolFee;
    }

    function getGardensFeeReceiver() external view returns (address) {
        return gardensFeeReceiver;
    }
}

contract MockStrategyDeactivate {
    address public lastMember;

    function deactivatePoints(address member) external {
        lastMember = member;
    }
}

contract CommunityMemberFacetHarness is CommunityMemberFacet {
    function initializeHarness(address owner_) external {
        initialize(owner_);
    }

    function setRegistryFactory(address factory) external {
        registryFactory = factory;
    }

    function setGardenToken(address token) external {
        gardenToken = IERC20(token);
    }

    function setCommunityFee(uint256 fee) external {
        communityFee = fee;
    }

    function setRegisterStakeAmount(uint256 amount) external {
        registerStakeAmount = amount;
    }

    function setFeeReceiver(address receiver) external {
        feeReceiver = receiver;
    }

    function setKickEnabled(bool enabled) external {
        isKickEnabled = enabled;
    }

    function setMember(address member, bool registered, uint256 staked) external {
        addressToMemberInfo[member].member = member;
        addressToMemberInfo[member].stakedAmount = staked;
        addressToMemberInfo[member].isRegistered = registered;
    }

    function setTotalMembers(uint256 total) external {
        totalMembers = total;
    }

    function addStrategyForMember(address member, address strategy) external {
        strategiesByMember[member].push(strategy);
    }

    function grantCouncil(address member) external {
        _grantRole(COUNCIL_MEMBER, member);
    }
}

contract CommunityMemberFacetTest is Test {
    CommunityMemberFacetHarness internal facet;
    TERC20 internal token;
    MockRegistryFactoryFees internal factory;
    address internal member = makeAddr("member");
    address internal feeReceiver = makeAddr("feeReceiver");
    address internal gardensFeeReceiver = makeAddr("gardensFeeReceiver");

    function setUp() public {
        facet = new CommunityMemberFacetHarness();
        facet.initializeHarness(address(this));

        token = new TERC20("Token", "TOK", 18);
        factory = new MockRegistryFactoryFees();
        factory.setProtocolFee(200); // 2%
        factory.setGardensFeeReceiver(gardensFeeReceiver);

        facet.setGardenToken(address(token));
        facet.setRegistryFactory(address(factory));
        facet.setCommunityFee(100); // 1%
        facet.setRegisterStakeAmount(10_000);
        facet.setFeeReceiver(feeReceiver);
    }

    function test_getBasisStakedAmount() public {
        assertEq(facet.getBasisStakedAmount(), 10_000);
    }

    function test_getStakeAmountWithFees() public {
        uint256 expected = 10_000 + 1 + 2; // 1% community + 2% protocol
        assertEq(facet.getStakeAmountWithFees(), expected);
    }

    function test_stakeAndRegisterMember_transfers_and_updates() public {
        uint256 expectedTotal = 10_000 + 1 + 2;
        token.mint(member, expectedTotal);

        vm.prank(member);
        token.approve(address(facet), expectedTotal);

        vm.prank(member);
        facet.stakeAndRegisterMember("sig");

        assertTrue(facet.isMember(member));
        assertEq(token.balanceOf(address(facet)), 10_000);
        assertEq(token.balanceOf(feeReceiver), 1);
        assertEq(token.balanceOf(gardensFeeReceiver), 2);
        assertEq(facet.totalMembers(), 1);

        // second call is a no-op
        vm.prank(member);
        facet.stakeAndRegisterMember("sig");
        assertEq(facet.totalMembers(), 1);
    }

    function test_registerMember_reverts_when_stake_required() public {
        vm.prank(member);
        vm.expectRevert(CommunityMemberFacet.StakeRequiredForMembership.selector);
        facet.registerMember();
    }

    function test_registerMember_succeeds_when_stake_requirement_is_zero() public {
        facet.setRegisterStakeAmount(0);

        vm.prank(member);
        facet.registerMember();

        assertTrue(facet.isMember(member));
        assertEq(facet.totalMembers(), 1);
        assertEq(token.balanceOf(address(facet)), 0);
    }

    function test_unregisterMember_handles_zero_totalMembers() public {
        MockStrategyDeactivate strategy = new MockStrategyDeactivate();
        facet.setMember(member, true, 123);
        facet.setTotalMembers(0);
        facet.addStrategyForMember(member, address(strategy));

        token.mint(address(facet), 123);

        vm.prank(member);
        facet.unregisterMember();

        assertFalse(facet.isMember(member));
        assertEq(strategy.lastMember(), member);
        assertEq(token.balanceOf(member), 123);
        assertEq(facet.totalMembers(), 0);
    }

    function test_kickMember_reverts_when_not_council() public {
        facet.setMember(member, true, 10);
        vm.expectRevert(abi.encodeWithSelector(CommunityMemberFacet.UserNotInCouncil.selector, address(this)));
        facet.kickMember(member, makeAddr("receiver"));
    }

    function test_kickMember_reverts_when_disabled() public {
        facet.grantCouncil(address(this));
        facet.setMember(member, true, 10);
        facet.setKickEnabled(false);

        vm.expectRevert(CommunityMemberFacet.KickNotEnabled.selector);
        facet.kickMember(member, makeAddr("receiver"));
    }

    function test_kickMember_reverts_when_not_member() public {
        facet.grantCouncil(address(this));
        facet.setKickEnabled(true);

        vm.expectRevert(CommunityMemberFacet.UserNotInRegistry.selector);
        facet.kickMember(member, makeAddr("receiver"));
    }

    function test_kickMember_success_transfers() public {
        address receiver = makeAddr("receiver");
        facet.grantCouncil(address(this));
        facet.setKickEnabled(true);
        facet.setMember(member, true, 555);
        facet.setTotalMembers(1);
        token.mint(address(facet), 555);

        facet.kickMember(member, receiver);

        assertEq(token.balanceOf(receiver), 555);
        assertEq(facet.totalMembers(), 0);
    }
}
