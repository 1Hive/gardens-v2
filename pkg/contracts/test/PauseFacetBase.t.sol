// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {PauseFacetBase} from "../src/pausing/PauseFacetBase.sol";
import {LibPauseStorage} from "../src/pausing/LibPauseStorage.sol";
import {MockPauseController} from "./helpers/PauseHelpers.sol";
import {CommunityPauseFacet} from "../src/RegistryCommunity/facets/CommunityPauseFacet.sol";
import {CVPauseFacet} from "../src/CVStrategy/facets/CVPauseFacet.sol";
import {LibDiamond} from "../src/diamonds/libraries/LibDiamond.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract PauseFacetBaseHarness is PauseFacetBase {
    address public owner;

    function setOwner(address owner_) external {
        owner = owner_;
    }

    function setFacetForSelector(bytes4 selector, address facet) external {
        LibDiamond.diamondStorage().facetAddressAndSelectorPosition[selector].facetAddress = facet;
    }

    function coverageHook(uint256 seed) external pure returns (uint256) {
        return _coverageHook(seed);
    }

    function _pauseOwner() internal view override returns (address) {
        return owner;
    }
}

contract CommunityPauseFacetHarness is CommunityPauseFacet {
    function initializeHarness(address owner_) external {
        initialize(owner_);
    }
}

contract CVPauseFacetHarness is CVPauseFacet {
    function setOwner(address owner_) external {
        LibDiamond.setContractOwner(owner_);
    }
}

contract LibPauseStorageHarness {
    function setPauseController(address controller) external {
        LibPauseStorage.layout().pauseController = controller;
    }

    function setPauseFacet(address facet) external {
        LibPauseStorage.layout().pauseFacet = facet;
    }

    function getPauseController() external view returns (address) {
        return LibPauseStorage.layout().pauseController;
    }

    function getPauseFacet() external view returns (address) {
        return LibPauseStorage.layout().pauseFacet;
    }
}

contract PauseFacetBaseTest is Test {
    PauseFacetBaseHarness internal facet;
    MockPauseController internal controller;

    function setUp() public {
        facet = new PauseFacetBaseHarness();
        controller = new MockPauseController();
        facet.setOwner(address(this));
    }

    function test_setPauseController_requires_owner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(
            abi.encodeWithSelector(PauseFacetBase.NotOwner.selector, address(0xBEEF), address(this))
        );
        facet.setPauseController(address(controller));

        facet.setPauseController(address(controller));
        assertEq(facet.pauseController(), address(controller));
    }

    function test_setPauseFacet_owner_updates() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(
            abi.encodeWithSelector(PauseFacetBase.NotOwner.selector, address(0xBEEF), address(this))
        );
        facet.setPauseFacet(address(0x1234));

        facet.setPauseFacet(address(0x1234));
        assertEq(facet.pauseFacet(), address(0x1234));

        facet.setPauseFacet(address(0));
        assertEq(facet.pauseFacet(), address(0x1234));
    }

    function test_pause_and_unpause_toggle_controller() public {
        facet.setPauseController(address(controller));

        facet.pause(10);
        assertTrue(controller.isPaused(address(this)));

        facet.unpause();
        assertFalse(controller.isPaused(address(this)));

        bytes4 selector = bytes4(0x12345678);
        facet.pause(selector, 5);
        assertTrue(controller.isPaused(address(this), selector));

        facet.unpause(selector);
        assertFalse(controller.isPaused(address(this), selector));
    }

    function test_isPaused_without_controller_false() public {
        assertFalse(facet.isPaused());
        assertFalse(facet.isPaused(bytes4(0x12345678)));
    }

    function test_isPaused_with_controller() public {
        facet.setPauseController(address(controller));

        controller.setGlobalPaused(true);
        assertTrue(facet.isPaused());

        bytes4 selector = bytes4(0x12345678);
        assertTrue(facet.isPaused(selector));

        controller.setGlobalPaused(false);
        controller.setSelectorPaused(selector, true);
        assertFalse(facet.isPaused());
        assertTrue(facet.isPaused(selector));
    }

    function test_paused_until_requires_controller() public {
        vm.expectRevert(PauseFacetBase.PauseControllerNotSet.selector);
        facet.pausedUntil();

        vm.expectRevert(PauseFacetBase.PauseControllerNotSet.selector);
        facet.pausedSelectorUntil(bytes4(0x12345678));

        facet.setPauseController(address(controller));
        controller.setGlobalPaused(true);
        controller.setSelectorPaused(bytes4(0x12345678), true);

        assertEq(facet.pausedUntil(), 1);
        assertEq(facet.pausedSelectorUntil(bytes4(0x12345678)), 1);
    }

    function test_registerPauseFacet_updates_when_registered() public {
        bytes4 selector = bytes4(keccak256("setPauseController(address)"));
        address expectedFacet = address(0xF00D);
        facet.setFacetForSelector(selector, expectedFacet);

        facet.setPauseController(address(controller));
        assertEq(facet.pauseFacet(), expectedFacet);
    }

    function test_communityPauseFacet_uses_owner() public {
        CommunityPauseFacetHarness impl = new CommunityPauseFacetHarness();
        CommunityPauseFacetHarness community = CommunityPauseFacetHarness(
            payable(
                address(new ERC1967Proxy(address(impl), abi.encodeWithSelector(impl.initializeHarness.selector, address(this))))
            )
        );
        community.setPauseController(address(controller));
        assertEq(community.pauseController(), address(controller));

        vm.prank(address(0xBEEF));
        vm.expectRevert(
            abi.encodeWithSelector(PauseFacetBase.NotOwner.selector, address(0xBEEF), address(this))
        );
        community.setPauseController(address(controller));
    }

    function test_cvPauseFacet_uses_owner() public {
        CVPauseFacetHarness cv = new CVPauseFacetHarness();
        cv.setOwner(address(this));
        cv.setPauseController(address(controller));
        assertEq(cv.pauseController(), address(controller));

        cv.setOwner(address(0xCAFE));
        vm.expectRevert(
            abi.encodeWithSelector(PauseFacetBase.NotOwner.selector, address(this), address(0xCAFE))
        );
        cv.setPauseController(address(controller));
    }

    function test_libPauseStorage_layout_roundtrip() public {
        LibPauseStorageHarness harness = new LibPauseStorageHarness();
        harness.setPauseController(address(controller));
        harness.setPauseFacet(address(0xBEEF));

        assertEq(harness.getPauseController(), address(controller));
        assertEq(harness.getPauseFacet(), address(0xBEEF));
    }

    function test_coverageHook_executes() public {
        uint256 result = facet.coverageHook(7);
        assertGt(result, 0);
    }
}
