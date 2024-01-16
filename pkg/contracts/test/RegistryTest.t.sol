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

    RegistryCommunity internal registryCommunity;
    RegistryCommunity internal nonKickableCommunity;

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
        params._isKickEnabled = true;
        registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));
        params._isKickEnabled = false;
        nonKickableCommunity = RegistryCommunity(registryFactory.createRegistry(params));

    }
    function _registryCommunity() internal view returns (RegistryCommunity) {
        return registryCommunity;
    }

    function _nonKickableCommunity() internal view returns (RegistryCommunity) {
        return nonKickableCommunity;
    }

    function test_stakeAndRegisterMember() public {
        startMeasuringGas("createProposal");
        allo().addToCloneableStrategies(address(strategy));

        vm.startPrank(gardenOwner);
        token.approve(address(registryCommunity), MINIMUM_STAKE);
        _registryCommunity().stakeAndRegisterMember();
        assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE);
        assertEq(token.balanceOf(address(gardenOwner)), mintAmount - MINIMUM_STAKE);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_unregisterMember() public {
        startMeasuringGas("Registering and unregistering member");
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), MINIMUM_STAKE);
        _registryCommunity().stakeAndRegisterMember();
        _registryCommunity().unregisterMember();
        assertTrue(!_registryCommunity().isMember(gardenMember));
        vm.stopPrank();
        stopMeasuringGas();
    }
    function test_kickMember() public {
        startMeasuringGas("Registering and kicking member");
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), MINIMUM_STAKE);
        _registryCommunity().stakeAndRegisterMember();
        vm.stopPrank();
        vm.startPrank(address(councilSafe));
        _registryCommunity().kickMember(gardenMember,address(councilSafe));
        assertTrue(!_registryCommunity().isMember(gardenMember));
        assertEq(token.balanceOf(address(councilSafe)),MINIMUM_STAKE);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_revertKickMemberBool() public {
        startMeasuringGas("Registering and kicking member");
        vm.startPrank(gardenMember);
        token.approve(address(nonKickableCommunity), MINIMUM_STAKE);
        _nonKickableCommunity().stakeAndRegisterMember();
        vm.stopPrank();
        vm.startPrank(address(councilSafe));
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.KickNotEnabled.selector));
        _nonKickableCommunity().kickMember(gardenMember,address(councilSafe));
        vm.stopPrank();
        stopMeasuringGas();
    }
    function test_revertKickUnregisteredMember() public {
        startMeasuringGas("Registering and kicking member");
        vm.startPrank(address(councilSafe));
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserNotInRegistry.selector));
        _registryCommunity().kickMember(gardenMember,address(councilSafe));
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_revertKickNotCouncil() public {
        startMeasuringGas("Registering and kicking member");
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), MINIMUM_STAKE);
        _registryCommunity().stakeAndRegisterMember();
        vm.stopPrank();
        vm.startPrank(gardenOwner);
         vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserNotInCouncil.selector));
        _registryCommunity().kickMember(gardenMember,address(councilSafe));
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_updateProtocolFee() public {
        startMeasuringGas("Updating protocol fee");
        vm.startPrank(address(councilSafe));
        _registryCommunity().updateProtocolFee(5);
        assertEq(_registryCommunity().protocolFee(), 5);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_addStrategy() public {
        startMeasuringGas("Adding strategy");
        vm.startPrank(address(councilSafe));
        _registryCommunity().addStrategy(address(strategy));
        assertEq(_registryCommunity().enabledStrategies(address(strategy)), true);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_removeStrategy() public {
        startMeasuringGas("Testing strategy removal");
        vm.startPrank(address(councilSafe));
        _registryCommunity().addStrategy(address(strategy));
        assertEq(_registryCommunity().enabledStrategies(address(strategy)), true);
        _registryCommunity().removeStrategy(address(strategy));
        assertEq(_registryCommunity().enabledStrategies(address(strategy)), false);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_setBasisStake() public {
        startMeasuringGas("Testing strategy removal");
        vm.startPrank(address(councilSafe));
        _registryCommunity().setBasisStakedAmount(500);
        assertEq(_registryCommunity().registerStakeAmount(), 500);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_revertUnregisterMember() public {
        startMeasuringGas("Testing kick member revert");
        vm.startPrank(gardenOwner);
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserNotInRegistry.selector));
        _registryCommunity().unregisterMember();
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_revertUpdateProtocolFee() public {
        startMeasuringGas("Testing update protocol revert");
        vm.startPrank(gardenOwner);
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserNotInCouncil.selector));
        _registryCommunity().updateProtocolFee(5);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_revertSetBasisStakeAmount() public {
        startMeasuringGas("Testing setBasisStake revert");
        vm.startPrank(gardenOwner);
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserNotInCouncil.selector));
        _registryCommunity().setBasisStakedAmount(500);
        vm.stopPrank();
        stopMeasuringGas();
    }
}
