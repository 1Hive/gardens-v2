// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CommunityBaseFacet} from "../src/RegistryCommunity/CommunityBaseFacet.sol";
import {LibPauseStorage} from "../src/pausing/LibPauseStorage.sol";
import {MockPauseController} from "./helpers/PauseHelpers.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract CommunityBaseFacetHarness is CommunityBaseFacet {
    function initializeHarness(address owner_) external {
        initialize(owner_);
    }

    function setPauseController(address controller) external {
        LibPauseStorage.layout().pauseController = controller;
    }

    function exposedIsPauseSelector(bytes4 selector) external pure returns (bool) {
        return _isPauseSelector(selector);
    }

    function exposedEnforceNotPaused(bytes4 selector) external view {
        _enforceNotPaused(selector);
    }

    function exposedEnforceSelectorNotPaused(bytes4 selector) external view {
        _enforceSelectorNotPaused(selector);
    }

    function guardedWhenNotPaused() external whenNotPaused {}

    function guardedWhenSelectorNotPaused(bytes4 selector) external whenSelectorNotPaused(selector) {}
}

contract CommunityBaseFacetTest is Test {
    CommunityBaseFacetHarness internal facet;
    MockPauseController internal controller;

    function setUp() public {
        CommunityBaseFacetHarness impl = new CommunityBaseFacetHarness();
        facet = CommunityBaseFacetHarness(
            payable(
                address(new ERC1967Proxy(address(impl), abi.encodeWithSelector(impl.initializeHarness.selector, address(this))))
            )
        );
        controller = new MockPauseController();
    }

    function test_isPauseSelector_flags_known_selectors() public {
        bytes4 pauseSelector = bytes4(keccak256("pause(uint256)"));
        assertTrue(facet.exposedIsPauseSelector(pauseSelector));
        assertFalse(facet.exposedIsPauseSelector(bytes4(0xdeadbeef)));
    }

    function test_isPauseSelector_flags_all_pause_management_selectors() public {
        bytes4[10] memory selectors = [
            bytes4(keccak256("setPauseController(address)")),
            bytes4(keccak256("pause(uint256)")),
            bytes4(keccak256("pause(bytes4,uint256)")),
            bytes4(keccak256("unpause()")),
            bytes4(keccak256("unpause(bytes4)")),
            bytes4(keccak256("pauseController()")),
            bytes4(keccak256("isPaused()")),
            bytes4(keccak256("isPaused(bytes4)")),
            bytes4(keccak256("pausedUntil()")),
            bytes4(keccak256("pausedSelectorUntil(bytes4)"))
        ];

        for (uint256 i = 0; i < selectors.length; i++) {
            assertTrue(facet.exposedIsPauseSelector(selectors[i]));
        }
    }

    function test_public_constants_are_exposed() public view {
        assertEq(facet.VERSION(), "0.0");
        assertEq(facet.NATIVE(), 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
        assertEq(facet.PRECISION_SCALE(), 10 ** 4);
        assertEq(facet.MAX_STRATEGIES_PER_MEMBER(), 64);
        assertEq(facet.MAX_FEE(), 100_000);
        assertEq(facet.COUNCIL_MEMBER(), keccak256("COUNCIL_MEMBER"));
    }

    function test_enforceNotPaused_no_controller_passes() public {
        facet.exposedEnforceNotPaused(bytes4(0xdeadbeef));
    }

    function test_enforceNotPaused_reverts_when_paused() public {
        facet.setPauseController(address(controller));
        controller.setGlobalPaused(true);

        vm.expectRevert(
            abi.encodeWithSelector(CommunityBaseFacet.CommunityPaused.selector, address(controller))
        );
        facet.exposedEnforceNotPaused(bytes4(0xdeadbeef));
    }

    function test_enforceNotPaused_bypasses_pause_selector() public {
        facet.setPauseController(address(controller));
        controller.setGlobalPaused(true);

        bytes4 pauseSelector = bytes4(keccak256("pause(uint256)"));
        facet.exposedEnforceNotPaused(pauseSelector);
    }

    function test_enforceSelectorNotPaused_reverts_when_selector_paused() public {
        facet.setPauseController(address(controller));
        bytes4 selector = bytes4(0x12345678);
        controller.setSelectorPaused(selector, true);

        vm.expectRevert(
            abi.encodeWithSelector(
                CommunityBaseFacet.CommunitySelectorPaused.selector,
                selector,
                address(controller)
            )
        );
        facet.exposedEnforceSelectorNotPaused(selector);
    }

    function test_enforceSelectorNotPaused_no_controller_passes() public {
        facet.exposedEnforceSelectorNotPaused(bytes4(0x87654321));
    }

    function test_enforceSelectorNotPaused_bypasses_pause_selector() public {
        facet.setPauseController(address(controller));
        controller.setGlobalPaused(true);

        bytes4 selector = bytes4(keccak256("pause(bytes4,uint256)"));
        facet.exposedEnforceSelectorNotPaused(selector);
    }

    function test_whenNotPaused_allows_call() public {
        facet.guardedWhenNotPaused();
    }

    function test_whenSelectorNotPaused_allows_call() public {
        facet.guardedWhenSelectorNotPaused(bytes4(0x12345678));
    }

    function test_whenNotPaused_reverts_when_globally_paused() public {
        facet.setPauseController(address(controller));
        controller.setGlobalPaused(true);

        vm.expectRevert(
            abi.encodeWithSelector(CommunityBaseFacet.CommunityPaused.selector, address(controller))
        );
        facet.guardedWhenNotPaused();
    }

    function test_whenSelectorNotPaused_reverts_when_selector_paused() public {
        facet.setPauseController(address(controller));
        bytes4 selector = bytes4(0x12345678);
        controller.setSelectorPaused(selector, true);

        vm.expectRevert(
            abi.encodeWithSelector(
                CommunityBaseFacet.CommunitySelectorPaused.selector,
                selector,
                address(controller)
            )
        );
        facet.guardedWhenSelectorNotPaused(selector);
    }
}
