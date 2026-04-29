// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {PowerManagementUtils} from "../src/CVStrategy/PowerManagementUtils.sol";
import {ConvictionsUtils} from "../src/CVStrategy/ConvictionsUtils.sol";
import {PointSystem} from "../src/CVStrategy/ICVStrategy.sol";
import {IVotingPowerRegistry} from "../src/interfaces/IVotingPowerRegistry.sol";

contract MockERC20Decimals {
    uint8 internal _decimals;

    constructor(uint8 decimals_) {
        _decimals = decimals_;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }
}

contract MockVotingPowerRegistry is IVotingPowerRegistry {
    mapping(address => uint256) internal _memberPower;
    mapping(address => uint256) internal _memberStake;
    address internal _erc;

    function setMemberPower(address member, uint256 power) external {
        _memberPower[member] = power;
    }

    function setMemberStake(address member, uint256 stake) external {
        _memberStake[member] = stake;
    }

    function setErcAddress(address erc_) external {
        _erc = erc_;
    }

    function getMemberPowerInStrategy(address _member, address) external view returns (uint256) {
        return _memberPower[_member];
    }

    function getMemberStakedAmount(address _member) external view returns (uint256) {
        return _memberStake[_member];
    }

    function ercAddress() external view returns (address) {
        return _erc;
    }

    function isMember(address) external pure returns (bool) {
        return true;
    }
}

contract PowerUtilsHarness {
    function increase(
        IVotingPowerRegistry reg,
        address member,
        uint256 amount,
        PointSystem pointSystem,
        uint256 maxAmount
    ) external returns (uint256) {
        return PowerManagementUtils.increasePower(reg, member, amount, pointSystem, maxAmount);
    }

    function decrease(
        IVotingPowerRegistry reg,
        address member,
        uint256 amount,
        PointSystem pointSystem,
        uint256 maxAmount
    ) external returns (uint256) {
        return PowerManagementUtils.decreasePower(reg, member, amount, pointSystem, maxAmount);
    }
}

