// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
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
import {ConvictionsUtils} from "../src/CVStrategy/ConvictionsUtils.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {TERC20} from "./shared/TERC20.sol";

import {
    CVStrategyHarness,
    DummyFacet,
    MockAlloWithPool,
    MockRegistryCommunity,
    MockSybilScorer,
    MockCollateralVault,
    MockArbitrator
} from "./helpers/CVStrategyHelpers.sol";

contract CVStrategyStubFacet {
    event Activated(address sender);

    function activatePoints() external {
        emit Activated(msg.sender);
    }

    function ping() external pure returns (uint256) {
        return 1;
    }
}

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

    function test_onlyCouncilSafeOrMember_branches() public {
        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.OnlyCouncilSafeOrMember.selector, address(this), councilSafe)
        );
        strategy.exposedOnlyCouncilSafeOrMember();

        bytes32 role = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));
        registryCommunity.setRole(role, address(0), true);
        vm.prank(other);
        strategy.exposedOnlyCouncilSafeOrMember();

        vm.prank(councilSafe);
        strategy.exposedOnlyCouncilSafeOrMember();
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

    function test_getProposal_threshold_calculation() public {
        CVParams memory params = CVParams(1, 1_000_000_000_000, 5_000_000, 0);
        strategy.setCvParams(params);
        strategy.setTotalPointsActivated(1_000_000_000_000);
        vm.deal(address(strategy), 1_000_000 ether);

        uint256 poolAmount = strategy.getPoolAmount();
        uint256 maxAllowed = (poolAmount * params.maxRatio) / ConvictionsUtils.D;
        assertGt(maxAllowed, 0);

        uint256 requestedAmount = maxAllowed > 1 ? maxAllowed / 2 : 1;
        strategy.setProposal(3, member, requestedAmount, ProposalStatus.Active, block.number - 1, 0);

        uint256 expected = strategy.calculateThreshold(requestedAmount);
        uint256 threshold = strategy.getProposalThreshold(3);
        assertEq(threshold, expected);
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

    function test_proposalExists_and_conviction_helpers() public {
        assertFalse(strategy.exposedProposalExists(1));

        strategy.setProposal(1, member, 0, ProposalStatus.Active, block.number, 0);
        assertTrue(strategy.exposedProposalExists(1));

        strategy.setCvParams(CVParams(1, 1, 1, 0));
        (uint256 conviction, uint256 blockNumber) = strategy.exposedCheckBlockAndCalculateConviction(1, 10);
        assertEq(conviction, 0);
        assertEq(blockNumber, 0);

        strategy.setProposal(2, member, 0, ProposalStatus.Active, block.number - 1, 0);
        (conviction, blockNumber) = strategy.exposedCheckBlockAndCalculateConviction(2, 10);
        assertGt(conviction, 0);
        assertEq(blockNumber, block.number);
    }

    function test_getters_and_conviction() public {
        MockArbitrator arb = new MockArbitrator();
        ArbitrableConfig memory config =
            ArbitrableConfig(IArbitrator(address(arb)), address(0xBEEF), 1, 2, 3, 4);
        strategy.setArbitrableConfig(2, config);

        (
            IArbitrator arbitrator,
            address tribunalSafe,
            uint256 submitterCollateralAmount,
            uint256 challengerCollateralAmount,
            uint256 defaultRuling,
            uint256 defaultRulingTimeout
        ) = strategy.getArbitrableConfig();
        assertEq(address(arbitrator), address(arb));
        assertEq(tribunalSafe, address(0xBEEF));
        assertEq(submitterCollateralAmount, 1);
        assertEq(challengerCollateralAmount, 2);
        assertEq(defaultRuling, 3);
        assertEq(defaultRulingTimeout, 4);

        strategy.setProposal(7, member, 12, ProposalStatus.Active, block.number - 1, 0);
        strategy.setProposalVoterStake(7, member, 5);
        strategy.setProposalStakedAmount(7, 10);
        assertEq(strategy.getProposalVoterStake(7, member), 5);
        assertEq(strategy.getProposalStakedAmount(7), 10);

        strategy.setCvParams(CVParams(1, 1, 1, 0));
        uint256 conviction = strategy.calculateProposalConviction(7);
        assertGt(conviction, 0);
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

    function test_getPoolAmount_with_token_decimals_and_superfluid() public {
        TERC20 token6 = new TERC20("Token6", "T6", 6);
        TERC20 superToken = new TERC20("Super", "SUP", 18);

        allo.setPoolToken(1, address(token6));
        strategy.setSuperfluidToken(address(superToken));

        token6.mint(address(strategy), 1_000_000); // 1 token in 6 decimals
        superToken.mint(address(strategy), 1e18); // 1 in 18 decimals

        uint256 amount = strategy.getPoolAmount();
        assertEq(amount, 2_000_000);
    }

    function test_getPoolAmount_with_high_decimals() public {
        TERC20 token20 = new TERC20("Token20", "T20", 20);
        TERC20 superToken = new TERC20("Super", "SUP", 18);

        allo.setPoolToken(1, address(token20));
        strategy.setSuperfluidToken(address(superToken));

        token20.mint(address(strategy), 1000 * 10 ** 20);
        superToken.mint(address(strategy), 1e18);

        uint256 amount = strategy.getPoolAmount();
        assertEq(amount, 1000 * 10 ** 20 + 1e20);
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

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.setPoolParams.selector)
        );
        strategy.setPoolParams(
            ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
            CVParams(0, 0, 0, 0),
            0,
            new address[](0),
            new address[](0),
            address(0)
        );

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.connectSuperfluidGDA.selector)
        );
        strategy.connectSuperfluidGDA(address(0));

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.disconnectSuperfluidGDA.selector)
        );
        strategy.disconnectSuperfluidGDA(address(0));

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.rule.selector)
        );
        strategy.rule(0, 0);

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.cancelProposal.selector)
        );
        strategy.cancelProposal(0);

        vm.expectRevert(
            abi.encodeWithSelector(CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.editProposal.selector)
        );
        strategy.editProposal(0, Metadata({protocol: 1, pointer: "p"}), address(0), 0);

        assertEq(strategy.getMaxAmount(), 250);
        assertEq(uint8(strategy.getPointSystem()), uint8(PointSystem.Unlimited));

        strategy.setPoolActive(true);
        assertTrue(strategy.isPoolActive());
    }

    function test_diamondCut_getFacets_and_delegate_success() public {
        address ownerAddr = makeAddr("strategyOwner");
        CVStrategyStubFacet facet = new CVStrategyStubFacet();

        CVStrategyHarness local = CVStrategyHarness(
            payable(
                address(
                    new ERC1967Proxy(
                        address(new CVStrategyHarness()),
                        abi.encodeWithSelector(CVStrategy.init.selector, address(allo), address(0xBEEF), ownerAddr)
                    )
                )
            )
        );

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = CVStrategy.activatePoints.selector;
        selectors[1] = CVStrategyStubFacet.ping.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(facet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        local.diamondCut(cuts, address(0), "");

        vm.prank(ownerAddr);
        local.diamondCut(cuts, address(0), "");

        local.activatePoints();

        IDiamondLoupe.Facet[] memory facets = local.getFacets();
        assertEq(facets.length, 1);

        (bool ok, bytes memory data) = address(local).call(abi.encodeWithSelector(CVStrategyStubFacet.ping.selector));
        assertTrue(ok);
        assertEq(abi.decode(data, (uint256)), 1);
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

    function test_initialize_skips_optional_branches() public {
        CVStrategyHarness local = new CVStrategyHarness();
        MockAlloWithPool localAllo = new MockAlloWithPool();
        MockCollateralVault template = new MockCollateralVault();

        localAllo.setPoolToken(1, address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE));
        local.setAllo(address(localAllo));
        local.setCollateralVaultTemplateRaw(address(template));

        CVStrategyInitializeParamsV0_2 memory params;
        params.registryCommunity = address(registryCommunity);
        params.proposalType = ProposalType.Funding;
        params.pointSystem = PointSystem.Unlimited;
        params.pointConfig = PointSystemConfig(100);
        params.sybilScorer = address(0);
        params.sybilScorerThreshold = 0;
        params.superfluidToken = address(0);
        params.cvParams = CVParams(0, 0, 0, 0);
        params.arbitrableConfig = ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0);

        vm.prank(address(localAllo));
        local.initialize(1, abi.encode(params));

        assertEq(local.currentArbitrableConfigVersion(), 0);
        assertEq(address(local.sybilScorer()), address(0));
    }

    function test_init_and_setCollateralVaultTemplate_ownerCheck() public {
        address ownerAddr = makeAddr("strategyOwner");
        address otherAddr = makeAddr("otherAddr");

        CVStrategyHarness local = CVStrategyHarness(
            payable(
                address(
                    new ERC1967Proxy(
                        address(new CVStrategyHarness()),
                        abi.encodeWithSelector(CVStrategy.init.selector, address(allo), address(0xBEEF), ownerAddr)
                    )
                )
            )
        );

        vm.prank(ownerAddr);
        local.setCollateralVaultTemplate(address(0xCAFE));

        vm.prank(otherAddr);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        local.setCollateralVaultTemplate(address(0xD00D));
    }
}
