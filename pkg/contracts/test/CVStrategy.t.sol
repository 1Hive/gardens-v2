// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {
    CVStrategy,
    ProposalType,
    ProposalStatus,
    PointSystem,
    CVParams,
    PointSystemConfig,
    ArbitrableConfig,
    CVStrategyInitializeParamsV0_2
} from "../src/CVStrategy/CVStrategy.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";

import {
    CVStrategyHarness,
    DummyFacet,
    MockAlloWithPool,
    MockRegistryCommunity,
    MockSybilScorer,
    MockCollateralVault,
    MockArbitrator
} from "./helpers/CVStrategyHelpers.sol";

contract CVStrategyTest is Test {
    CVStrategyHarness internal strategy;
    MockAlloWithPool internal allo;
    MockRegistryCommunity internal registryCommunity;
    MockSybilScorer internal sybil;
    MockCollateralVault internal collateralVault;
    DummyFacet internal dummyFacet;

    address internal owner = makeAddr("owner");
    address internal councilSafe = makeAddr("councilSafe");
    address internal member = makeAddr("member");
    address internal other = makeAddr("other");

    function setUp() public {
        allo = new MockAlloWithPool();
        registryCommunity = new MockRegistryCommunity();
        sybil = new MockSybilScorer();
        collateralVault = new MockCollateralVault();
        dummyFacet = new DummyFacet();

        strategy = new CVStrategyHarness();
        strategy.setAllo(address(allo));
        strategy.setPoolId(1);

        registryCommunity.setCouncilSafe(councilSafe);
        registryCommunity.setMember(member, true);
        strategy.setRegistryCommunity(address(registryCommunity));

        allo.setPoolToken(1, address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE));
    }

    function test_checkSenderIsMember_branches() public {
        vm.expectRevert(abi.encodeWithSelector(CVStrategy.UserCannotBeZero.selector, address(0)));
        strategy.exposedCheckSenderIsMember(address(0));

        strategy.setRegistryCommunity(address(0));
        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.RegistryCannotBeZero.selector, address(RegistryCommunity(address(0))))
        );
        strategy.exposedCheckSenderIsMember(member);

        strategy.setRegistryCommunity(address(registryCommunity));
        registryCommunity.setMember(member, false);
        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.UserNotInRegistry.selector, member, address(registryCommunity))
        );
        strategy.exposedCheckSenderIsMember(member);
    }

    function test_onlyRegistryCommunity_and_onlyCouncilSafe() public {
        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.OnlyCommunityAllowed.selector, address(this), address(registryCommunity))
        );
        strategy.exposedOnlyRegistryCommunity();

        vm.prank(address(registryCommunity));
        strategy.exposedOnlyRegistryCommunity();

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.OnlyCouncilSafe.selector, address(this), councilSafe, strategy.owner())
        );
        strategy.exposedOnlyCouncilSafe();

        vm.prank(councilSafe);
        strategy.exposedOnlyCouncilSafe();
    }

    function test_canExecuteAction_allowlist_and_sybil() public {
        bytes32 role = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));
        registryCommunity.setRole(role, address(0), true);
        assertTrue(strategy.exposedCanExecuteAction(other));

        registryCommunity.setRole(role, address(0), false);
        registryCommunity.setRole(role, other, true);
        assertTrue(strategy.exposedCanExecuteAction(other));

        strategy.setSybilScorer(address(sybil));
        sybil.setCanExecute(other, false);
        assertFalse(strategy.exposedCanExecuteAction(other));
        sybil.setCanExecute(other, true);
        assertTrue(strategy.exposedCanExecuteAction(other));
    }

    function test_checkProposalAllocationValidity_and_applyDelta() public {
        strategy.setProposal(1, member, 10, ProposalStatus.Inactive, block.number, 0);
        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.ProposalInvalidForAllocation.selector, 1, ProposalStatus.Inactive)
        );
        strategy.exposedCheckProposalAllocationValidity(1, 1);

        strategy.exposedCheckProposalAllocationValidity(1, 0);

        vm.expectRevert(abi.encodeWithSelector(CVStrategy.SupportUnderflow.selector, 0, int256(-1), int256(-1)));
        strategy.exposedApplyDelta(0, -1);
        assertEq(strategy.exposedApplyDelta(1, -1), 0);
    }

    function test_isOverMaxRatio_and_calculateThreshold() public {
        CVParams memory params = CVParams(1, 0, 1, 0);
        strategy.setCvParams(params);
        strategy.setTotalPointsActivated(100);

        vm.deal(address(strategy), 100);
        assertTrue(strategy.exposedIsOverMaxRatio(200));

        vm.expectRevert();
        strategy.calculateThreshold(200);
    }

    function test_getProposal_thresholdBranches() public {
        strategy.setCvParams(CVParams(1, 0, 0, 0));
        strategy.setProposal(1, member, 0, ProposalStatus.Active, block.number - 1, 0);
        assertEq(strategy.getProposalThreshold(1), 0);

        strategy.setProposal(2, member, 10, ProposalStatus.Active, block.number - 1, 0);
        assertEq(strategy.getProposalThreshold(2), 0);
    }

    function test_updateProposalConviction_and_setSybilScorer() public {
        vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalNotInList.selector, 99));
        strategy.updateProposalConviction(99);

        strategy.setProposal(1, member, 10, ProposalStatus.Active, block.number, 0);
        assertEq(strategy.updateProposalConviction(1), 0);

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.OnlyCouncilSafe.selector, address(this), councilSafe, strategy.owner())
        );
        strategy.setSybilScorer(address(sybil), 10);

        vm.prank(councilSafe);
        vm.expectRevert(abi.encodeWithSelector(CVStrategy.AddressCannotBeZero.selector, address(0)));
        strategy.setSybilScorer(address(0), 10);

        vm.prank(councilSafe);
        strategy.setSybilScorer(address(sybil), 10);
        assertEq(sybil.lastStrategy(), address(strategy));
    }

    function test_getPoolAmount_and_delegateToFacet() public {
        vm.deal(address(strategy), 3 ether);
        assertEq(strategy.getPoolAmount(), 3 ether);

        vm.expectRevert(
            abi.encodeWithSelector(
                CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.registerRecipient.selector
            )
        );
        strategy.registerRecipient("", address(0));
    }

    function test_stub_functions_and_getters() public {
        strategy.setPointConfig(250);
        strategy.setPointSystem(PointSystem.Unlimited);
        strategy.setCvParams(CVParams(1, 2, 3, 4));

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.activatePoints.selector)
        );
        strategy.activatePoints();

        vm.expectRevert(
            abi.encodeWithSelector(
                CVStrategy.StrategyFunctionDoesNotExist.selector, bytes4(keccak256("deactivatePoints()"))
            )
        );
        strategy.deactivatePoints();

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.increasePower.selector)
        );
        strategy.increasePower(address(0), 1);

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.decreasePower.selector)
        );
        strategy.decreasePower(address(0), 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                CVStrategy.StrategyFunctionDoesNotExist.selector, bytes4(keccak256("deactivatePoints(address)"))
            )
        );
        strategy.deactivatePoints(address(0));

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.allocate.selector)
        );
        strategy.allocate("", address(0));

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.distribute.selector)
        );
        strategy.distribute(new address[](0), "", address(0));

        assertEq(strategy.getMaxAmount(), 250);
        assertEq(uint8(strategy.getPointSystem()), uint8(PointSystem.Unlimited));

        strategy.setPoolActive(true);
        assertTrue(strategy.isPoolActive());
    }

    function test_fallback_and_getFacets() public {
        (bool ok, bytes memory data) = address(strategy).call(abi.encodeWithSelector(bytes4(0x12345678)));
        assertFalse(ok);
        assertEq(bytes4(data), CVStrategy.StrategyFunctionDoesNotExist.selector);

        IDiamondLoupe.Facet[] memory facets = strategy.getFacets();
        assertEq(facets.length, 0);
    }

    function test_initialize_sets_params() public {
        CVStrategyHarness local = new CVStrategyHarness();
        MockAlloWithPool localAllo = new MockAlloWithPool();
        MockRegistryCommunity localRegistry = new MockRegistryCommunity();
        MockSybilScorer localSybil = new MockSybilScorer();
        MockCollateralVault template = new MockCollateralVault();
        MockArbitrator arb = new MockArbitrator();

        localAllo.setPoolToken(1, address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE));
        local.setAllo(address(localAllo));
        local.setCollateralVaultTemplateRaw(address(template));

        CVStrategyInitializeParamsV0_2 memory params;
        params.registryCommunity = address(localRegistry);
        params.proposalType = ProposalType.Funding;
        params.pointSystem = PointSystem.Unlimited;
        params.pointConfig = PointSystemConfig(100);
        params.sybilScorer = address(localSybil);
        params.sybilScorerThreshold = 7;
        params.superfluidToken = address(0);
        params.cvParams = CVParams(1, 2, 3, 4);
        params.arbitrableConfig = ArbitrableConfig(IArbitrator(address(arb)), address(0xBEEF), 0, 0, 1, 2);

        vm.prank(address(localAllo));
        local.initialize(1, abi.encode(params));

        assertEq(address(local.registryCommunity()), address(localRegistry));
        assertEq(uint8(local.proposalType()), uint8(ProposalType.Funding));
        assertEq(uint8(local.pointSystem()), uint8(PointSystem.Unlimited));
        assertEq(local.pointConfig(), 100);
        assertEq(address(local.sybilScorer()), address(localSybil));
        assertEq(local.currentArbitrableConfigVersion(), 1);
        assertEq(arb.lastSafe(), address(0xBEEF));
        assertEq(localSybil.lastStrategy(), address(local));
    }
}
