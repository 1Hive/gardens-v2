// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {GV2ERC20} from "../script/GV2ERC20.sol";
import {CVStrategyBaseFacet} from "../src/CVStrategy/CVStrategyBaseFacet.sol";
import {MockPauseController} from "./helpers/PauseHelpers.sol";

import {PointSystem} from "../src/CVStrategy/CVStrategy.sol";
import {
    CVStrategyBaseFacetHarness,
    MockAlloWithPool,
    MockRegistryCommunity,
    MockSybilScorer
} from "./helpers/CVStrategyHelpers.sol";

contract MockExternalVotingPowerRegistryBase {
    mapping(address => uint256) public power;

    function setMemberPower(address _member, uint256 amount) external {
        power[_member] = amount;
    }

    function getMemberPowerInStrategy(address _member, address) external view returns (uint256) {
        return power[_member];
    }

    function getMemberStakedAmount(address) external pure returns (uint256) {
        return 0;
    }

    function ercAddress() external pure returns (address) {
        return address(0);
    }

    function isMember(address _member) external view returns (bool) {
        return power[_member] > 0;
    }
}

contract CVStrategyBaseFacetTest is Test {
    CVStrategyBaseFacetHarness internal facet;
    MockAlloWithPool internal allo;
    MockRegistryCommunity internal registryCommunity;
    MockSybilScorer internal sybil;
    GV2ERC20 internal baseToken;
    GV2ERC20 internal superToken;

    address internal councilSafe = makeAddr("councilSafe");
    address internal owner = makeAddr("owner");
    address internal member = makeAddr("member");
    address internal other = makeAddr("other");

    function setUp() public {
        facet = new CVStrategyBaseFacetHarness();
        allo = new MockAlloWithPool();
        registryCommunity = new MockRegistryCommunity();
        sybil = new MockSybilScorer();
        baseToken = new GV2ERC20("Base", "B", 6);
        superToken = new GV2ERC20("Super", "S", 18);

        facet.setAllo(address(allo));
        facet.setPoolId(1);
        facet.setRegistryCommunity(address(registryCommunity));
        facet.setVotingPowerRegistry(address(registryCommunity));
        registryCommunity.setCouncilSafe(councilSafe);
        facet.setContractOwner(owner);

        allo.setPoolToken(1, address(baseToken));
    }

    function test_onlyAllo_onlyInitialized_onlyRegistryCommunity() public {
        vm.expectRevert(abi.encodeWithSelector(CVStrategyBaseFacet.OnlyAllo.selector, address(this), address(allo)));
        facet.exposedOnlyAllo();

        vm.prank(address(allo));
        facet.exposedOnlyAllo();

        facet.setPoolId(0);
        vm.expectRevert(abi.encodeWithSelector(CVStrategyBaseFacet.OnlyInitialized.selector, 0));
        facet.exposedOnlyInitialized();

        facet.setPoolId(1);
        facet.exposedOnlyInitialized();

        vm.expectRevert(
            abi.encodeWithSelector(
                CVStrategyBaseFacet.OnlyRegistryCommunity.selector, address(this), address(registryCommunity)
            )
        );
        facet.exposedOnlyRegistryCommunity();

        vm.prank(address(registryCommunity));
        facet.exposedOnlyRegistryCommunity();
    }

    function test_checkSenderIsMember_and_onlyCouncilSafe() public {
        registryCommunity.setMember(member, true);
        facet.exposedCheckSenderIsMember(member);

        registryCommunity.setMember(member, false);
        vm.expectRevert(
            abi.encodeWithSelector(CVStrategyBaseFacet.OnlyMember.selector, member, address(registryCommunity))
        );
        facet.exposedCheckSenderIsMember(member);

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategyBaseFacet.OnlyCouncilSafe.selector, address(this), councilSafe, owner)
        );
        facet.exposedOnlyCouncilSafe();

        vm.prank(councilSafe);
        facet.exposedOnlyCouncilSafe();

        vm.prank(owner);
        facet.exposedOnlyCouncilSafe();
    }

    function test_onlyCouncilSafeOrMember_allowlistPaths() public {
        bytes32 role = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategyBaseFacet.OnlyCouncilSafeOrMember.selector, address(this), councilSafe)
        );
        facet.exposedOnlyCouncilSafeOrMember();

        registryCommunity.setRole(role, address(0), true);
        facet.exposedOnlyCouncilSafeOrMember();

        registryCommunity.setRole(role, address(0), false);
        registryCommunity.setRole(role, other, true);
        vm.prank(other);
        facet.exposedOnlyCouncilSafeOrMember();
    }

    function test_canExecuteAction_allowlist_false() public {
        bytes32 role = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));
        registryCommunity.setRole(role, address(0), false);
        assertFalse(facet.exposedCanExecuteAction(other));
    }

    function test_canExecuteAction_sybilScorer() public {
        facet.setSybilScorer(address(sybil));
        sybil.setCanExecute(other, false);
        assertFalse(facet.exposedCanExecuteAction(other));

        sybil.setCanExecute(other, true);
        assertTrue(facet.exposedCanExecuteAction(other));
    }

    function test_proposalExists_and_conviction() public {
        assertFalse(facet.exposedProposalExists(1));

        facet.setProposal(1, member, block.number, 0);
        assertTrue(facet.exposedProposalExists(1));

        facet.exposedCalculateAndSetConviction(1, 100);
        (uint256 conviction, uint256 blockNumber) = facet.exposedCheckBlockAndCalculateConviction(1, 100);
        assertEq(conviction, 0);
        assertEq(blockNumber, 0);

        vm.roll(block.number + 1);
        (conviction, blockNumber) = facet.exposedCheckBlockAndCalculateConviction(1, 100);
        assertGt(blockNumber, 0);
    }

    function test_pauseHelpers_enforceNotPaused() public {
        MockPauseController controller = new MockPauseController();
        facet.setPauseController(address(controller));

        bytes4 selector = bytes4(keccak256("doThing()"));
        controller.setGlobalPaused(false);
        facet.exposedEnforceNotPaused(selector);

        controller.setGlobalPaused(true);
        vm.expectRevert(
            abi.encodeWithSelector(CVStrategyBaseFacet.StrategyPaused.selector, address(controller))
        );
        facet.exposedEnforceNotPaused(selector);

        bytes4 pauseSelector = bytes4(keccak256("pause(uint256)"));
        facet.exposedEnforceNotPaused(pauseSelector);
    }

    function test_pauseHelpers_enforceSelectorNotPaused() public {
        MockPauseController controller = new MockPauseController();
        facet.setPauseController(address(controller));

        bytes4 selector = bytes4(keccak256("doOther()"));
        controller.setSelectorPaused(selector, true);
        vm.expectRevert(
            abi.encodeWithSelector(CVStrategyBaseFacet.StrategySelectorPaused.selector, selector, address(controller))
        );
        facet.exposedEnforceSelectorNotPaused(selector);

        controller.setSelectorPaused(selector, false);
        facet.exposedEnforceSelectorNotPaused(selector);

        bytes4 pauseSelector = bytes4(keccak256("pause(bytes4,uint256)"));
        controller.setSelectorPaused(pauseSelector, true);
        facet.exposedEnforceSelectorNotPaused(pauseSelector);
    }

    function test_pauseHelpers_modifiers() public {
        MockPauseController controller = new MockPauseController();
        facet.setPauseController(address(controller));

        controller.setGlobalPaused(true);
        vm.expectRevert(
            abi.encodeWithSelector(CVStrategyBaseFacet.StrategyPaused.selector, address(controller))
        );
        facet.guardedWhenNotPaused();

        bytes4 selector = bytes4(keccak256("someAction()"));
        controller.setGlobalPaused(false);
        controller.setSelectorPaused(selector, true);
        vm.expectRevert(
            abi.encodeWithSelector(CVStrategyBaseFacet.StrategySelectorPaused.selector, selector, address(controller))
        );
        facet.guardedWhenSelectorNotPaused(selector);

        controller.setSelectorPaused(selector, false);
        facet.guardedWhenSelectorNotPaused(selector);
    }

    function test_isPauseSelector_flags() public {
        bytes4 pauseSelector = bytes4(keccak256("pause(uint256)"));
        assertTrue(facet.exposedIsPauseSelector(pauseSelector));
        assertFalse(facet.exposedIsPauseSelector(bytes4(0x12345678)));
    }

    function test_getPoolAmount_scaling() public {
        baseToken.mint(address(facet), 1000);
        superToken.mint(address(facet), 2 ether);
        facet.setSuperfluidToken(address(superToken));

        uint256 amount = facet.exposedGetPoolAmount();
        assertGt(amount, 0);

        allo.setPoolToken(1, address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE));
        vm.deal(address(facet), 5 ether);
        amount = facet.exposedGetPoolAmount();
        assertEq(amount, 5 ether);
    }

    function test_getPoolAmount_upscale_when_decimals_gt_18() public {
        GV2ERC20 highDecimals = new GV2ERC20("High", "H", 20);
        GV2ERC20 superHigh = new GV2ERC20("SuperHigh", "SH", 18);
        allo.setPoolToken(1, address(highDecimals));
        facet.setSuperfluidToken(address(superHigh));

        highDecimals.mint(address(facet), 1000);
        superHigh.mint(address(facet), 1 ether);

        uint256 amount = facet.exposedGetPoolAmount();
        assertEq(amount, 1000 + 1e20);
    }

    function test_canExecuteAction_customPointSystem_externalRegistry_memberAllowed() public {
        MockExternalVotingPowerRegistryBase extRegistry = new MockExternalVotingPowerRegistryBase();
        extRegistry.setMemberPower(other, 5);

        facet.setPointSystem(PointSystem.Custom);
        facet.setVotingPowerRegistry(address(extRegistry));

        assertTrue(facet.exposedCanExecuteAction(other));
    }

    function test_canExecuteAction_customPointSystem_externalRegistry_nonMemberDenied() public {
        MockExternalVotingPowerRegistryBase extRegistry = new MockExternalVotingPowerRegistryBase();
        // other has 0 power (default)

        facet.setPointSystem(PointSystem.Custom);
        facet.setVotingPowerRegistry(address(extRegistry));

        assertFalse(facet.exposedCanExecuteAction(other));
    }

    function test_canExecuteAction_customPointSystem_defaultRegistry_fallsToAllowlist() public {
        // votingPowerRegistry == registryCommunity (set in setUp) → should use allowlist path
        facet.setPointSystem(PointSystem.Custom);

        // No allowlist role set → should be false
        assertFalse(facet.exposedCanExecuteAction(other));

        // Grant allowlist → should be true
        bytes32 role = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));
        registryCommunity.setRole(role, other, true);
        assertTrue(facet.exposedCanExecuteAction(other));
    }

    function test_canExecuteAction_nonCustomPointSystem_ignoresRegistry() public {
        MockExternalVotingPowerRegistryBase extRegistry = new MockExternalVotingPowerRegistryBase();
        extRegistry.setMemberPower(other, 10);

        // Unlimited + external registry with power → still uses allowlist path
        facet.setPointSystem(PointSystem.Unlimited);
        facet.setVotingPowerRegistry(address(extRegistry));

        // No allowlist → false despite having power in external registry
        assertFalse(facet.exposedCanExecuteAction(other));

        // Grant allowlist → true
        bytes32 role = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));
        registryCommunity.setRole(role, other, true);
        assertTrue(facet.exposedCanExecuteAction(other));
    }
}