contract PowerAndConvictionUtilsTest is Test {
    PowerUtilsHarness internal harness;
    MockVotingPowerRegistry internal reg;
    address internal member = address(0xBEEF);

    function setUp() public {
        harness = new PowerUtilsHarness();
        reg = new MockVotingPowerRegistry();
    }

    function test_increasePower_branches_cover_all_point_systems() public {
        assertEq(harness.increase(reg, member, 10, PointSystem.Unlimited, 0), 10);

        reg.setMemberPower(member, 12);
        assertEq(harness.increase(reg, member, 10, PointSystem.Capped, 15), 3);

        reg.setMemberStake(member, 9);
        reg.setMemberPower(member, 3);
        reg.setErcAddress(address(new MockERC20Decimals(18)));
        assertGt(harness.increase(reg, member, 7, PointSystem.Quadratic, 0), 0);

        assertEq(harness.increase(reg, member, 99, PointSystem.Custom, 0), 0);
    }

    function test_increasePower_capped_and_quadratic_edge_paths() public {
        reg.setMemberPower(member, 20);
        assertEq(harness.increase(reg, member, 5, PointSystem.Capped, 20), 0);

        reg.setMemberPower(member, 15);
        reg.setMemberStake(member, type(uint256).max - 1);
        reg.setErcAddress(address(new MockERC20Decimals(255)));
        assertGt(harness.increase(reg, member, 1, PointSystem.Quadratic, 0), 0);
    }

    function test_decreasePower_branches_cover_all_point_systems() public {
        assertEq(harness.decrease(reg, member, 11, PointSystem.Unlimited, 0), 11);

        reg.setMemberPower(member, 7);
        reg.setMemberStake(member, 7);
        assertEq(harness.decrease(reg, member, 4, PointSystem.Capped, 10), 4);

        reg.setMemberPower(member, 3_000_000_000);
        reg.setMemberStake(member, 8);
        assertEq(harness.decrease(reg, member, 0, PointSystem.Capped, 9), 1);

        reg.setMemberPower(member, 4_000_000_000);
        reg.setMemberStake(member, 9);
        reg.setErcAddress(address(new MockERC20Decimals(18)));
        assertGt(harness.decrease(reg, member, 1, PointSystem.Quadratic, 0), 0);

        assertEq(harness.decrease(reg, member, 3, PointSystem.Custom, 0), 0);
    }

    function test_decreasePower_quadratic_zero_when_points_not_decreasing() public {
        reg.setMemberPower(member, 5);
        reg.setMemberStake(member, type(uint256).max);
        reg.setErcAddress(address(new MockERC20Decimals(255)));
        assertEq(harness.decrease(reg, member, 1, PointSystem.Quadratic, 0), 0);
    }

    function test_convictionsUtils_calculateConviction_reverts_when_decay_is_D_or_more() public {
        vm.expectRevert(ConvictionsUtils.AShouldBeUnderTwo_128.selector);
        ConvictionsUtils.calculateConviction(1, 1, 1, ConvictionsUtils.D);
    }

    function test_convictionsUtils_threshold_override_paths() public {
        uint256 thresholdNoActive = ConvictionsUtils.calculateThreshold(1, 100, 0, 5_000_000, 1_000_000, 9_000_000, 1);
        assertEq(thresholdNoActive, ConvictionsUtils.calculateThresholdOverride(5_000_000, 1));

        uint256 thresholdOverride = ConvictionsUtils.calculateThresholdOverride(5_000_000, 2_000_000_000);
        uint256 thresholdWithEmptyPool = ConvictionsUtils.calculateThreshold(
            1, 0, 1_000_000_000_000, 5_000_000, 1_000_000, 9_000_000, 2_000_000_000
        );
        assertEq(thresholdWithEmptyPool, 246913580246);
        assertGt(thresholdWithEmptyPool, thresholdOverride);

        uint256 zeroRequestedThreshold = ConvictionsUtils.calculateThreshold(
            0, 0, 1_000_000_000_000, 5_000_000, 1_000_000, 9_000_000, 2_000_000_000
        );
        assertEq(zeroRequestedThreshold, thresholdWithEmptyPool);

        uint256 thresholdWithMinOverride = ConvictionsUtils.calculateThreshold(
            1, 1_000_000_000_000, 1_000_000_000_000, 5_000_000, 1_000_000, 9_000_000, 2_000_000_000
        );
        uint256 thresholdWithoutMinOverride = ConvictionsUtils.calculateThreshold(
            1, 1_000_000_000_000, 1_000_000_000_000, 5_000_000, 1_000_000, 9_000_000, 1
        );

        assertGe(thresholdWithMinOverride, thresholdWithoutMinOverride);
    }

    function test_convictionsUtils_calculateThreshold_zeroPool_ignores_requested_amount_ratio() public pure {
        uint256 requestedThreshold = ConvictionsUtils.calculateThreshold(
            1 ether, 0, 1_000_000_000_000, 5_000_000, 1_000_000, 9_000_000, 2_000_000_000
        );
        uint256 zeroRequestedThreshold = ConvictionsUtils.calculateThreshold(
            0, 0, 1_000_000_000_000, 5_000_000, 1_000_000, 9_000_000, 2_000_000_000
        );

        assertEq(requestedThreshold, zeroRequestedThreshold);
    }

    function test_convictionsUtils_calculateThreshold_nonZeroPool_uses_requested_amount_ratio() public pure {
        uint256 zeroRequestedThreshold = ConvictionsUtils.calculateThreshold(
            0, 100 ether, 1_000_000_000_000, 5_000_000, 1_000_000, 9_000_000, 2_000_000_000
        );
        uint256 requestedThreshold = ConvictionsUtils.calculateThreshold(
            1 ether, 100 ether, 1_000_000_000_000, 5_000_000, 1_000_000, 9_000_000, 2_000_000_000
        );

        assertGt(requestedThreshold, zeroRequestedThreshold);
    }
}
