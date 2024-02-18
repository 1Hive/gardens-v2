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

import {CVStrategyHelpers} from "./CVStrategyHelpers.sol";

import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
// @dev Run forge test --mc RegistryTest -vvvvv

contract RegistryTest is Test, AlloSetup, RegistrySetupFull, CVStrategyHelpers, Errors, GasHelpers2, SafeSetup {
    CVStrategy public strategy;
    MockERC20 public token;
    uint256 public mintAmount = 1_000_000 * 10 ** 18;
    uint256 public constant MINIMUM_STAKE = 1000 * 10 ** 18;
    uint256 public constant PROTOCOL_FEE_PERCENTAGE = 1;
    uint256 public constant COMMUNITY_FEE_PERCENTAGE = 3;
    uint256 public constant STAKE_WITH_FEES =
        MINIMUM_STAKE + (MINIMUM_STAKE * (COMMUNITY_FEE_PERCENTAGE + PROTOCOL_FEE_PERCENTAGE)) / 100;

    // Metadata public metadata = Metadata({protocol: 1, pointer: "strategy pointer"});

    RegistryFactory internal registryFactory;
    RegistryCommunity internal registryCommunity;
    RegistryCommunity internal nonKickableCommunity;

    address gardenOwner = makeAddr("communityGardenOwner");
    address gardenMember = makeAddr("communityGardenMember");
    address protocolFeeReceiver = makeAddr("multisigReceiver");
    address daoFeeReceiver = makeAddr("daoFeeReceiver");

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

        vm.startPrank(pool_admin());
        token.approve(address(allo()), mintAmount);

        //        strategy = address(new CVMockStrategy(address(allo())));
        strategy = new CVStrategy(address(allo()));
        //        strategy = address(new MockStrategy(address(allo())));
        // uint256 poolId = createPool(
        //     allo(), address(strategy), address(_registryCommunity()), registry(), NATIVE, CVStrategy.ProposalType(0)
        // );
        vm.stopPrank();
        vm.startPrank(allo_owner());
        allo().transferOwnership(local());
        vm.stopPrank();
        vm.startPrank(gardenOwner);
        registryFactory = new RegistryFactory();
        _registryFactory().setReceiverAddress(address(protocolFeeReceiver));
        vm.stopPrank();
        RegistryCommunity.InitializeParams memory params;
        params._allo = address(allo());
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = COMMUNITY_FEE_PERCENTAGE;
        params._metadata = metadata;
        params._feeReceiver = address(daoFeeReceiver);
        params._councilSafe = payable(address(_councilSafe()));

        params._isKickEnabled = true;
        registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));
        vm.startPrank(gardenOwner);
        _registryFactory().setProtocolFee(address(registryCommunity), PROTOCOL_FEE_PERCENTAGE);
        vm.stopPrank();
        params._isKickEnabled = false;
        nonKickableCommunity = RegistryCommunity(registryFactory.createRegistry(params));
    }

    function _registryCommunity() internal view returns (RegistryCommunity) {
        return registryCommunity;
    }

    function _registryFactory() internal view returns (RegistryFactory) {
        return registryFactory;
    }

    function _nonKickableCommunity() internal view returns (RegistryCommunity) {
        return nonKickableCommunity;
    }

    function test_stakeAndRegisterMember() public {
        startMeasuringGas("createProposal");
        allo().addToCloneableStrategies(address(strategy));
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);

        _registryCommunity().stakeAndRegisterMember();
        assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE);
        assertEq(token.balanceOf(address(gardenMember)), mintAmount - STAKE_WITH_FEES);
        uint256 protocolAmount = (MINIMUM_STAKE * PROTOCOL_FEE_PERCENTAGE) / 100;
        uint256 feeAmount = (MINIMUM_STAKE * COMMUNITY_FEE_PERCENTAGE) / 100;
        assertEq(token.balanceOf(address(protocolFeeReceiver)), protocolAmount);
        assertEq(token.balanceOf(address(daoFeeReceiver)), feeAmount);

        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_stakeAndRegisterMember_4_times() public {
        startMeasuringGas("createProposal");
        allo().addToCloneableStrategies(address(strategy));
        address[] memory members = new address[](4);
        members[0] = address(0x1);
        members[1] = address(0x2);
        members[2] = address(0x3);
        members[3] = address(0x4);

        for (uint256 i = 0; i < members.length; i++) {
            vm.startPrank(members[i]);
            token.mint(members[i], mintAmount);
            token.approve(address(registryCommunity), STAKE_WITH_FEES);

            _registryCommunity().stakeAndRegisterMember();
            vm.stopPrank();

            assertEq(token.balanceOf(address(registryCommunity)), MINIMUM_STAKE * (i + 1), "Registry balance");
            assertEq(token.balanceOf(members[i]), mintAmount - STAKE_WITH_FEES, "Member balance");

            uint256 protocolAmount = (MINIMUM_STAKE * PROTOCOL_FEE_PERCENTAGE * (i + 1)) / 100;
            uint256 feeAmount = (MINIMUM_STAKE * COMMUNITY_FEE_PERCENTAGE * (i + 1)) / 100;
            assertEq(token.balanceOf(address(protocolFeeReceiver)), protocolAmount, "Protocol balance");
            assertEq(token.balanceOf(address(daoFeeReceiver)), feeAmount, "DAO balance");
        }

        stopMeasuringGas();
    }

    function test_unregisterMember() public {
        startMeasuringGas("Registering and unregistering member");
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember();
        _registryCommunity().unregisterMember();
        assertTrue(!_registryCommunity().isMember(gardenMember));
        uint256 feesAmount = (MINIMUM_STAKE * (COMMUNITY_FEE_PERCENTAGE + PROTOCOL_FEE_PERCENTAGE)) / 100;
        assertEq(token.balanceOf(address(registryCommunity)), 0);
        assertEq(token.balanceOf(address(gardenMember)), mintAmount - feesAmount);
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_setProtocolFee() public {
        startMeasuringGas("Setting protocol fee");
        vm.startPrank(gardenOwner);
        _registryFactory().setProtocolFee(address(registryCommunity), 2);
        assertEq(_registryFactory().getProtocolFee(address(registryCommunity)), 2);
        vm.stopPrank();
    }
    

    function test_kickMember() public {
        startMeasuringGas("Registering and kicking member");
        
        //TODO: fix createProposal
        //(IAllo.Pool memory pool,,) = _createProposal(NATIVE, 0, 0);

        //CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        
        vm.startPrank(pool_admin());
        uint256 poolId = createPool(
            allo(), address(strategy), address(_registryCommunity()), registry(), NATIVE, CVStrategy.ProposalType(0)
        );
        vm.stopPrank();
        vm.startPrank(address(councilSafe));
        _registryCommunity().addStrategy(address(strategy));
        vm.stopPrank();
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember();
        //vm.expectRevert("error");
        strategy.activatePoints();
        vm.stopPrank();
        assertEq(_registryCommunity().memberPowerInStrategy(gardenMember,address(strategy)),100 * 10 ** 4);
        assertEq(strategy.memberPointsBalance(gardenMember), 100 * 10 ** 4);
        //assertEq(strategy.activatedPointsIn)
        vm.startPrank(address(councilSafe));
        _registryCommunity().kickMember(gardenMember, address(councilSafe));
        assertTrue(!_registryCommunity().isMember(gardenMember));
        assertEq(token.balanceOf(address(councilSafe)), MINIMUM_STAKE);
        assertEq(_registryCommunity().memberPowerInStrategy(gardenMember,address(strategy)),0);
        assertEq(strategy.memberPointsBalance(gardenMember),0);
        // assertTrue(!_registryCommunity().memberActivatedInStrategies(gardenMember,address(strategy)));
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_revertKickMemberBool() public {
        startMeasuringGas("Registering and kicking member");
        vm.startPrank(gardenMember);
        token.approve(address(nonKickableCommunity), STAKE_WITH_FEES);
        _nonKickableCommunity().stakeAndRegisterMember();
        vm.stopPrank();
        vm.startPrank(address(councilSafe));
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.KickNotEnabled.selector));
        _nonKickableCommunity().kickMember(gardenMember, address(councilSafe));
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_revertKickUnregisteredMember() public {
        startMeasuringGas("Registering and kicking member");
        vm.startPrank(address(councilSafe));
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserNotInRegistry.selector));
        _registryCommunity().kickMember(gardenMember, address(councilSafe));
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_revertKickNotCouncil() public {
        startMeasuringGas("Registering and kicking member");
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember();
        vm.stopPrank();
        vm.startPrank(gardenOwner);
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserNotInCouncil.selector));
        _registryCommunity().kickMember(gardenMember, address(councilSafe));
        vm.stopPrank();
        stopMeasuringGas();
    }

    function test_updateCommunityFee() public {
        startMeasuringGas("Updating protocol fee");
        vm.startPrank(address(councilSafe));
        _registryCommunity().updateCommunityFee(5);
        assertEq(_registryCommunity().communityFee(), 5);
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

    function test_revertUpdateCommunityFee() public {
        startMeasuringGas("Testing update protocol revert");
        vm.startPrank(gardenOwner);
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserNotInCouncil.selector));
        _registryCommunity().updateCommunityFee(5);
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
