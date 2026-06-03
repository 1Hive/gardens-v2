// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {DecimalScalingUtils} from "../src/CVStrategy/DecimalScalingUtils.sol";
import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";

contract DecimalTokenMock {
    uint8 private _decimals;
    bool private _revertDecimals;

    constructor(uint8 decimals_, bool revertDecimals_) {
        _decimals = decimals_;
        _revertDecimals = revertDecimals_;
    }

    function decimals() external view returns (uint8) {
        if (_revertDecimals) {
            revert("no decimals");
        }
        return _decimals;
    }
}

contract DecimalScalingUtilsHarness {
    function scaleTokenAmount(uint256 amount, uint8 fromDecimals, uint8 toDecimals) external pure returns (uint256) {
        return DecimalScalingUtils.scaleTokenAmount(amount, fromDecimals, toDecimals);
    }

    function tokenDecimals(address token) external view returns (uint8) {
        return DecimalScalingUtils.tokenDecimals(token);
    }

    function toSuperTokenAmount(uint256 poolTokenAmount, address poolToken, ISuperToken targetSuperToken)
        external
        view
        returns (uint256)
    {
        return DecimalScalingUtils.toSuperTokenAmount(poolTokenAmount, poolToken, targetSuperToken);
    }

    function fromSuperTokenAmount(uint256 superTokenAmount, address poolToken, ISuperToken sourceSuperToken)
        external
        view
        returns (uint256)
    {
        return DecimalScalingUtils.fromSuperTokenAmount(superTokenAmount, poolToken, sourceSuperToken);
    }
}

contract DecimalScalingUtilsTest is Test {
    DecimalScalingUtilsHarness internal harness;
    DecimalTokenMock internal token6;
    DecimalTokenMock internal token18;
    DecimalTokenMock internal token20;

    function setUp() public {
        harness = new DecimalScalingUtilsHarness();
        token6 = new DecimalTokenMock(6, false);
        token18 = new DecimalTokenMock(18, false);
        token20 = new DecimalTokenMock(20, false);
    }

    function test_scaleTokenAmount_covers_zero_equal_upscale_and_downscale() public view {
        assertEq(harness.scaleTokenAmount(0, 6, 18), 0);
        assertEq(harness.scaleTokenAmount(123, 18, 18), 123);
        assertEq(harness.scaleTokenAmount(1_000_000, 6, 18), 1 ether);
        assertEq(harness.scaleTokenAmount(1 ether, 18, 6), 1_000_000);
    }

    function test_tokenDecimals_defaults_to_eighteen_when_decimals_reverts() public {
        DecimalTokenMock revertingToken = new DecimalTokenMock(0, true);
        assertEq(harness.tokenDecimals(address(token6)), 6);
        assertEq(harness.tokenDecimals(address(revertingToken)), 18);
    }

    function test_toSuperTokenAmount_covers_short_circuits_and_scaling() public view {
        assertEq(harness.toSuperTokenAmount(0, address(token6), ISuperToken(address(token18))), 0);
        assertEq(harness.toSuperTokenAmount(42, address(token6), ISuperToken(address(0))), 42);
        assertEq(harness.toSuperTokenAmount(42, address(token18), ISuperToken(address(token18))), 42);
        assertEq(harness.toSuperTokenAmount(1_000_000, address(token6), ISuperToken(address(token18))), 1 ether);
        assertEq(harness.toSuperTokenAmount(1, address(token20), ISuperToken(address(token18))), 0);
    }

    function test_fromSuperTokenAmount_covers_short_circuits_and_scaling() public view {
        assertEq(harness.fromSuperTokenAmount(0, address(token6), ISuperToken(address(token18))), 0);
        assertEq(harness.fromSuperTokenAmount(42, address(token6), ISuperToken(address(0))), 42);
        assertEq(harness.fromSuperTokenAmount(42, address(token18), ISuperToken(address(token18))), 42);
        assertEq(harness.fromSuperTokenAmount(1 ether, address(token6), ISuperToken(address(token18))), 1_000_000);
        assertEq(harness.fromSuperTokenAmount(1, address(token20), ISuperToken(address(token18))), 100);
    }
}
