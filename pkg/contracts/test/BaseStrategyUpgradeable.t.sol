// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {BaseStrategyUpgradeable} from "../src/BaseStrategyUpgradeable.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IStrategy} from "allo-v2-contracts/core/interfaces/IStrategy.sol";
import {Errors} from "allo-v2-contracts/core/libraries/Errors.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockAllo {
    mapping(uint256 => mapping(address => bool)) public managers;

    function setPoolManager(uint256 poolId, address manager, bool allowed) external {
        managers[poolId][manager] = allowed;
    }

    function isPoolManager(uint256 poolId, address account) external view returns (bool) {
        return managers[poolId][account];
    }
}

contract BaseStrategyUpgradeableHarness is BaseStrategyUpgradeable {
    function initializeHarness(address allo_, string memory name_, address owner_) external initializer {
        init(allo_, name_, owner_);
    }

    // IStrategy implementation stubs for compilation
    function initialize(uint256 poolId_, bytes memory data) external override {
        __BaseStrategy_init(poolId_);
        emit Initialized(poolId_, data);
    }

    function registerRecipient(bytes memory, address) external payable override returns (address) {
        return address(0);
    }

    function allocate(bytes memory, address) external payable override {}

    function distribute(address[] memory, bytes memory, address) external override {}

    function getPoolAmount() external view override returns (uint256) {
        return poolAmount;
    }

    function callBaseStrategyInit(uint256 poolId_) external {
        __BaseStrategy_init(poolId_);
    }

    // Exposed helpers to reach internal checks
    function exposedCheckOnlyAllo() external view {
        _checkOnlyAllo();
    }

    function exposedCheckOnlyPoolManager(address sender) external view {
        _checkOnlyPoolManager(sender);
    }

    function exposedCheckOnlyActivePool() external view {
        _checkOnlyActivePool();
    }

    function exposedCheckInactivePool() external view {
        _checkInactivePool();
    }

    function exposedCheckOnlyInitialized() external view {
        _checkOnlyInitialized();
    }

    function exposedSetPoolActive(bool active) external {
        _setPoolActive(active);
    }

    function exposedIsPoolActive() external view returns (bool) {
        return _isPoolActive();
    }

    function onlyAlloModifier() external onlyAllo {}

    function onlyPoolManagerModifier(address sender) external onlyPoolManager(sender) {}

    function onlyActivePoolModifier() external onlyActivePool {}

    function onlyInactivePoolModifier() external onlyInactivePool {}

    function onlyInitializedModifier() external onlyInitialized {}
}

contract BaseStrategyUpgradeableTest is Test {
    event PoolActive(bool active);
    event Initialized(uint256 poolId, bytes data);

    BaseStrategyUpgradeableHarness internal strategy;
    MockAllo internal allo;
    address internal owner = makeAddr("owner");
    address internal manager = makeAddr("manager");
    address internal rando = makeAddr("rando");

    function setUp() public {
        allo = new MockAllo();
        BaseStrategyUpgradeableHarness impl = new BaseStrategyUpgradeableHarness();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(BaseStrategyUpgradeableHarness.initializeHarness.selector, address(allo), "TEST_STRATEGY", owner)
        );
        strategy = BaseStrategyUpgradeableHarness(payable(address(proxy)));
    }

    function test_initSetsOwnerAndAllo() public {
        assertEq(address(strategy.getAllo()), address(allo));
        assertEq(strategy.owner(), owner);
        assertEq(strategy.getPoolId(), 0);
    }

    function test_onlyAlloGuard() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.UNAUTHORIZED.selector));
        strategy.exposedCheckOnlyAllo();

        vm.prank(address(allo));
        strategy.exposedCheckOnlyAllo();
    }

    function test_BaseStrategyInit_validatesCallerAndPoolId() public {
        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(Errors.INVALID.selector));
        strategy.callBaseStrategyInit(0);

        vm.prank(address(allo));
        strategy.callBaseStrategyInit(1);
        assertEq(strategy.getPoolId(), 1);

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(Errors.ALREADY_INITIALIZED.selector));
        strategy.callBaseStrategyInit(2);
    }

    function test_onlyInitializedGuard() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.NOT_INITIALIZED.selector));
        strategy.exposedCheckOnlyInitialized();

        vm.prank(address(allo));
        strategy.callBaseStrategyInit(7);

        strategy.exposedCheckOnlyInitialized();
    }

    function test_onlyPoolManagerGuard() public {
        vm.prank(address(allo));
        strategy.callBaseStrategyInit(3);

        vm.expectRevert(abi.encodeWithSelector(Errors.UNAUTHORIZED.selector));
        strategy.exposedCheckOnlyPoolManager(manager);

        allo.setPoolManager(3, manager, true);
        strategy.exposedCheckOnlyPoolManager(manager);
    }

    function test_initialize_requiresAllo() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.UNAUTHORIZED.selector));
        strategy.initialize(5, "");
    }

    function test_initialize_setsPoolIdAndEmits() public {
        bytes memory data = bytes("hello");
        vm.expectEmit(true, true, true, true, address(strategy));
        emit Initialized(9, data);

        vm.prank(address(allo));
        strategy.initialize(9, data);

        assertEq(strategy.getPoolId(), 9);
    }

    function test_initialize_revertsIfAlreadyInitialized() public {
        vm.prank(address(allo));
        strategy.initialize(4, "");

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(Errors.ALREADY_INITIALIZED.selector));
        strategy.initialize(6, "");
    }

    function test_initialize_revertsIfPoolIdZero() public {
        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(Errors.INVALID.selector));
        strategy.initialize(0, "");
    }

    function test_poolActiveStateAndGuards() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.POOL_INACTIVE.selector));
        strategy.exposedCheckOnlyActivePool();

        strategy.exposedCheckInactivePool();
        assertFalse(strategy.exposedIsPoolActive());

        vm.expectEmit(false, false, false, true);
        emit PoolActive(true);
        strategy.exposedSetPoolActive(true);

        assertTrue(strategy.exposedIsPoolActive());

        vm.expectRevert(abi.encodeWithSelector(Errors.POOL_ACTIVE.selector));
        strategy.exposedCheckInactivePool();

        strategy.exposedCheckOnlyActivePool();
    }

    function test_modifiers_executePaths() public {
        vm.expectRevert(abi.encodeWithSelector(Errors.UNAUTHORIZED.selector));
        strategy.onlyAlloModifier();

        vm.prank(address(allo));
        strategy.onlyAlloModifier();

        vm.expectRevert(abi.encodeWithSelector(Errors.NOT_INITIALIZED.selector));
        strategy.onlyInitializedModifier();

        vm.prank(address(allo));
        strategy.callBaseStrategyInit(11);
        strategy.onlyInitializedModifier();

        vm.expectRevert(abi.encodeWithSelector(Errors.UNAUTHORIZED.selector));
        strategy.onlyPoolManagerModifier(manager);

        allo.setPoolManager(11, manager, true);
        strategy.onlyPoolManagerModifier(manager);

        vm.expectRevert(abi.encodeWithSelector(Errors.POOL_INACTIVE.selector));
        strategy.onlyActivePoolModifier();

        strategy.onlyInactivePoolModifier();

        strategy.exposedSetPoolActive(true);
        strategy.onlyActivePoolModifier();

        vm.expectRevert(abi.encodeWithSelector(Errors.POOL_ACTIVE.selector));
        strategy.onlyInactivePoolModifier();
    }
}
