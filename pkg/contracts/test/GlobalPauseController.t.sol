// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {GlobalPauseController} from "../src/pausing/GlobalPauseController.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract GlobalPauseControllerTest is Test {
    GlobalPauseController internal controller;

    address internal owner = address(this);
    address internal target = address(0xBEEF);
    bytes4 internal selector = bytes4(0x12345678);

    function setUp() public {
        GlobalPauseController impl = new GlobalPauseController();
        controller = GlobalPauseController(
            address(new ERC1967Proxy(address(impl), abi.encodeWithSelector(GlobalPauseController.initialize.selector, owner)))
        );
    }

    function test_initialize_sets_owner() public {
        assertEq(controller.owner(), owner);
    }

    function test_pause_only_authorized() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(abi.encodeWithSelector(GlobalPauseController.NotAuthorized.selector, address(0xBAD), target));
        controller.pause(target, 10);

        vm.prank(target);
        controller.pause(target, 10);
        assertTrue(controller.isPaused(target));
    }

    function test_pause_invalid_duration() public {
        vm.expectRevert(abi.encodeWithSelector(GlobalPauseController.InvalidDuration.selector, 0));
        controller.pause(target, 0);

        uint256 duration = type(uint64).max;
        vm.expectRevert(abi.encodeWithSelector(GlobalPauseController.InvalidDuration.selector, duration));
        controller.pause(target, duration);
    }

    function test_unpause_clears_state() public {
        controller.pause(target, 10);
        controller.unpause(target);
        assertFalse(controller.isPaused(target));
        assertEq(controller.pausedUntil(target), 0);
    }

    function test_pauseSelector_and_unpauseSelector() public {
        controller.pauseSelector(target, selector, 5);
        assertTrue(controller.isPaused(target, selector));

        controller.unpauseSelector(target, selector);
        assertFalse(controller.isPaused(target, selector));
        assertEq(controller.pausedSelectorUntil(target, selector), 0);
    }

    function test_isPaused_selector_inherits_global() public {
        uint256 start = block.timestamp;
        controller.pause(target, 5);
        assertTrue(controller.isPaused(target));
        assertTrue(controller.isPaused(target, selector));
        assertEq(controller.pausedUntil(target), start + 5);

        vm.warp(start + 6);
        assertFalse(controller.isPaused(target));
        assertFalse(controller.isPaused(target, selector));
    }

    function test_pauseSelector_authorized_by_owner() public {
        controller.pauseSelector(target, selector, 3);
        assertTrue(controller.isPaused(target, selector));
    }

    function test_unpause_only_authorized() public {
        controller.pause(target, 10);

        vm.prank(address(0xBAD));
        vm.expectRevert(abi.encodeWithSelector(GlobalPauseController.NotAuthorized.selector, address(0xBAD), target));
        controller.unpause(target);

        vm.prank(target);
        controller.unpause(target);
        assertFalse(controller.isPaused(target));
    }
}
