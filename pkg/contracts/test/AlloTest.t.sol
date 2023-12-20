// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";

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
import {CVStrategy, IRegistryGardens} from "../src/CVStrategy.sol";

contract TestAllo is Test, AlloSetup, RegistrySetupFull, Native, Errors, GasHelpers {
    IStrategy public strategy;
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

        //        strategy = address(new CVMockStrategy(address(allo())));
        strategy = new CVStrategy(address(allo()));
        //        strategy = address(new MockStrategy(address(allo())));

        vm.startPrank(allo_owner());
        allo().transferOwnership(local());
        vm.stopPrank();
    }

    function _registryGardens() internal pure returns (IRegistryGardens) {
        return IRegistryGardens(address(0));
    }

    event PoolCreated(
        uint256 indexed poolId,
        bytes32 indexed profileId,
        IStrategy strategy,
        address token,
        uint256 amount,
        Metadata metadata
    );

    //        bytes data;

    function test_createProposal() public {
        startMeasuringGas("createProposal");
        allo().addToCloneableStrategies(address(strategy));

        vm.expectEmit(true, true, false, false);
        emit PoolCreated(1, poolProfile_id(), IStrategy(strategy), NATIVE, 0, metadata);

        vm.prank(pool_admin());

        CVStrategy.InitializeParams memory params =
            CVStrategy.InitializeParams(address(_registryGardens()), 10, 1, 1, 1);

        uint256 poolId = allo().createPool(
            poolProfile_id(), address(strategy), abi.encode(params), NATIVE, 0, metadata, pool_managers()
        );

        IAllo.Pool memory pool = allo().getPool(poolId);

        vm.deal(address(this), 1 ether);
        allo().fundPool{value:1 ether}(poolId, 1 ether);

        stopMeasuringGas();

        assertEq(pool.profileId, poolProfile_id());
        assertNotEq(address(pool.strategy), address(strategy));

        CVStrategy.CreateProposal memory proposal = CVStrategy.CreateProposal(
            1, poolId, pool_admin(), pool_admin(), CVStrategy.ProposalType.Signaling, 0.1 ether, NATIVE
        );

        bytes memory data = abi.encode(proposal);
        allo().registerRecipient(poolId, data);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        (address submitter,,,,,,,,,) = cv.getProposal(1);

        data = abi.encode(1, 0.01 ether);
        allo().allocate(poolId, data);
    }
}
