// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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
import {GasHelpers2} from "./shared/GasHelpers2.sol";
import {RegistryFactory} from "../src/RegistryFactory.sol";
import {CVStrategy} from "../src/CVStrategy.sol";
import {RegistryCommunity} from "../src/RegistryCommunity.sol";
import {Safe} from "safe-contracts/contracts/Safe.sol";
import {SafeSetup} from "./shared/SafeSetup.sol";

// @dev Run forge test --mc RegistryTest -vvvvv

contract RegistryTest is Test, AlloSetup, RegistrySetupFull, Native, Errors, GasHelpers2, SafeSetup {
    CVStrategy public strategy;
    MockERC20 public token;
    uint256 public mintAmount = 1_000_000 * 10 ** 18;
    uint256 public constant MINIMUM_STAKE = 1000;
    Metadata public metadata = Metadata({protocol: 1, pointer: "strategy pointer"});

    RegistryCommunity internal registryGardens;

    address gardenOwner = makeAddr("communityGardenOwner");
    address gardenMember = makeAddr("communityGardenMember");

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
        token.mint(gardenOwner, mintAmount);
        token.mint(gardenMember, mintAmount);
        token.approve(address(allo()), mintAmount);

        vm.prank(pool_admin());
        token.approve(address(allo()), mintAmount);

        //        strategy = address(new CVMockStrategy(address(allo())));
        strategy = new CVStrategy(address(allo()));
        //        strategy = address(new MockStrategy(address(allo())));

        vm.startPrank(allo_owner());
        allo().transferOwnership(local());
        vm.stopPrank();
        RegistryFactory registryFactory = new RegistryFactory();
        RegistryCommunity.InitializeParams memory params;
        params._allo = address(allo());
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._protocolFee = 2;
        params._metadata = metadata;
        params._councilSafe = payable(address(_councilSafe()));
        registryGardens = RegistryCommunity(registryFactory.createRegistry(params));
    }

    function _registryGardens() internal view returns (RegistryCommunity) {
        return registryGardens;
    }

    function test_stakeAndRegisterMember() public {
        startMeasuringGas("createProposal");
        allo().addToCloneableStrategies(address(strategy));

        vm.startPrank(gardenOwner);
        token.approve(address(registryGardens), MINIMUM_STAKE);
        _registryGardens().stakeAndRegisterMember();
        assertEq(token.balanceOf(address(registryGardens)), MINIMUM_STAKE);
        assertEq(token.balanceOf(address(gardenOwner)), mintAmount - MINIMUM_STAKE);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_unregisterMember() public {
        startMeasuringGas("registering and unregistering member");
        vm.startPrank(gardenMember);
        token.approve(address(registryGardens), MINIMUM_STAKE);
        _registryGardens().stakeAndRegisterMember();
        _registryGardens().unregisterMember(gardenMember);
        assertTrue(!_registryGardens().isMember(gardenMember));
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_updateProtocolFee() public {
        startMeasuringGas("Updating protocol fee");
        vm.startPrank(address(councilSafe));
        _registryGardens().updateProtocolFee(5);
        assertEq(_registryGardens().protocolFee(), 5);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_addStrategy() public {
        startMeasuringGas("Adding strategy");
        vm.startPrank(address(councilSafe));
        _registryGardens().addStrategy(address(strategy));
        assertEq(_registryGardens().enabledStrategies(address(strategy)), true);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_removeStrategy() public {
        startMeasuringGas("Testing strategy removal");
        vm.startPrank(address(councilSafe));
        _registryGardens().addStrategy(address(strategy));
        assertEq(_registryGardens().enabledStrategies(address(strategy)), true);
        _registryGardens().removeStrategy(address(strategy));
        assertEq(_registryGardens().enabledStrategies(address(strategy)), false);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_setBasisStake() public {
        startMeasuringGas("Testing strategy removal");
        vm.startPrank(address(councilSafe));
        _registryGardens().setBasisStakedAmount(500);
        assertEq(_registryGardens().registerStakeAmount(), 500);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_revertUpdateProtocolFee() public {
        startMeasuringGas("Testing update protocol revert");
        vm.startPrank(gardenOwner);
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserNotInCouncil.selector));
        _registryGardens().updateProtocolFee(5);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_revertSetBasisStakeAmount() public {
        startMeasuringGas("Testing setBasisStake revert");
        vm.startPrank(gardenOwner);
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserNotInCouncil.selector));
        _registryGardens().setBasisStakedAmount(500);
        vm.stopPrank();
        stopMeasuringGas();
    }
}
