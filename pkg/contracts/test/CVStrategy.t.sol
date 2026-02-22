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
    CVStrategyInitializeParamsV0_3
} from "../src/CVStrategy/CVStrategy.sol";
import {ConvictionsUtils} from "../src/CVStrategy/ConvictionsUtils.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {CVPauseFacet} from "../src/CVStrategy/facets/CVPauseFacet.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MockPauseController} from "./helpers/PauseHelpers.sol";
import {ISuperfluidToken} from
    "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {ISuperfluidPool} from
    "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";
import {PoolConfig} from
    "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/IGeneralDistributionAgreementV1.sol";

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

contract CVStrategyRevertFacet {
    function activatePoints() external pure {
        revert("revert");
    }
}

contract CVStrategyStubFacetFull {
    event Pinged();

    function registerRecipient(bytes memory, address) external payable returns (address) {
        return address(0x1);
    }

    function activatePoints() external {
        emit Pinged();
    }

    function deactivatePoints() external {
        emit Pinged();
    }

    function increasePower(address, uint256) external returns (uint256) {
        return 1;
    }

    function decreasePower(address, uint256) external returns (uint256) {
        return 1;
    }

    function deactivatePoints(address) external {
        emit Pinged();
    }

    function allocate(bytes memory, address) external payable {
        emit Pinged();
    }

    function distribute(address[] memory, bytes memory, address) external {
        emit Pinged();
    }

    function setPoolParams(
        ArbitrableConfig memory,
        CVParams memory,
        uint256,
        address[] memory,
        address[] memory,
        address
    ) external {
        emit Pinged();
    }

    function connectSuperfluidGDA(address) external {
        emit Pinged();
    }

    function disconnectSuperfluidGDA(address) external {
        emit Pinged();
    }

    function disputeProposal(uint256, string calldata, bytes calldata) external payable returns (uint256) {
        emit Pinged();
        return 1;
    }

    function rule(uint256, uint256) external {
        emit Pinged();
    }

    function cancelProposal(uint256) external {
        emit Pinged();
    }

    function editProposal(uint256, Metadata memory, address, uint256) external {
        emit Pinged();
    }

    function rebalance() external {
        emit Pinged();
    }

    function ping() external pure returns (uint256) {
        return 1;
    }
}

contract MockGDAv1Forwarder {
    function createPool(ISuperfluidToken, address, PoolConfig memory) external returns (bool, ISuperfluidPool) {
        return (true, ISuperfluidPool(address(0xBEEF)));
    }
}

