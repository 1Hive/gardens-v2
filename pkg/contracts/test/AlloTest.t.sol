// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IStrategy} from "allo-v2-contracts/core/interfaces/IStrategy.sol";
// Core contracts
import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
// Internal Libraries
import {Errors} from "allo-v2-contracts/core/libraries/Errors.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
// Test libraries
import {AlloSetup} from "allo-v2-test/foundry/shared/AlloSetup.sol";
import {RegistrySetupFull} from "allo-v2-test/foundry/shared/RegistrySetup.sol";
import {TestStrategy} from "allo-v2-test/utils/TestStrategy.sol";
import {MockStrategy} from "allo-v2-test/utils/MockStrategy.sol";
import {MockERC20} from "allo-v2-test/utils/MockERC20.sol";
import {GasHelpers} from "allo-v2-test/utils/GasHelpers.sol";

import {CVMockStrategy} from "./CVMockStrategy.sol";

contract TestAllo is Test, AlloSetup, RegistrySetupFull, Native, Errors, GasHelpers {
    address public strategy;
    MockERC20 public token;
    uint256 public mintAmount = 1_000_000 * 10 ** 18;

    Metadata public metadata = Metadata({protocol: 1, pointer: "strategy pointer"});

    function setUp() public {
        __RegistrySetupFull();
        __AlloSetup(address(registry()));

        vm.startPrank(allo_owner());
        allo().updateBaseFee(0);
        allo().updatePercentFee(0);
        vm.stopPrank();

        token = new MockERC20();
        token.mint(local(), mintAmount);
        token.mint(allo_owner(), mintAmount);
        token.mint(pool_admin(), mintAmount);
        token.approve(address(allo()), mintAmount);

        vm.prank(pool_admin());
        token.approve(address(allo()), mintAmount);

        strategy = address(new CVMockStrategy(address(allo())));
//        strategy = address(new MockStrategy(address(allo())));

        vm.startPrank(allo_owner());
        allo().transferOwnership(local());
        vm.stopPrank();
    }

    event PoolCreated(
        uint256 indexed poolId,
        bytes32 indexed profileId,
        IStrategy strategy,
        address token,
        uint256 amount,
        Metadata metadata
    );

    function test_createPool() public {
        startMeasuringGas("createPool");
        allo().addToCloneableStrategies(strategy);

        vm.expectEmit(true, true, false, false);
        emit PoolCreated(1, poolProfile_id(), IStrategy(strategy), NATIVE, 0, metadata);

        vm.prank(pool_admin());

        uint256 poolId = allo().createPool(poolProfile_id(), strategy, "0x", NATIVE, 0, metadata, pool_managers());
        //
        IAllo.Pool memory pool = allo().getPool(poolId);
        stopMeasuringGas();
    //
        assertEq(pool.profileId, poolProfile_id());
        assertNotEq(address(pool.strategy), address(strategy));
        //
    }
}
