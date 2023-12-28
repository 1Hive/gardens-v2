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
import {GasHelpers} from "allo-v2-test/utils/GasHelpers.sol";
import {RegistryFactory} from "../src/RegistryFactory.sol";
import {CVStrategy} from "../src/CVStrategy.sol";
import {RegistryGardens} from "../src/RegistryGardens.sol";
// @dev Run forge test --mc RegistryTest -vvvvv

contract RegistryTest is Test, AlloSetup, RegistrySetupFull, Native, Errors, GasHelpers {
    CVStrategy public strategy;
    MockERC20 public token;
    uint256 public mintAmount = 1_000_000 * 10 ** 18;
    uint256 public constant MINIMUM_STAKE = 1000;
    Metadata public metadata = Metadata({protocol: 1, pointer: "strategy pointer"});

    RegistryGardens internal registryGardens;

    address gardenOwner = makeAddr("communityGardenOwner");

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
        RegistryGardens.InitializeParams memory params;
        params._allo = address(allo());
        params._gardenToken = IERC20(address(token));
        params._minimumStakeAmount = MINIMUM_STAKE;
        params._protocolFee = 2;
        params._metadata = metadata;
        registryGardens = RegistryGardens(registryFactory.createRegistry(params));
    }

    function _registryGardens() internal view returns (RegistryGardens) {
        return registryGardens;
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

    function test_stakeAndRegisterMember() public {
        startMeasuringGas("createProposal");
        allo().addToCloneableStrategies(address(strategy));

        vm.startPrank(gardenOwner);
        token.approve(address(registryGardens), MINIMUM_STAKE);
        _registryGardens().stakeAndregisterMember();
        assertEq(token.balanceOf(address(registryGardens)), MINIMUM_STAKE);
        // assertEq(token.balanceOf(address(gardenOwner)),mintAmount-MINIMUM_STAKE);

        vm.stopPrank();
        stopMeasuringGas();
    }
}