contract MockExternalVotingPowerRegistryForStrategy {
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

contract CVStrategyCoverageHarness is CVStrategyHarness {
    function setSuperfluidGDA(address gda) external {
        superfluidGDA = ISuperfluidPool(gda);
    }

    function exposedInitializeFacets() external {
        _initializeFacets();
    }

    function exposedGetBasisStakedAmount() external returns (uint256) {
        return getBasisStakedAmount();
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
        strategy.setVotingPowerRegistry(address(registryCommunity));

        allo.setPoolToken(1, address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE));
    }

    function _facetCutsForPause(address facet) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](12);
        selectors[0] = bytes4(keccak256("setPauseController(address)"));
        selectors[1] = bytes4(keccak256("setPauseFacet(address)"));
        selectors[2] = bytes4(keccak256("pauseFacet()"));
        selectors[3] = bytes4(keccak256("pause(uint256)"));
        selectors[4] = bytes4(keccak256("pause(bytes4,uint256)"));
        selectors[5] = bytes4(keccak256("unpause()"));
        selectors[6] = bytes4(keccak256("unpause(bytes4)"));
        selectors[7] = bytes4(keccak256("pauseController()"));
        selectors[8] = bytes4(keccak256("isPaused()"));
        selectors[9] = bytes4(keccak256("isPaused(bytes4)"));
        selectors[10] = bytes4(keccak256("pausedUntil()"));
        selectors[11] = bytes4(keccak256("pausedSelectorUntil(bytes4)"));
        cuts[0] =
            IDiamond.FacetCut({facetAddress: facet, action: IDiamond.FacetCutAction.Add, functionSelectors: selectors});
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

    function test_checkSenderIsMember_success() public {
        registryCommunity.setMember(member, true);
        strategy.exposedCheckSenderIsMember(member);
    }

    function test_getProposalVoterStake_defaults_to_zero() public {
        uint256 stake = strategy.getProposalVoterStake(1, member);
        assertEq(stake, 0);
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

    function test_canExecuteAction_customPointSystem_nftGating() public {
        MockExternalVotingPowerRegistryForStrategy extRegistry = new MockExternalVotingPowerRegistryForStrategy();

        strategy.setPointSystem(PointSystem.Custom);
        strategy.setVotingPowerRegistry(address(extRegistry));

        // Non-member denied
        assertFalse(strategy.exposedCanExecuteAction(other));

        // Member allowed
        extRegistry.setMemberPower(other, 3);
        assertTrue(strategy.exposedCanExecuteAction(other));

        // Sybil scorer takes priority when set
        strategy.setSybilScorer(address(sybil));
        sybil.setCanExecute(other, false);
        assertFalse(strategy.exposedCanExecuteAction(other));
    }

    function test_onlyCouncilSafeOrMember_branches() public {
        vm.expectRevert(abi.encodeWithSelector(CVStrategy.OnlyCouncilSafeOrMember.selector, address(this), councilSafe));
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

    function test_getProposal_threshold_over_max_ratio() public {
        strategy.setCvParams(CVParams(1, 1, ConvictionsUtils.D / 2, 0));
        strategy.setTotalPointsActivated(100);
        vm.deal(address(strategy), 1 ether);

        uint256 poolAmount = strategy.getPoolAmount();
        uint256 maxAllowed = (poolAmount * (ConvictionsUtils.D / 2)) / ConvictionsUtils.D;
        strategy.setProposal(4, member, maxAllowed + 1, ProposalStatus.Active, block.number - 1, 0);

        assertEq(strategy.getProposalThreshold(4), 0);
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
        ArbitrableConfig memory config = ArbitrableConfig(IArbitrator(address(arb)), address(0xBEEF), 1, 2, 3, 4);
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
            abi.encodeWithSelector(
                CVStrategy.StrategyFunctionDoesNotExist.selector,
                bytes4(
                    keccak256(
                        "setPoolParams((address,address,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256,address[],address[],address)"
                    )
                )
            )
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
            abi.encodeWithSelector(
                CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.connectSuperfluidGDA.selector
            )
        );
        strategy.connectSuperfluidGDA(address(0));

        vm.expectRevert(
            abi.encodeWithSelector(
                CVStrategy.StrategyFunctionDoesNotExist.selector, CVStrategy.disconnectSuperfluidGDA.selector
            )
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
            payable(address(
                    new ERC1967Proxy(
                        address(new CVStrategyHarness()),
                        abi.encodeWithSelector(CVStrategy.init.selector, address(allo), address(0xBEEF), ownerAddr)
                    )
                ))
        );

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = CVStrategy.activatePoints.selector;
        selectors[1] = CVStrategyStubFacet.ping.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(facet), action: IDiamond.FacetCutAction.Add, functionSelectors: selectors
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

        CVStrategyInitializeParamsV0_3 memory params;
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

        CVStrategyInitializeParamsV0_3 memory params;
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

    function test_initialize_streaming_reverts_without_superfluid_data() public {
        CVStrategyHarness local = new CVStrategyHarness();
        MockAlloWithPool localAllo = new MockAlloWithPool();
        MockCollateralVault template = new MockCollateralVault();

        localAllo.setPoolToken(1, address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE));
        local.setAllo(address(localAllo));
        local.setCollateralVaultTemplateRaw(address(template));

        CVStrategyInitializeParamsV0_3 memory params;
        params.registryCommunity = address(registryCommunity);
        params.proposalType = ProposalType.Streaming;
        params.pointSystem = PointSystem.Unlimited;
        params.pointConfig = PointSystemConfig(100);
        params.sybilScorer = address(0);
        params.sybilScorerThreshold = 0;
        params.superfluidToken = address(0);
        params.streamingRatePerSecond = 0;
        params.cvParams = CVParams(0, 0, 0, 0);
        params.arbitrableConfig = ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0);

        vm.prank(address(localAllo));
        vm.expectRevert(abi.encodeWithSelector(CVStrategy.TokenCannotBeZero.selector, address(0)));
        local.initialize(1, abi.encode(params));
    }

    function test_init_and_setCollateralVaultTemplate_ownerCheck() public {
        address ownerAddr = makeAddr("strategyOwner");
        address otherAddr = makeAddr("otherAddr");

        CVStrategyHarness local = CVStrategyHarness(
            payable(address(
                    new ERC1967Proxy(
                        address(new CVStrategyHarness()),
                        abi.encodeWithSelector(CVStrategy.init.selector, address(allo), address(0xBEEF), ownerAddr)
                    )
                ))
        );

        vm.prank(ownerAddr);
        local.setCollateralVaultTemplate(address(0xCAFE));

        vm.prank(otherAddr);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        local.setCollateralVaultTemplate(address(0xD00D));
    }

    function test_pause_enforcement_and_selector_exceptions() public {
        address ownerAddr = makeAddr("strategyOwner");
        CVStrategyStubFacet facet = new CVStrategyStubFacet();
        CVPauseFacet pauseFacet = new CVPauseFacet();
        MockPauseController controller = new MockPauseController();

        CVStrategyHarness local = CVStrategyHarness(
            payable(address(
                    new ERC1967Proxy(
                        address(new CVStrategyHarness()),
                        abi.encodeWithSelector(CVStrategy.init.selector, address(allo), address(0xBEEF), ownerAddr)
                    )
                ))
        );

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
        bytes4[] memory stubSelectors = new bytes4[](2);
        stubSelectors[0] = CVStrategy.activatePoints.selector;
        stubSelectors[1] = CVStrategyStubFacet.ping.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(facet), action: IDiamond.FacetCutAction.Add, functionSelectors: stubSelectors
        });
        cuts[1] = _facetCutsForPause(address(pauseFacet))[0];

        vm.prank(ownerAddr);
        local.diamondCut(cuts, address(0), "");

        vm.prank(ownerAddr);
        CVPauseFacet(address(local)).setPauseController(address(controller));

        controller.setGlobalPaused(true);

        vm.expectRevert(abi.encodeWithSelector(CVStrategy.StrategyPaused.selector, address(controller)));
        local.activatePoints();

        vm.expectRevert(abi.encodeWithSelector(CVStrategy.StrategyPaused.selector, address(controller)));
        CVStrategyStubFacet(address(local)).ping();

        vm.prank(ownerAddr);
        CVPauseFacet(address(local)).pause(1);

        controller.setGlobalPaused(false);
        controller.setSelectorPaused(CVStrategy.activatePoints.selector, true);

        vm.expectRevert(
            abi.encodeWithSelector(
                CVStrategy.StrategySelectorPaused.selector, CVStrategy.activatePoints.selector, address(controller)
            )
        );
        local.activatePoints();
    }

    function test_pause_selector_bypass_before_controller_set() public {
        address ownerAddr = makeAddr("strategyOwner");
        CVPauseFacet pauseFacet = new CVPauseFacet();

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
        local.diamondCut(_facetCutsForPause(address(pauseFacet)), address(0), "");

        assertEq(CVPauseFacet(address(local)).pauseController(), address(0));

        MockPauseController controller = new MockPauseController();
        vm.prank(ownerAddr);
        CVPauseFacet(address(local)).setPauseController(address(controller));

        assertEq(CVPauseFacet(address(local)).pauseController(), address(controller));
    }

    function test_initialize_streaming_hits_branch_and_sets_pool() public {
        CVStrategyCoverageHarness local = new CVStrategyCoverageHarness();
        MockAlloWithPool localAllo = new MockAlloWithPool();
        MockRegistryCommunity localRegistry = new MockRegistryCommunity();
        MockCollateralVault template = new MockCollateralVault();

        localAllo.setPoolToken(1, address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE));
        local.setAllo(address(localAllo));
        local.setCollateralVaultTemplateRaw(address(template));
        local.setRegistryCommunity(address(localRegistry));
        local.setSuperfluidGDA(address(0xDEAD));

        MockGDAv1Forwarder forwarder = new MockGDAv1Forwarder();
        address forwarderAddr = address(0x6DA13Bde224A05a288748d857b9e7DDEffd1dE08);
        vm.etch(forwarderAddr, address(forwarder).code);

        CVStrategyInitializeParamsV0_3 memory params;
        params.registryCommunity = address(localRegistry);
        params.proposalType = ProposalType.Streaming;
        params.pointSystem = PointSystem.Unlimited;
        params.pointConfig = PointSystemConfig(1);
        params.sybilScorer = address(0);
        params.sybilScorerThreshold = 0;
        params.superfluidToken = address(0xCAFE);
        params.streamingRatePerSecond = 1;
        params.cvParams = CVParams(0, 0, 0, 0);
        params.arbitrableConfig = ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0);

        vm.prank(address(localAllo));
        local.initialize(1, abi.encode(params));

        assertEq(address(local.superfluidGDA()), address(0xBEEF));
    }

    function test_initializeFacets_and_getBasisStakedAmount() public {
        CVStrategyCoverageHarness local = new CVStrategyCoverageHarness();
        MockRegistryCommunity localRegistry = new MockRegistryCommunity();

        local.setRegistryCommunity(address(localRegistry));
        local.exposedInitializeFacets();

        assertEq(local.exposedGetBasisStakedAmount(), 1);
    }

    function _deployCoverageStrategy(address ownerAddr) internal returns (CVStrategyCoverageHarness local) {
        MockAlloWithPool localAllo = new MockAlloWithPool();
        MockCollateralVault template = new MockCollateralVault();

        CVStrategyCoverageHarness impl = new CVStrategyCoverageHarness();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(CVStrategy.init.selector, address(localAllo), address(template), ownerAddr)
        );
        local = CVStrategyCoverageHarness(payable(address(proxy)));
        local.setPoolId(1);
    }

    function _addRevertFacet(CVStrategyCoverageHarness local, address ownerAddr) internal {
        CVStrategyRevertFacet revertFacet = new CVStrategyRevertFacet();

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = CVStrategy.activatePoints.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(revertFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.prank(ownerAddr);
        local.diamondCut(cuts, address(0), "");
    }

    function _addStubAndPauseFacets(CVStrategyCoverageHarness local, address ownerAddr) internal {
        CVStrategyStubFacetFull stubFacet = new CVStrategyStubFacetFull();
        CVPauseFacet pauseFacet = new CVPauseFacet();

        bytes4 deactivatePointsAddrSelector = bytes4(keccak256("deactivatePoints(address)"));
        bytes4[] memory addSelectors = new bytes4[](16);
        addSelectors[0] = CVStrategy.registerRecipient.selector;
        addSelectors[1] = bytes4(keccak256("deactivatePoints()"));
        addSelectors[2] = CVStrategy.increasePower.selector;
        addSelectors[3] = CVStrategy.decreasePower.selector;
        addSelectors[4] = deactivatePointsAddrSelector;
        addSelectors[5] = CVStrategy.allocate.selector;
        addSelectors[6] = CVStrategy.distribute.selector;
        addSelectors[7] = bytes4(
            keccak256(
                "setPoolParams((address,address,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256,address[],address[],address)"
            )
        );
        addSelectors[8] = CVStrategy.connectSuperfluidGDA.selector;
        addSelectors[9] = CVStrategy.disconnectSuperfluidGDA.selector;
        addSelectors[10] = CVStrategy.disputeProposal.selector;
        addSelectors[11] = CVStrategy.rule.selector;
        addSelectors[12] = CVStrategy.cancelProposal.selector;
        addSelectors[13] = CVStrategy.editProposal.selector;
        addSelectors[14] = CVStrategy.rebalance.selector;
        addSelectors[15] = CVStrategyStubFacetFull.ping.selector;

        IDiamond.FacetCut[] memory replaceCuts = new IDiamond.FacetCut[](2);
        bytes4[] memory replaceSelectors = new bytes4[](1);
        replaceSelectors[0] = CVStrategy.activatePoints.selector;
        replaceCuts[0] = IDiamond.FacetCut({
            facetAddress: address(stubFacet),
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: replaceSelectors
        });
        replaceCuts[1] = IDiamond.FacetCut({
            facetAddress: address(stubFacet),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: addSelectors
        });

        vm.prank(ownerAddr);
        local.diamondCut(replaceCuts, address(0), "");

        IDiamond.FacetCut[] memory pauseCuts = _facetCutsForPause(address(pauseFacet));
        vm.prank(ownerAddr);
        local.diamondCut(pauseCuts, address(0), "");
    }

    function test_stub_delegate_and_fallback_paths() public {
        address ownerAddr = makeAddr("strategyOwner");
        CVStrategyCoverageHarness local = _deployCoverageStrategy(ownerAddr);
        _addRevertFacet(local, ownerAddr);

        vm.expectRevert();
        local.activatePoints();
        _addStubAndPauseFacets(local, ownerAddr);

        local.registerRecipient("", address(0));
        local.activatePoints();
        local.deactivatePoints();
        local.increasePower(address(0), 1);
        local.decreasePower(address(0), 1);
        local.deactivatePoints(address(0));
        local.allocate("", address(0));
        local.distribute(new address[](0), "", address(0));
        local.setPoolParams(
            ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
            CVParams(0, 0, 0, 0),
            0,
            new address[](0),
            new address[](0),
            address(0)
        );
        local.connectSuperfluidGDA(address(0));
        local.disconnectSuperfluidGDA(address(0));
        local.disputeProposal(1, "", "");
        local.rule(0, 0);
        local.cancelProposal(1);
        local.editProposal(1, Metadata({protocol: 1, pointer: "p"}), address(0), 0);
        local.rebalance();

        MockPauseController controller = new MockPauseController();
        vm.prank(ownerAddr);
        local.setPauseController(address(controller));
        vm.prank(ownerAddr);
        local.pause(1);
        vm.prank(ownerAddr);
        local.unpause();
        vm.prank(ownerAddr);
        local.pause(bytes4(keccak256("pause(uint256)")), 1);
        vm.prank(ownerAddr);
        local.unpause(bytes4(keccak256("pause(uint256)")));
        local.pauseFacet();
        local.pauseController();
        local.isPaused();
        local.isPaused(bytes4(keccak256("pause(uint256)")));
        local.pausedUntil();
        local.pausedSelectorUntil(bytes4(keccak256("pause(uint256)")));

        (bool ok, bytes memory data) =
            address(local).call(abi.encodeWithSelector(CVStrategyStubFacetFull.ping.selector));
        assertTrue(ok);
        assertEq(abi.decode(data, (uint256)), 1);

        (ok,) = address(local).call(abi.encodeWithSelector(bytes4(0xdeadbeef)));
        assertFalse(ok);

        IDiamondLoupe.Facet[] memory facets = local.getFacets();
        assertGt(facets.length, 0);

        vm.prank(ownerAddr);
        local.setCollateralVaultTemplate(address(0xCAFE));
    }
}
