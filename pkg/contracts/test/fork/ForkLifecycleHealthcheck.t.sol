// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/StdJson.sol";

import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {GV2ERC20} from "../script/GV2ERC20.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {
    RegistryCommunity,
    RegistryCommunityInitializeParams,
    CommunityParams
} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {
    CVStrategy,
    ProposalType,
    PointSystem,
    CreateProposal,
    ProposalStatus,
    ProposalSupport,
    PointSystemConfig,
    ArbitrableConfig,
    CVParams,
    CVStrategyInitializeParamsV0_2,
    CVStrategyInitializeParamsV0_3
} from "../src/CVStrategy/CVStrategy.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {IVotingPowerRegistry} from "../src/interfaces/IVotingPowerRegistry.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";
import {MockPauseController} from "./helpers/PauseHelpers.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";

contract MockVotingPowerRegistryFork is IVotingPowerRegistry {
    mapping(address => uint256) internal powerByMember;
    mapping(address => bool) internal memberByAddress;

    function setMemberPower(address member, uint256 power) external {
        powerByMember[member] = power;
        memberByAddress[member] = power > 0;
    }

    function setMember(address member, bool isMember_) external {
        memberByAddress[member] = isMember_;
    }

    function getMemberPowerInStrategy(address member, address) external view returns (uint256) {
        return powerByMember[member];
    }

    function getMemberStakedAmount(address member) external view returns (uint256) {
        return powerByMember[member];
    }

    function ercAddress() external pure returns (address) {
        return address(0);
    }

    function isMember(address member) external view returns (bool) {
        return memberByAddress[member];
    }
}

contract MockPoolSuperToken is GV2ERC20 {
    mapping(address => bool) public connectedPools;

    constructor() GV2ERC20("Fork Super Token", "FST", 18) {}

    function connectPool(address pool) external returns (bool) {
        connectedPools[pool] = true;
        return true;
    }

    function disconnectPool(address pool) external returns (bool) {
        connectedPools[pool] = false;
        return true;
    }
}

contract MockSybilScorerFork is ISybilScorer {
    address public lastStrategy;
    uint256 public lastThreshold;
    address public lastCouncilSafe;
    mapping(address => bool) public allowedMembers;

    function setAllowed(address member, bool allowed) external {
        allowedMembers[member] = allowed;
    }

    function canExecuteAction(address user, address) external view returns (bool) {
        return allowedMembers[user];
    }

    function modifyThreshold(address, uint256 newThreshold) external {
        lastThreshold = newThreshold;
    }

    function addStrategy(address strategy, uint256 threshold, address councilSafe) external {
        lastStrategy = strategy;
        lastThreshold = threshold;
        lastCouncilSafe = councilSafe;
    }

    function activateStrategy(address strategy) external {
        lastStrategy = strategy;
    }
}

interface IRegistryCommunityFacetHarness {
    function isCouncilMember(address member) external view returns (bool);
    function getBasisStakedAmount() external view returns (uint256);
    function getStakeAmountWithFees() external view returns (uint256);
    function registerMember() external;
    function isRegisteredMember(address member) external view returns (bool);
    function ercAddress() external view returns (address);
    function activateMemberInStrategy(address member, address strategy) external;
    function deactivateMemberInStrategy(address member, address strategy) external;
    function isPaused() external view returns (bool);
    function isPaused(bytes4 selector) external view returns (bool);
    function pauseFacet() external view returns (address);
    function pauseController() external view returns (address);
    function pausedUntil() external view returns (uint256);
    function pausedSelectorUntil(bytes4 selector) external view returns (uint256);
    function pause(uint256 duration) external;
    function pause(bytes4 selector, uint256 duration) external;
    function unpause() external;
    function unpause(bytes4 selector) external;
    function setPauseFacet(address facet) external;
}

interface ICVStrategyFacetHarness {
    function getPoolAmount() external view returns (uint256);
    function getMaxAmount() external view returns (uint256);
    function getPointSystem() external view returns (PointSystem);
    function getProposalMetadataPointer(uint256 proposalId) external view returns (string memory);
    function getProposalVoterStake(uint256 proposalId, address voter) external view returns (uint256);
    function setPoolActive(bool active) external;
    function setSybilScorer(address scorer, uint256 threshold) external;
    function setVotingPowerRegistry(address registry) external;
    function setAuthorizedSyncCaller(address caller, bool authorized) external;
    function isAuthorizedSyncCaller(address caller) external view returns (bool);
    function syncPower(address member) external;
    function batchSyncPower(address[] calldata members) external;
    function deactivatePoints(address member) external;
    function setAuthorizedRebalanceCaller(address caller, bool authorized) external;
    function isAuthorizedRebalanceCaller(address caller) external view returns (bool);
    function stopEscrowStream(address escrow) external;
    function wrapIfNeeded() external;
    function isPaused() external view returns (bool);
    function isPaused(bytes4 selector) external view returns (bool);
    function pauseFacet() external view returns (address);
    function pauseController() external view returns (address);
    function pausedUntil() external view returns (uint256);
    function pausedSelectorUntil(bytes4 selector) external view returns (uint256);
    function setPauseFacet(address facet) external;
    function pause(uint256 duration) external;
    function pause(bytes4 selector, uint256 duration) external;
    function unpause() external;
    function unpause(bytes4 selector) external;
}

contract ForkLifecycleHealthcheck is Test {
    using stdJson for string;

    bytes4 internal constant COMMUNITY_CREATE_POOL_SELECTOR_V0_2 = 0xfebf64a1;
    bytes4 internal constant COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_2 = 0x85a19b6d;
    bytes4 internal constant COMMUNITY_CREATE_POOL_SELECTOR_V0_3 = 0xce7e2cd3;
    bytes4 internal constant COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_3 = 0x82b18ef4;
    bytes4 internal constant STRATEGY_SET_POOL_PARAMS_SELECTOR = 0xd5b7cc54;
    bytes4 internal constant STRATEGY_SET_POOL_PARAMS_WITH_RATE_SELECTOR = 0x2bbe0cae;
    bytes32 internal constant ERC1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    // RPC resolution order per chain:
    // 1. Existing package-standard env vars from `pkg/contracts/.env` / Taskfile.yml, for example `RPC_URL_OPT`
    // 2. Premium aliases, for example `PREMIUM_RPC_URL_OPT`
    //
    // This keeps the test usable with the repo's normal `.env` layout while allowing dedicated premium endpoints.

    uint256 internal constant REGISTER_STAKE = 1 ether;
    uint256 internal constant MEMBER_TOTAL_STAKE = 1_000 ether;
    uint256 internal constant CHALLENGER_TOTAL_STAKE = 50 ether;
    uint256 internal constant POOL_FUNDS = 10_000 ether;
    uint256 internal constant REQUEST_AMOUNT = 1 ether;
    uint256 internal constant MAX_EXECUTION_BLOCK_STEPS = 2_000;

    struct ForkContext {
        RegistryFactory factory;
        RegistryCommunity community;
        CVStrategy strategy;
        Allo allo;
        GV2ERC20 token;
        SafeArbitrator arbitrator;
        address council;
        address feeReceiver;
        address member;
        address challenger;
        address beneficiary;
        uint256 poolId;
    }

    function testFork_communityCreation_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createCommunity(chains[i], false);

            assertEq(address(ctx.community.registryFactory()), address(ctx.factory), chains[i]);
            assertEq(address(ctx.community.councilSafe()), ctx.council, chains[i]);
            assertEq(address(ctx.community.gardenToken()), address(ctx.token), chains[i]);
            assertEq(ctx.community.registerStakeAmount(), REGISTER_STAKE, chains[i]);
            assertEq(ctx.community.totalMembers(), 0, chains[i]);
        }
    }

    function testFork_poolCreation_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createPool(chains[i]);

            assertEq(ctx.strategy.getPoolId(), ctx.poolId, chains[i]);
            assertEq(address(ctx.strategy.registryCommunity()), address(ctx.community), chains[i]);
            assertTrue(ctx.community.enabledStrategies(address(ctx.strategy)), chains[i]);
        }
    }

    function testFork_proposalCreation_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            (ForkContext memory ctx, uint256 proposalId) = _createProposalContext(chains[i]);

            (address submitter, address beneficiary,,,, ProposalStatus status,,,,,,) =
                ctx.strategy.getProposal(proposalId);

            assertEq(submitter, ctx.member, chains[i]);
            assertEq(beneficiary, ctx.beneficiary, chains[i]);
            assertEq(uint256(status), uint256(ProposalStatus.Active), chains[i]);
        }
    }

    function testFork_stakeAndRegister_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createCommunity(chains[i], false);

            _registerMember(ctx, ctx.member, REGISTER_STAKE);

            (, uint256 stakedAmount, bool isRegistered) = ctx.community.addressToMemberInfo(ctx.member);
            assertEq(stakedAmount, REGISTER_STAKE, chains[i]);
            assertTrue(isRegistered, chains[i]);
            assertEq(ctx.community.totalMembers(), 1, chains[i]);
        }
    }

    function testFork_changeStake_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createPool(chains[i]);

            _registerMember(ctx, ctx.member, MEMBER_TOTAL_STAKE);
            _activatePoints(ctx, ctx.member);

            uint256 powerBefore = ctx.community.getMemberPowerInStrategy(ctx.member, address(ctx.strategy));
            uint256 stakeBefore = ctx.community.getMemberStakedAmount(ctx.member);
            assertEq(stakeBefore, MEMBER_TOTAL_STAKE, chains[i]);

            vm.prank(ctx.member);
            ctx.community.decreasePower(400 ether);

            uint256 powerAfter = ctx.community.getMemberPowerInStrategy(ctx.member, address(ctx.strategy));
            (, uint256 stakedAmount,) = ctx.community.addressToMemberInfo(ctx.member);
            assertEq(stakedAmount, 600 ether, chains[i]);
            assertLe(powerAfter, powerBefore, chains[i]);
        }
    }

    function testFork_editCommunityParams_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createCommunity(chains[i], false);
            address newFeeReceiver = makeAddr(string.concat(chains[i], "-fee-updated"));

            CommunityParams memory params = CommunityParams({
                councilSafe: ctx.council,
                feeReceiver: newFeeReceiver,
                communityFee: 25,
                communityName: string.concat("edited-", chains[i]),
                registerStakeAmount: 2 ether,
                isKickEnabled: true,
                covenantIpfsHash: string.concat("edited-covenant-", chains[i])
            });

            vm.prank(ctx.council);
            ctx.community.setCommunityParams(params);

            assertEq(ctx.community.feeReceiver(), newFeeReceiver, chains[i]);
            assertEq(ctx.community.communityFee(), 25, chains[i]);
            assertEq(ctx.community.registerStakeAmount(), 2 ether, chains[i]);
            assertEq(ctx.community.communityName(), string.concat("edited-", chains[i]));
            assertEq(ctx.community.covenantIpfsHash(), string.concat("edited-covenant-", chains[i]));
            assertTrue(ctx.community.isKickEnabled(), chains[i]);
        }
    }

    function testFork_leave_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createPool(chains[i]);

            _registerMember(ctx, ctx.member, MEMBER_TOTAL_STAKE);
            _activatePoints(ctx, ctx.member);

            vm.prank(ctx.member);
            ctx.community.unregisterMember();

            (, uint256 stakedAmount, bool isRegistered) = ctx.community.addressToMemberInfo(ctx.member);
            assertEq(stakedAmount, 0, chains[i]);
            assertFalse(isRegistered, chains[i]);
            assertEq(ctx.community.totalMembers(), 0, chains[i]);
            assertEq(ctx.strategy.totalPointsActivated(), 0, chains[i]);
        }
    }

    function testFork_activatePoints_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createPool(chains[i]);

            _registerMember(ctx, ctx.member, MEMBER_TOTAL_STAKE);
            _activatePoints(ctx, ctx.member);

            assertTrue(ctx.community.memberActivatedInStrategies(ctx.member, address(ctx.strategy)), chains[i]);
            assertEq(
                ctx.strategy.totalPointsActivated(),
                ctx.community.getMemberPowerInStrategy(ctx.member, address(ctx.strategy)),
                chains[i]
            );
        }
    }

    function testFork_allocate_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            (ForkContext memory ctx, uint256 proposalId) = _createProposalContext(chains[i]);

            uint256 availablePower = ctx.community.getMemberPowerInStrategy(ctx.member, address(ctx.strategy));
            _allocateSupport(ctx, proposalId, ctx.member, availablePower);

            assertEq(ctx.strategy.totalVoterStakePct(ctx.member), availablePower, chains[i]);
            assertEq(ctx.strategy.getProposalStakedAmount(proposalId), availablePower, chains[i]);
            assertEq(ctx.strategy.totalStaked(), availablePower, chains[i]);
        }
    }

    function testFork_editPoolParams_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createPool(chains[i]);
            address newAllowlisted = makeAddr(string.concat(chains[i], "-allowlisted"));
            address[] memory toAdd = new address[](1);
            address[] memory toRemove = new address[](1);
            toAdd[0] = newAllowlisted;
            toRemove[0] = ctx.challenger;

            ArbitrableConfig memory arb = ArbitrableConfig({
                arbitrator: IArbitrator(address(ctx.arbitrator)),
                tribunalSafe: ctx.council,
                submitterCollateralAmount: 0.02 ether,
                challengerCollateralAmount: 0.03 ether,
                defaultRuling: 2,
                defaultRulingTimeout: 2 days
            });
            CVParams memory cvParams =
                CVParams({maxRatio: 4_000_000, weight: 200_000, decay: 9_940_581, minThresholdPoints: 0});

            vm.prank(ctx.council);
            ctx.strategy.setPoolParams(arb, cvParams, 0, toAdd, toRemove, address(0));

            bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", ctx.poolId));
            assertTrue(ctx.community.hasRole(allowlistRole, newAllowlisted), chains[i]);
            assertFalse(ctx.community.hasRole(allowlistRole, ctx.challenger), chains[i]);

            (
                IArbitrator arbitrator,,
                uint256 submitterCollateral,
                uint256 challengerCollateral,
                uint256 defaultRuling,
            ) = ctx.strategy.getArbitrableConfig();
            assertEq(address(arbitrator), address(ctx.arbitrator), chains[i]);
            assertEq(submitterCollateral, 0.02 ether, chains[i]);
            assertEq(challengerCollateral, 0.03 ether, chains[i]);
            assertEq(defaultRuling, 2, chains[i]);
        }
    }

    function testFork_deactivatePoints_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            (ForkContext memory ctx, uint256 proposalId) = _createProposalContext(chains[i]);
            uint256 availablePower = ctx.community.getMemberPowerInStrategy(ctx.member, address(ctx.strategy));
            _allocateSupport(ctx, proposalId, ctx.member, availablePower);

            vm.prank(ctx.member);
            ctx.strategy.deactivatePoints();

            assertEq(ctx.strategy.totalPointsActivated(), 0, chains[i]);
            assertEq(ctx.strategy.totalVoterStakePct(ctx.member), 0, chains[i]);
            assertEq(ctx.strategy.getProposalStakedAmount(proposalId), 0, chains[i]);
            assertFalse(ctx.community.memberActivatedInStrategies(ctx.member, address(ctx.strategy)), chains[i]);
        }
    }

    function testFork_executeProposal_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            (ForkContext memory ctx, uint256 proposalId) = _createProposalContext(chains[i]);
            uint256 availablePower = ctx.community.getMemberPowerInStrategy(ctx.member, address(ctx.strategy));
            _allocateSupport(ctx, proposalId, ctx.member, availablePower);
            _rollUntilExecutable(ctx.strategy, proposalId, REQUEST_AMOUNT);

            uint256 balanceBefore = ctx.token.balanceOf(ctx.beneficiary);
            vm.prank(ctx.council);
            ctx.allo.distribute(ctx.poolId, new address[](0), abi.encode(proposalId));

            (, address beneficiary,, uint256 requestedAmount,, ProposalStatus status,,,,,,) =
                ctx.strategy.getProposal(proposalId);
            assertEq(beneficiary, ctx.beneficiary, chains[i]);
            assertEq(requestedAmount, REQUEST_AMOUNT, chains[i]);
            assertEq(uint256(status), uint256(ProposalStatus.Executed), chains[i]);
            assertEq(ctx.token.balanceOf(ctx.beneficiary), balanceBefore + REQUEST_AMOUNT, chains[i]);
        }
    }

    function testFork_cancelProposal_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            (ForkContext memory ctx, uint256 proposalId) = _createProposalContext(chains[i]);

            vm.prank(ctx.member);
            ctx.strategy.cancelProposal(proposalId);

            (,,,,, ProposalStatus status,,,,,,) = ctx.strategy.getProposal(proposalId);
            assertEq(uint256(status), uint256(ProposalStatus.Cancelled), chains[i]);
        }
    }

    function testFork_disputeProposal_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            (ForkContext memory ctx, uint256 proposalId) = _createProposalContext(chains[i]);
            _registerMember(ctx, ctx.challenger, CHALLENGER_TOTAL_STAKE);

            uint256 disputeId = _disputeProposal(ctx, proposalId);
            (,,,,, ProposalStatus status,,,,,,) = ctx.strategy.getProposal(proposalId);

            assertGt(disputeId, 0, chains[i]);
            assertEq(uint256(status), uint256(ProposalStatus.Disputed), chains[i]);
        }
    }

    function testFork_ruleProposal_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            string memory chain = chains[i];
            (ForkContext memory ctx, uint256 proposalId) = _createProposalContext(chain);
            _registerMember(ctx, ctx.challenger, CHALLENGER_TOTAL_STAKE);

            uint256 disputeId = _disputeProposal(ctx, proposalId);
            assertGt(disputeId, 0, chain);
            assertEq(_arbitratorLastDisputeId(ctx.arbitrator), disputeId, chain);
            assertGe(_arbitratorDisputesLength(ctx.arbitrator), disputeId, chain);

            _executeRuling(ctx, disputeId, 1, chain);

            (,,,,, ProposalStatus status,,,,,,) = ctx.strategy.getProposal(proposalId);
            assertEq(uint256(status), uint256(ProposalStatus.Active), chain);
            assertEq(ctx.strategy.disputeCount(), 0, chain);
        }
    }

    function testFork_communityAdminFacet_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createCommunity(chains[i], true);
            address owner = ctx.community.owner();
            address newOwnerSafe = makeAddr(string.concat(chains[i], "-new-council"));

            vm.prank(owner);
            ctx.community.setStrategyTemplate(makeAddr(string.concat(chains[i], "-strategy-template")));

            vm.prank(owner);
            ctx.community.setCollateralVaultTemplate(makeAddr(string.concat(chains[i], "-vault-template")));

            vm.prank(ctx.council);
            ctx.community.setArchived(true);

            vm.prank(ctx.council);
            ctx.community.setBasisStakedAmount(2 ether);

            vm.prank(ctx.council);
            ctx.community.setCommunityFee(25);

            vm.prank(ctx.council);
            ctx.community.setCouncilSafe(payable(newOwnerSafe));

            vm.prank(newOwnerSafe);
            ctx.community.acceptCouncilSafe();

            assertEq(ctx.community.registerStakeAmount(), 2 ether, chains[i]);
            assertEq(ctx.community.communityFee(), 25, chains[i]);
            assertEq(address(ctx.community.councilSafe()), newOwnerSafe, chains[i]);
        }
    }

    function testFork_registerMember_kickMember_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory zeroStakeCtx = _createCommunity(chains[i], false);
            vm.prank(zeroStakeCtx.council);
            zeroStakeCtx.community.setBasisStakedAmount(0);

            if (_hasSelector(address(zeroStakeCtx.community), IRegistryCommunityFacetHarness.registerMember.selector)) {
                IRegistryCommunityFacetHarness communityHarness =
                    IRegistryCommunityFacetHarness(address(zeroStakeCtx.community));
                vm.prank(zeroStakeCtx.member);
                communityHarness.registerMember();
                assertTrue(zeroStakeCtx.community.isMember(zeroStakeCtx.member), chains[i]);
            }

            ForkContext memory kickCtx = _createCommunity(chains[i], true);
            _registerMember(kickCtx, kickCtx.member, REGISTER_STAKE);
            address recipient = makeAddr(string.concat(chains[i], "-kick-recipient"));

            vm.prank(kickCtx.council);
            kickCtx.community.kickMember(kickCtx.member, recipient);

            assertFalse(kickCtx.community.isMember(kickCtx.member), chains[i]);
            assertEq(kickCtx.token.balanceOf(recipient), REGISTER_STAKE, chains[i]);
        }
    }

    function testFork_communityStrategyFacet_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createCommunity(chains[i], true);
            (uint256 poolId, address strategyAddress) =
                _createPoolOnly(ctx, address(ctx.token), PointSystem.Fixed, address(0));

            vm.prank(ctx.council);
            ctx.community.addStrategyByPoolId(poolId);
            assertTrue(ctx.community.enabledStrategies(strategyAddress), chains[i]);

            vm.prank(ctx.council);
            ctx.community.removeStrategyByPoolId(poolId);
            assertFalse(ctx.community.enabledStrategies(strategyAddress), chains[i]);

            vm.prank(ctx.council);
            ctx.community.addStrategy(strategyAddress);
            assertTrue(ctx.community.enabledStrategies(strategyAddress), chains[i]);

            vm.prank(ctx.council);
            ctx.community.rejectPool(strategyAddress);
            assertFalse(ctx.community.enabledStrategies(strategyAddress), chains[i]);

            vm.prank(ctx.council);
            ctx.community.addStrategy(strategyAddress);
            vm.prank(ctx.council);
            ctx.community.removeStrategy(strategyAddress);
            assertFalse(ctx.community.enabledStrategies(strategyAddress), chains[i]);
        }
    }

    function testFork_editProposal_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            (ForkContext memory ctx, uint256 proposalId) = _createProposalContext(chains[i]);
            Metadata memory metadata = Metadata({protocol: 2, pointer: string.concat("edited-proposal-", chains[i])});

            vm.prank(ctx.member);
            ctx.strategy.editProposal(proposalId, metadata, ctx.challenger, 2 ether);

            (, address beneficiary,, uint256 requestedAmount,, ProposalStatus status,,,,,,) =
                ctx.strategy.getProposal(proposalId);
            assertEq(beneficiary, ctx.challenger, chains[i]);
            assertEq(requestedAmount, 2 ether, chains[i]);
            assertEq(uint256(status), uint256(ProposalStatus.Active), chains[i]);
        }
    }

    function testFork_strategyAdminAndPauseFacet_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createPool(chains[i]);
            address strategyOwner = ctx.strategy.proxyOwner();
            MockPauseController pauseController = new MockPauseController();
            address newTemplate = makeAddr(string.concat(chains[i], "-new-collateral-template"));
            ICVStrategyFacetHarness strategyHarness = ICVStrategyFacetHarness(address(ctx.strategy));
            IRegistryCommunityFacetHarness communityHarness = IRegistryCommunityFacetHarness(address(ctx.community));

            vm.prank(strategyOwner);
            ctx.strategy.setCollateralVaultTemplate(newTemplate);

            vm.prank(strategyOwner);
            ctx.strategy.setPauseController(address(pauseController));

            vm.prank(strategyOwner);
            strategyHarness.setPauseFacet(address(ctx.strategy));

            vm.prank(strategyOwner);
            strategyHarness.pause(1 days);
            assertTrue(strategyHarness.isPaused(), chains[i]);

            vm.prank(strategyOwner);
            strategyHarness.unpause();
            assertFalse(strategyHarness.isPaused(), chains[i]);

            vm.prank(strategyOwner);
            strategyHarness.pause(CVStrategy.allocate.selector, 1 days);
            assertTrue(strategyHarness.isPaused(CVStrategy.allocate.selector), chains[i]);

            vm.prank(strategyOwner);
            strategyHarness.unpause(CVStrategy.allocate.selector);
            assertFalse(strategyHarness.isPaused(CVStrategy.allocate.selector), chains[i]);

            vm.prank(ctx.community.owner());
            ctx.community.setPauseController(address(pauseController));

            vm.prank(ctx.community.owner());
            communityHarness.setPauseFacet(address(ctx.community));

            vm.prank(ctx.community.owner());
            communityHarness.pause(1 days);
            assertTrue(communityHarness.isPaused(), chains[i]);

            vm.prank(ctx.community.owner());
            communityHarness.unpause();
            assertFalse(communityHarness.isPaused(), chains[i]);
        }
    }

    function testFork_strategyVotingRegistryAndSyncFacet_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createCommunity(chains[i], true);
            MockVotingPowerRegistryFork votingRegistry = new MockVotingPowerRegistryFork();
            address factoryOwner = ctx.factory.owner();
            ICVStrategyFacetHarness strategyHarness;

            vm.prank(factoryOwner);
            ctx.factory.registerContract(address(votingRegistry));

            ctx = _createPoolWithExistingCommunity(ctx, address(ctx.token), PointSystem.Custom, address(votingRegistry));

            votingRegistry.setMember(ctx.member, true);
            votingRegistry.setMember(ctx.challenger, true);
            votingRegistry.setMemberPower(ctx.member, 300 ether);
            votingRegistry.setMemberPower(ctx.challenger, 120 ether);

            _registerMember(ctx, ctx.member, REGISTER_STAKE);
            _registerMember(ctx, ctx.challenger, REGISTER_STAKE);
            _activatePoints(ctx, ctx.member);
            _activatePoints(ctx, ctx.challenger);
            strategyHarness = ICVStrategyFacetHarness(address(ctx.strategy));

            vm.prank(ctx.council);
            strategyHarness.setVotingPowerRegistry(address(votingRegistry));
            assertEq(address(ctx.strategy.votingPowerRegistry()), address(votingRegistry), chains[i]);

            address syncCaller = makeAddr(string.concat(chains[i], "-sync-caller"));
            vm.prank(ctx.council);
            strategyHarness.setAuthorizedSyncCaller(syncCaller, true);
            assertTrue(strategyHarness.isAuthorizedSyncCaller(syncCaller), chains[i]);

            uint256 proposalId = _createProposal(ctx, ctx.member, REQUEST_AMOUNT);
            _allocateSupport(ctx, proposalId, ctx.member, 300 ether);

            votingRegistry.setMemberPower(ctx.member, 150 ether);
            vm.prank(syncCaller);
            strategyHarness.syncPower(ctx.member);
            assertEq(ctx.strategy.totalVoterStakePct(ctx.member), 150 ether, chains[i]);

            votingRegistry.setMemberPower(ctx.member, 120 ether);
            votingRegistry.setMemberPower(ctx.challenger, 80 ether);
            address[] memory members = new address[](2);
            members[0] = ctx.member;
            members[1] = ctx.challenger;

            vm.prank(syncCaller);
            strategyHarness.batchSyncPower(members);

            assertEq(ctx.strategy.totalVoterStakePct(ctx.member), 120 ether, chains[i]);
            assertEq(ctx.strategy.totalPointsActivated(), 200 ether, chains[i]);
        }
    }

    function testFork_strategyConnectDisconnectAndStreamingAdjacents_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            string memory chain = chains[i];
            MockPoolSuperToken superToken = new MockPoolSuperToken();
            ForkContext memory ctx = _createPool(chain);

            ArbitrableConfig memory arb = ArbitrableConfig({
                arbitrator: IArbitrator(address(ctx.arbitrator)),
                tribunalSafe: ctx.council,
                submitterCollateralAmount: 0.01 ether,
                challengerCollateralAmount: 0.02 ether,
                defaultRuling: 1,
                defaultRulingTimeout: 1 days
            });
            CVParams memory cvParams =
                CVParams({maxRatio: 3_656_188, weight: 133_677, decay: 9_940_581, minThresholdPoints: 0});
            address[] memory none = new address[](0);

            _assertPrankedCallSuccess(
                ctx.council,
                address(ctx.strategy),
                abi.encodeWithSelector(bytes4(0xd5b7cc54), arb, cvParams, 0, none, none, address(superToken)),
                string.concat(chain, ": setPoolParams(superToken) reverted"),
                "setPoolParams revertData"
            );

            assertEq(address(ctx.strategy.superfluidToken()), address(superToken), chain);
        }
    }

    function testFork_communityFacetSelectors_allChains() public {
        string[] memory chains = _supportedChains();

        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createCommunity(chains[i], true);
            bytes4[] memory selectors = _communityFacetSelectors(address(ctx.community));

            assertGt(IDiamondLoupe(address(ctx.community)).facetAddresses().length, 0, chains[i]);
            _assertSelectorsPresent(address(ctx.community), selectors, chains[i], "community");
        }
    }

    function testFork_strategyFacetSelectors_allChains() public {
        string[] memory chains = _supportedChains();
        bytes4[] memory selectors = _strategyFacetSelectors();

        for (uint256 i = 0; i < chains.length; i++) {
            ForkContext memory ctx = _createPool(chains[i]);

            assertGt(IDiamondLoupe(address(ctx.strategy)).facetAddresses().length, 0, chains[i]);
            assertGt(ctx.strategy.getFacets().length, 0, chains[i]);
            _assertSelectorsPresent(address(ctx.strategy), selectors, chains[i], "strategy");
        }
    }

    function testFork_communityFacetSurface_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            string memory chain = chains[i];
            ForkContext memory ctx = _createPool(chain);
            IRegistryCommunityFacetHarness communityHarness = IRegistryCommunityFacetHarness(address(ctx.community));

            assertTrue(communityHarness.isCouncilMember(ctx.council), chain);
            assertEq(communityHarness.getBasisStakedAmount(), REGISTER_STAKE, chain);
            assertEq(communityHarness.getStakeAmountWithFees(), REGISTER_STAKE, chain);
            assertEq(communityHarness.ercAddress(), address(ctx.token), chain);

            _registerMember(ctx, ctx.member, MEMBER_TOTAL_STAKE);
            assertTrue(ctx.community.isMember(ctx.member), chain);

            vm.prank(address(ctx.strategy));
            communityHarness.activateMemberInStrategy(ctx.member, address(ctx.strategy));
            assertTrue(ctx.community.memberActivatedInStrategies(ctx.member, address(ctx.strategy)), chain);

            vm.prank(address(ctx.strategy));
            communityHarness.deactivateMemberInStrategy(ctx.member, address(ctx.strategy));
            assertFalse(ctx.community.memberActivatedInStrategies(ctx.member, address(ctx.strategy)), chain);
        }
    }

    function testFork_strategyFacetSurface_allChains() public {
        string[] memory chains = _supportedChains();
        for (uint256 i = 0; i < chains.length; i++) {
            string memory chain = chains[i];
            (ForkContext memory ctx, uint256 proposalId) = _createProposalContext(chain);
            ICVStrategyFacetHarness strategyHarness = ICVStrategyFacetHarness(address(ctx.strategy));
            MockSybilScorerFork sybilScorer = new MockSybilScorerFork();
            address factoryOwner = ctx.factory.owner();
            uint256 availablePower = ctx.community.getMemberPowerInStrategy(ctx.member, address(ctx.strategy));

            _allocateSupport(ctx, proposalId, ctx.member, availablePower);

            assertEq(strategyHarness.getMaxAmount(), MEMBER_TOTAL_STAKE, chain);
            assertEq(uint256(strategyHarness.getPointSystem()), uint256(PointSystem.Fixed), chain);
            assertEq(strategyHarness.getProposalMetadataPointer(proposalId), "proposal-meta");
            assertEq(strategyHarness.getProposalVoterStake(proposalId, ctx.member), availablePower, chain);
            assertEq(ctx.strategy.getPoolAmount(), POOL_FUNDS, chain);

            vm.prank(ctx.council);
            strategyHarness.setPoolActive(false);
            assertFalse(_strategyPoolActive(ctx.strategy), chain);

            vm.prank(ctx.council);
            strategyHarness.setPoolActive(true);
            assertTrue(_strategyPoolActive(ctx.strategy), chain);

            vm.prank(factoryOwner);
            ctx.factory.registerContract(address(sybilScorer));

            sybilScorer.setAllowed(ctx.member, true);
            vm.prank(ctx.council);
            strategyHarness.setSybilScorer(address(sybilScorer), 77);

            assertEq(address(ctx.strategy.sybilScorer()), address(sybilScorer), chain);
            assertEq(sybilScorer.lastStrategy(), address(ctx.strategy), chain);
            assertEq(sybilScorer.lastThreshold(), 77, chain);
            assertEq(sybilScorer.lastCouncilSafe(), ctx.council, chain);

            vm.prank(address(ctx.strategy.registryCommunity()));
            strategyHarness.deactivatePoints(ctx.member);
            assertEq(ctx.strategy.totalPointsActivated(), 0, chain);
        }
    }

    function testFork_registryFactory_healthcheck_allChains() public {
        string[] memory chains = _supportedChains();

        for (uint256 i = 0; i < chains.length; i++) {
            string memory chain = chains[i];
            string memory json = _selectFork(chain);
            RegistryFactory factory = RegistryFactory(payable(json.readAddress(_networkKey(chain, ".PROXIES.REGISTRY_FACTORY"))));

            assertTrue(factory.owner() != address(0), chain);
            assertTrue(factory.gardensFeeReceiver() != address(0), chain);
            assertTrue(factory.registryCommunityTemplate() != address(0), chain);
            assertTrue(factory.strategyTemplate() != address(0), chain);

            (IDiamondCut.FacetCut[] memory communityCuts,,) = factory.getCommunityFacets();
            (IDiamondCut.FacetCut[] memory strategyCuts,,) = factory.getStrategyFacets();
            assertGt(communityCuts.length, 0, chain);
            assertGt(strategyCuts.length, 0, chain);

            (bool success, bytes memory data) = address(factory).staticcall(
                abi.encodeWithSelector(RegistryFactory.isStreamRebalanceCallerAllowed.selector, address(0))
            );
            assertTrue(success, string.concat(chain, ": factory missing stream rebalance selector"));
            assertFalse(abi.decode(data, (bool)), chain);
        }
    }

    function _createCommunity(string memory chain, bool kickEnabled) internal returns (ForkContext memory ctx) {
        string memory json = _selectFork(chain);

        ctx.factory = RegistryFactory(payable(json.readAddress(_networkKey(chain, ".PROXIES.REGISTRY_FACTORY"))));
        ctx.allo = Allo(json.readAddress(_networkKey(chain, ".ENVS.ALLO_PROXY")));
        ctx.arbitrator = SafeArbitrator(payable(json.readAddress(_networkKey(chain, ".ENVS.ARBITRATOR"))));
        ctx.token = new GV2ERC20("Fork Health Token", "FHT", 18);
        ctx.council = makeAddr(string.concat(chain, "-council"));
        ctx.feeReceiver = makeAddr(string.concat(chain, "-fee"));
        ctx.member = makeAddr(string.concat(chain, "-member"));
        ctx.challenger = makeAddr(string.concat(chain, "-challenger"));
        ctx.beneficiary = makeAddr(string.concat(chain, "-beneficiary"));

        vm.deal(ctx.council, 100 ether);
        vm.deal(ctx.member, 100 ether);
        vm.deal(ctx.challenger, 100 ether);

        RegistryCommunityInitializeParams memory params = RegistryCommunityInitializeParams({
            _allo: address(ctx.allo),
            _gardenToken: IERC20(address(ctx.token)),
            _registerStakeAmount: REGISTER_STAKE,
            _communityFee: 0,
            _nonce: 0,
            _registryFactory: address(ctx.factory),
            _feeReceiver: ctx.feeReceiver,
            _metadata: Metadata({protocol: 1, pointer: string.concat("community-meta-", chain)}),
            _councilSafe: payable(ctx.council),
            _communityName: string.concat("fork-community-", chain),
            _isKickEnabled: kickEnabled,
            covenantIpfsHash: string.concat("community-covenant-", chain)
        });

        ctx.community = RegistryCommunity(payable(ctx.factory.createRegistry(params)));
        _assertCommunityDeploymentMatchesConfig(chain, json, address(ctx.community));
    }

    function _createPool(string memory chain) internal returns (ForkContext memory ctx) {
        ctx = _createCommunity(chain, true);
        return _createPoolWithExistingCommunity(ctx, address(ctx.token), PointSystem.Fixed, address(0));
    }

    function _createPoolWithExistingCommunity(
        ForkContext memory ctx,
        address poolToken,
        PointSystem pointSystem,
        address votingPowerRegistry
    ) internal returns (ForkContext memory) {
        address strategyAddress;

        address[] memory initialAllowlist = new address[](2);
        initialAllowlist[0] = ctx.member;
        initialAllowlist[1] = ctx.challenger;

        CVStrategyInitializeParamsV0_3 memory params = CVStrategyInitializeParamsV0_3({
            cvParams: CVParams({maxRatio: 3_656_188, weight: 133_677, decay: 9_940_581, minThresholdPoints: 0}),
            proposalType: ProposalType.Funding,
            pointSystem: pointSystem,
            pointConfig: PointSystemConfig({maxAmount: MEMBER_TOTAL_STAKE}),
            arbitrableConfig: ArbitrableConfig({
                arbitrator: IArbitrator(address(ctx.arbitrator)),
                tribunalSafe: ctx.council,
                submitterCollateralAmount: 0.01 ether,
                challengerCollateralAmount: 0.02 ether,
                defaultRuling: 1,
                defaultRulingTimeout: 1 days
            }),
            initialAllowlist: initialAllowlist,
            sybilScorer: address(0),
            sybilScorerThreshold: 0,
            registryCommunity: address(ctx.community),
            superfluidToken: address(0),
            streamingRatePerSecond: 0,
            votingPowerRegistry: votingPowerRegistry
        });

        Metadata memory metadata =
            Metadata({protocol: 1, pointer: string.concat("pool-meta-", ctx.community.communityName())});

        vm.startPrank(ctx.council);
        (ctx.poolId, strategyAddress) = _createPoolCompat(ctx.community, poolToken, params, metadata);
        ctx.community.addStrategyByPoolId(ctx.poolId);
        vm.stopPrank();

        ctx.strategy = CVStrategy(payable(strategyAddress));
        _assertStrategyDeploymentMatchesConfig(ctx.community.communityName(), address(ctx.strategy));
        GV2ERC20(poolToken).mint(address(ctx.strategy), POOL_FUNDS);
        if (poolToken != address(ctx.token)) {
            ctx.token = GV2ERC20(poolToken);
        }
        return ctx;
    }

    function _createPoolOnly(
        ForkContext memory ctx,
        address poolToken,
        PointSystem pointSystem,
        address votingPowerRegistry
    ) internal returns (uint256 poolId, address strategyAddress) {
        address[] memory initialAllowlist = new address[](2);
        initialAllowlist[0] = ctx.member;
        initialAllowlist[1] = ctx.challenger;

        CVStrategyInitializeParamsV0_3 memory params = CVStrategyInitializeParamsV0_3({
            cvParams: CVParams({maxRatio: 3_656_188, weight: 133_677, decay: 9_940_581, minThresholdPoints: 0}),
            proposalType: ProposalType.Funding,
            pointSystem: pointSystem,
            pointConfig: PointSystemConfig({maxAmount: MEMBER_TOTAL_STAKE}),
            arbitrableConfig: ArbitrableConfig({
                arbitrator: IArbitrator(address(ctx.arbitrator)),
                tribunalSafe: ctx.council,
                submitterCollateralAmount: 0.01 ether,
                challengerCollateralAmount: 0.02 ether,
                defaultRuling: 1,
                defaultRulingTimeout: 1 days
            }),
            initialAllowlist: initialAllowlist,
            sybilScorer: address(0),
            sybilScorerThreshold: 0,
            registryCommunity: address(ctx.community),
            superfluidToken: address(0),
            streamingRatePerSecond: 0,
            votingPowerRegistry: votingPowerRegistry
        });

        Metadata memory metadata =
            Metadata({protocol: 1, pointer: string.concat("pool-meta-", ctx.community.communityName())});

        vm.prank(ctx.council);
        (poolId, strategyAddress) = _createPoolCompat(ctx.community, poolToken, params, metadata);
        GV2ERC20(poolToken).mint(strategyAddress, POOL_FUNDS);
    }

    function _createPoolCompat(
        RegistryCommunity community,
        address poolToken,
        CVStrategyInitializeParamsV0_3 memory params,
        Metadata memory metadata
    ) internal returns (uint256 poolId, address strategyAddress) {
        bytes4 selector = _communityCreatePoolSelector(address(community));
        bytes memory callData;

        if (selector == COMMUNITY_CREATE_POOL_SELECTOR_V0_3) {
            callData = abi.encodeWithSelector(selector, poolToken, params, metadata);
        } else if (selector == COMMUNITY_CREATE_POOL_SELECTOR_V0_2) {
            CVStrategyInitializeParamsV0_2 memory legacyParams = CVStrategyInitializeParamsV0_2({
                cvParams: params.cvParams,
                proposalType: params.proposalType,
                pointSystem: params.pointSystem,
                pointConfig: params.pointConfig,
                arbitrableConfig: params.arbitrableConfig,
                registryCommunity: params.registryCommunity,
                sybilScorer: params.sybilScorer,
                sybilScorerThreshold: params.sybilScorerThreshold,
                initialAllowlist: params.initialAllowlist,
                superfluidToken: params.superfluidToken
            });
            callData = abi.encodeWithSelector(selector, poolToken, legacyParams, metadata);
        } else {
            revert("unsupported community createPool selector");
        }

        (bool ok, bytes memory returndata) = address(community).call(callData);
        if (!ok) {
            assembly {
                revert(add(returndata, 0x20), mload(returndata))
            }
        }

        (poolId, strategyAddress) = abi.decode(returndata, (uint256, address));
    }

    function _createProposalContext(string memory chain) internal returns (ForkContext memory ctx, uint256 proposalId) {
        ctx = _createPool(chain);
        _registerMember(ctx, ctx.member, MEMBER_TOTAL_STAKE);
        _activatePoints(ctx, ctx.member);
        proposalId = _createProposal(ctx, ctx.member, REQUEST_AMOUNT);
    }

    function _registerMember(ForkContext memory ctx, address user, uint256 totalStake) internal {
        ctx.token.mint(user, totalStake + 10 ether);

        vm.startPrank(user);
        ctx.token.approve(address(ctx.community), type(uint256).max);
        ctx.community.stakeAndRegisterMember("");
        if (totalStake > REGISTER_STAKE) {
            ctx.community.increasePower(totalStake - REGISTER_STAKE);
        }
        vm.stopPrank();
    }

    function _activatePoints(ForkContext memory ctx, address user) internal {
        vm.prank(user);
        ctx.strategy.activatePoints();
    }

    function _createProposal(ForkContext memory ctx, address submitter, uint256 requestedAmount)
        internal
        returns (uint256 proposalId)
    {
        CreateProposal memory proposal = CreateProposal({
            poolId: ctx.poolId,
            beneficiary: ctx.beneficiary,
            amountRequested: requestedAmount,
            requestedToken: address(ctx.token),
            metadata: Metadata({protocol: 1, pointer: "proposal-meta"})
        });

        (,, uint256 submitterCollateralAmount,,,) = ctx.strategy.getArbitrableConfig();
        vm.deal(submitter, submitterCollateralAmount + 1 ether);

        vm.prank(submitter);
        proposalId =
            uint160(ctx.allo.registerRecipient{value: submitterCollateralAmount}(ctx.poolId, abi.encode(proposal)));
    }

    function _allocateSupport(ForkContext memory ctx, uint256 proposalId, address voter, uint256 supportAmount)
        internal
    {
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport({proposalId: proposalId, deltaSupport: int256(supportAmount)});

        vm.prank(voter);
        ctx.allo.allocate(ctx.poolId, abi.encode(votes));
    }

    function _disputeProposal(ForkContext memory ctx, uint256 proposalId) internal returns (uint256 disputeId) {
        (IArbitrator arbitrator,, uint256 submitterCollateralAmount, uint256 challengerCollateralAmount,,) =
            ctx.strategy.getArbitrableConfig();
        uint256 arbitrationFee = arbitrator.arbitrationCost("");
        uint256 valueToSend = challengerCollateralAmount + arbitrationFee;

        vm.deal(ctx.challenger, valueToSend + 1 ether);
        vm.prank(ctx.challenger);
        disputeId = ctx.strategy.disputeProposal{value: valueToSend}(proposalId, "fork-healthcheck", "");

        assertGt(submitterCollateralAmount, 0);
    }

    function _rollUntilExecutable(CVStrategy strategy, uint256 proposalId, uint256 requestedAmount) internal {
        for (uint256 i = 0; i < MAX_EXECUTION_BLOCK_STEPS; i++) {
            if (strategy.calculateProposalConviction(proposalId) > strategy.calculateThreshold(requestedAmount)) {
                return;
            }
            vm.roll(block.number + 1);
        }

        revert("proposal did not reach execution threshold");
    }

    function _executeRuling(ForkContext memory ctx, uint256 disputeId, uint256 ruling, string memory chain) internal {
        vm.prank(ctx.council);
        (bool success, bytes memory revertData) = address(ctx.arbitrator)
            .call(abi.encodeCall(SafeArbitrator.executeRuling, (disputeId, ruling, address(ctx.strategy))));

        if (!success) {
            emit log_named_uint("arbitrator.disputes.length", _arbitratorDisputesLength(ctx.arbitrator));
            emit log_named_uint("arbitrator.lastDisputeID", _arbitratorLastDisputeId(ctx.arbitrator));
            emit log_named_bytes("executeRuling revertData", revertData);
        }

        assertTrue(success, string.concat(chain, ": executeRuling reverted"));
    }

    function _arbitratorDisputesLength(SafeArbitrator arbitrator) internal view returns (uint256) {
        return uint256(vm.load(address(arbitrator), bytes32(uint256(152))));
    }

    function _arbitratorLastDisputeId(SafeArbitrator arbitrator) internal view returns (uint256) {
        return uint256(vm.load(address(arbitrator), bytes32(uint256(153))));
    }

    function _assertPrankedCallSuccess(
        address caller,
        address target,
        bytes memory data,
        string memory errorMessage,
        string memory revertLabel
    ) internal {
        vm.prank(caller);
        (bool success, bytes memory revertData) = target.call(data);
        if (!success) {
            emit log_named_bytes(revertLabel, revertData);
        }
        assertTrue(success, errorMessage);
    }

    function _assertSelectorsPresent(
        address diamond,
        bytes4[] memory selectors,
        string memory chain,
        string memory label
    ) internal {
        for (uint256 i = 0; i < selectors.length; i++) {
            if (IDiamondLoupe(diamond).facetAddress(selectors[i]) == address(0)) {
                emit log_named_bytes32(string.concat(label, " missing selector"), bytes32(selectors[i]));
                assertTrue(false, string.concat(chain, ": missing ", label, " selector"));
            }
        }
    }

    function _assertCommunityDeploymentMatchesConfig(string memory chain, string memory json, address community)
        internal
    {
        address expectedImplementation = json.readAddress(_networkKey(chain, ".IMPLEMENTATIONS.REGISTRY_COMMUNITY"));
        assertEq(
            _implementationAddress(community),
            expectedImplementation,
            string.concat(chain, ": community implementation mismatch")
        );

        address[] memory expectedFacetAddresses = new address[](7);
        expectedFacetAddresses[0] = json.readAddress(_networkKey(chain, ".FACETS.COMMUNITY_DIAMOND_LOUPE"));
        expectedFacetAddresses[1] = json.readAddress(_networkKey(chain, ".FACETS.COMMUNITY_ADMIN"));
        expectedFacetAddresses[2] = json.readAddress(_networkKey(chain, ".FACETS.COMMUNITY_MEMBER"));
        expectedFacetAddresses[3] = json.readAddress(_networkKey(chain, ".FACETS.COMMUNITY_PAUSE"));
        expectedFacetAddresses[4] = json.readAddress(_networkKey(chain, ".FACETS.COMMUNITY_POOL"));
        expectedFacetAddresses[5] = json.readAddress(_networkKey(chain, ".FACETS.COMMUNITY_POWER"));
        expectedFacetAddresses[6] = json.readAddress(_networkKey(chain, ".FACETS.COMMUNITY_STRATEGY"));

        _assertFacetAddressSet(
            address(community), expectedFacetAddresses, string.concat(chain, ": community facets mismatch")
        );
    }

    function _assertStrategyDeploymentMatchesConfig(string memory communityName, address strategy) internal {
        string memory chain = _chainFromCommunityName(communityName);
        string memory json = vm.readFile(_networksJsonPath());
        address expectedImplementation = json.readAddress(_networkKey(chain, ".IMPLEMENTATIONS.CV_STRATEGY"));
        assertEq(
            _implementationAddress(strategy),
            expectedImplementation,
            string.concat(chain, ": strategy implementation mismatch")
        );

        address[] memory expectedFacetAddresses = new address[](9);
        expectedFacetAddresses[0] = json.readAddress(_networkKey(chain, ".FACETS.DIAMOND_LOUPE"));
        expectedFacetAddresses[1] = json.readAddress(_networkKey(chain, ".FACETS.CV_ADMIN"));
        expectedFacetAddresses[2] = json.readAddress(_networkKey(chain, ".FACETS.CV_ALLOCATION"));
        expectedFacetAddresses[3] = json.readAddress(_networkKey(chain, ".FACETS.CV_DISPUTE"));
        expectedFacetAddresses[4] = json.readAddress(_networkKey(chain, ".FACETS.CV_PAUSE"));
        expectedFacetAddresses[5] = json.readAddress(_networkKey(chain, ".FACETS.CV_POWER"));
        expectedFacetAddresses[6] = json.readAddress(_networkKey(chain, ".FACETS.CV_PROPOSAL"));
        expectedFacetAddresses[7] = json.readAddress(_networkKey(chain, ".FACETS.CV_SYNC_POWER"));
        expectedFacetAddresses[8] = json.readAddress(_networkKey(chain, ".FACETS.CV_STREAMING"));

        _assertFacetAddressSet(strategy, expectedFacetAddresses, string.concat(chain, ": strategy facets mismatch"));
    }

    function _assertFacetAddressSet(address diamond, address[] memory expected, string memory errorMessage) internal {
        address[] memory actual = IDiamondLoupe(diamond).facetAddresses();
        assertEq(actual.length, expected.length, errorMessage);

        for (uint256 i = 0; i < expected.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < actual.length; j++) {
                if (actual[j] == expected[i]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                emit log_named_address("missing expected facet", expected[i]);
                assertTrue(false, errorMessage);
            }
        }
    }

    function _implementationAddress(address proxy) internal view returns (address) {
        return address(uint160(uint256(vm.load(proxy, ERC1967_IMPLEMENTATION_SLOT))));
    }

    function _chainFromCommunityName(string memory communityName) internal pure returns (string memory) {
        bytes memory nameBytes = bytes(communityName);
        bytes memory prefix = bytes("fork-community-");
        if (nameBytes.length <= prefix.length) {
            revert("invalid community name");
        }

        bytes memory chainBytes = new bytes(nameBytes.length - prefix.length);
        for (uint256 i = 0; i < chainBytes.length; i++) {
            chainBytes[i] = nameBytes[i + prefix.length];
        }
        return string(chainBytes);
    }

    function _hasSelector(address diamond, bytes4 selector) internal view returns (bool) {
        return IDiamondLoupe(diamond).facetAddress(selector) != address(0);
    }

    function _strategyPoolActive(CVStrategy strategy) internal view returns (bool) {
        return uint256(vm.load(address(strategy), bytes32(uint256(103)))) != 0;
    }

    function _communityFacetSelectors(address community) internal view returns (bytes4[] memory selectors) {
        selectors = new bytes4[](47);
        selectors[0] = IDiamondLoupe.facets.selector;
        selectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        selectors[2] = IDiamondLoupe.facetAddresses.selector;
        selectors[3] = IDiamondLoupe.facetAddress.selector;
        selectors[4] = IRegistryCommunityFacetHarness.isCouncilMember.selector;
        selectors[5] = RegistryCommunity.setStrategyTemplate.selector;
        selectors[6] = RegistryCommunity.setCollateralVaultTemplate.selector;
        selectors[7] = RegistryCommunity.setArchived.selector;
        selectors[8] = RegistryCommunity.setBasisStakedAmount.selector;
        selectors[9] = RegistryCommunity.setCommunityFee.selector;
        selectors[10] = RegistryCommunity.setCouncilSafe.selector;
        selectors[11] = RegistryCommunity.acceptCouncilSafe.selector;
        selectors[12] = RegistryCommunity.setCommunityParams.selector;
        selectors[13] = RegistryCommunity.isMember.selector;
        selectors[14] = IRegistryCommunityFacetHarness.getBasisStakedAmount.selector;
        selectors[15] = RegistryCommunity.getStakeAmountWithFees.selector;
        selectors[16] = RegistryCommunity.stakeAndRegisterMember.selector;
        selectors[17] = RegistryCommunity.unregisterMember.selector;
        selectors[18] = RegistryCommunity.kickMember.selector;
        selectors[19] = IRegistryCommunityFacetHarness.registerMember.selector;
        selectors[20] = IRegistryCommunityFacetHarness.ercAddress.selector;
        selectors[21] = RegistryCommunity.getMemberPowerInStrategy.selector;
        selectors[22] = RegistryCommunity.getMemberStakedAmount.selector;
        selectors[23] = IRegistryCommunityFacetHarness.activateMemberInStrategy.selector;
        selectors[24] = IRegistryCommunityFacetHarness.deactivateMemberInStrategy.selector;
        selectors[25] = RegistryCommunity.increasePower.selector;
        selectors[26] = RegistryCommunity.decreasePower.selector;
        selectors[27] = IRegistryCommunityFacetHarness.isRegisteredMember.selector;
        selectors[28] = RegistryCommunity.addStrategyByPoolId.selector;
        selectors[29] = RegistryCommunity.addStrategy.selector;
        selectors[30] = RegistryCommunity.removeStrategyByPoolId.selector;
        selectors[31] = RegistryCommunity.removeStrategy.selector;
        selectors[32] = RegistryCommunity.rejectPool.selector;
        selectors[33] = _communityCreatePoolSelector(community);
        selectors[34] = _communityCreatePoolCustomSelector(community);
        selectors[35] = RegistryCommunity.setPauseController.selector;
        selectors[36] = IRegistryCommunityFacetHarness.setPauseFacet.selector;
        selectors[37] = IRegistryCommunityFacetHarness.pauseFacet.selector;
        selectors[38] = IRegistryCommunityFacetHarness.pauseController.selector;
        selectors[39] = bytes4(keccak256("pause(uint256)"));
        selectors[40] = bytes4(keccak256("pause(bytes4,uint256)"));
        selectors[41] = bytes4(keccak256("unpause()"));
        selectors[42] = bytes4(keccak256("unpause(bytes4)"));
        selectors[43] = bytes4(keccak256("isPaused()"));
        selectors[44] = bytes4(keccak256("isPaused(bytes4)"));
        selectors[45] = IRegistryCommunityFacetHarness.pausedUntil.selector;
        selectors[46] = IRegistryCommunityFacetHarness.pausedSelectorUntil.selector;
    }

    function _strategyFacetSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](43);
        selectors[0] = IDiamondLoupe.facets.selector;
        selectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        selectors[2] = IDiamondLoupe.facetAddresses.selector;
        selectors[3] = IDiamondLoupe.facetAddress.selector;
        selectors[4] = CVStrategy.registerRecipient.selector;
        selectors[5] = CVStrategy.activatePoints.selector;
        selectors[6] = bytes4(keccak256("deactivatePoints()"));
        selectors[7] = CVStrategy.increasePower.selector;
        selectors[8] = CVStrategy.decreasePower.selector;
        selectors[9] = bytes4(keccak256("deactivatePoints(address)"));
        selectors[10] = CVStrategy.allocate.selector;
        selectors[11] = CVStrategy.distribute.selector;
        selectors[12] = ICVStrategyFacetHarness.getPoolAmount.selector;
        selectors[13] = STRATEGY_SET_POOL_PARAMS_SELECTOR;
        selectors[14] = STRATEGY_SET_POOL_PARAMS_WITH_RATE_SELECTOR;
        selectors[15] = CVStrategy.connectSuperfluidGDA.selector;
        selectors[16] = CVStrategy.disconnectSuperfluidGDA.selector;
        selectors[17] = CVStrategy.disputeProposal.selector;
        selectors[18] = CVStrategy.rule.selector;
        selectors[19] = CVStrategy.cancelProposal.selector;
        selectors[20] = CVStrategy.editProposal.selector;
        selectors[21] = CVStrategy.rebalance.selector;
        selectors[22] = ICVStrategyFacetHarness.setVotingPowerRegistry.selector;
        selectors[23] = ICVStrategyFacetHarness.setAuthorizedSyncCaller.selector;
        selectors[24] = ICVStrategyFacetHarness.isAuthorizedSyncCaller.selector;
        selectors[25] = ICVStrategyFacetHarness.syncPower.selector;
        selectors[26] = ICVStrategyFacetHarness.batchSyncPower.selector;
        selectors[27] = ICVStrategyFacetHarness.setAuthorizedRebalanceCaller.selector;
        selectors[28] = ICVStrategyFacetHarness.isAuthorizedRebalanceCaller.selector;
        selectors[29] = ICVStrategyFacetHarness.stopEscrowStream.selector;
        selectors[30] = ICVStrategyFacetHarness.wrapIfNeeded.selector;
        selectors[31] = CVStrategy.setPauseController.selector;
        selectors[32] = ICVStrategyFacetHarness.setPauseFacet.selector;
        selectors[33] = ICVStrategyFacetHarness.pauseFacet.selector;
        selectors[34] = ICVStrategyFacetHarness.pauseController.selector;
        selectors[35] = bytes4(keccak256("pause(uint256)"));
        selectors[36] = bytes4(keccak256("pause(bytes4,uint256)"));
        selectors[37] = bytes4(keccak256("unpause()"));
        selectors[38] = bytes4(keccak256("unpause(bytes4)"));
        selectors[39] = bytes4(keccak256("isPaused()"));
        selectors[40] = bytes4(keccak256("isPaused(bytes4)"));
        selectors[41] = ICVStrategyFacetHarness.pausedUntil.selector;
        selectors[42] = ICVStrategyFacetHarness.pausedSelectorUntil.selector;
    }

    function _selectFork(string memory chain) internal returns (string memory json) {
        string memory rpcUrl = vm.envOr("FORK_HEALTHCHECK_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) {
            rpcUrl = _rpcUrl(chain);
        }
        require(bytes(rpcUrl).length != 0, string.concat("Missing RPC env for ", chain));

        vm.createSelectFork(rpcUrl);
        return vm.readFile(_networksJsonPath());
    }

    function _networkKey(string memory chain, string memory suffix) internal pure returns (string memory) {
        return string.concat("$.networks[?(@.name=='", _canonicalChain(chain), "')]", suffix);
    }

    function _networksJsonPath() internal view returns (string memory) {
        return string.concat(vm.projectRoot(), "/pkg/contracts/config/networks.json");
    }

    function _rpcEnv(string memory chain) internal pure returns (string memory) {
        chain = _canonicalChain(chain);
        if (_eq(chain, "ethsepolia")) return "RPC_URL_SEP_TESTNET";
        if (_eq(chain, "arbsepolia")) return "RPC_URL_ARB_TESTNET";
        if (_eq(chain, "opsepolia")) return "RPC_URL_OP_TESTNET";
        if (_eq(chain, "arbitrum")) return "RPC_URL_ARB";
        if (_eq(chain, "optimism")) return "RPC_URL_OPT";
        if (_eq(chain, "ethereum")) return "RPC_URL_ETHEREUM";
        if (_eq(chain, "polygon")) return "RPC_URL_POLYGON";
        if (_eq(chain, "gnosis")) return "RPC_URL_GNOSIS";
        if (_eq(chain, "base")) return "RPC_URL_BASE";
        if (_eq(chain, "celo")) return "RPC_URL_CELO";
        revert("unsupported chain");
    }

    function _supportedChains() internal view returns (string[] memory chains) {
        string memory selectedChain = vm.envOr("FORK_HEALTHCHECK_CHAIN", string(""));
        if (bytes(selectedChain).length != 0) {
            chains = new string[](1);
            chains[0] = _canonicalChain(selectedChain);
            return chains;
        }

        bool includeTestnets = vm.envOr("FORK_HEALTHCHECK_INCLUDE_TESTNETS", false);
        if (includeTestnets) {
            chains = new string[](10);
            chains[0] = "ethsepolia";
            chains[1] = "arbsepolia";
            chains[2] = "opsepolia";
            chains[3] = "arbitrum";
            chains[4] = "optimism";
            chains[5] = "ethereum";
            chains[6] = "polygon";
            chains[7] = "gnosis";
            chains[8] = "base";
            chains[9] = "celo";
            return chains;
        }

        chains = new string[](7);
        chains[0] = "arbitrum";
        chains[1] = "optimism";
        chains[2] = "ethereum";
        chains[3] = "polygon";
        chains[4] = "gnosis";
        chains[5] = "base";
        chains[6] = "celo";
    }

    function _rpcUrl(string memory chain) internal view returns (string memory) {
        string memory primary = _rpcEnv(chain);
        string memory premium = _premiumRpcEnv(chain);
        return vm.envOr(premium, vm.envOr(primary, string("")));
    }

    function _premiumRpcEnv(string memory chain) internal pure returns (string memory) {
        chain = _canonicalChain(chain);
        if (_eq(chain, "ethsepolia")) return "PREMIUM_RPC_URL_SEP_TESTNET";
        if (_eq(chain, "arbsepolia")) return "PREMIUM_RPC_URL_ARB_TESTNET";
        if (_eq(chain, "opsepolia")) return "PREMIUM_RPC_URL_OP_TESTNET";
        if (_eq(chain, "arbitrum")) return "PREMIUM_RPC_URL_ARB";
        if (_eq(chain, "optimism")) return "PREMIUM_RPC_URL_OPT";
        if (_eq(chain, "ethereum")) return "PREMIUM_RPC_URL_ETHEREUM";
        if (_eq(chain, "polygon")) return "PREMIUM_RPC_URL_POLYGON";
        if (_eq(chain, "gnosis")) return "PREMIUM_RPC_URL_GNOSIS";
        if (_eq(chain, "base")) return "PREMIUM_RPC_URL_BASE";
        if (_eq(chain, "celo")) return "PREMIUM_RPC_URL_CELO";
        revert("unsupported chain");
    }

    function _canonicalChain(string memory chain) internal pure returns (string memory) {
        if (_eq(chain, "mainnet")) return "ethereum";
        return chain;
    }

    function _communityCreatePoolSelector(address community) internal view returns (bytes4) {
        if (_supportsSelector(community, COMMUNITY_CREATE_POOL_SELECTOR_V0_3)) {
            return COMMUNITY_CREATE_POOL_SELECTOR_V0_3;
        }
        if (_supportsSelector(community, COMMUNITY_CREATE_POOL_SELECTOR_V0_2)) {
            return COMMUNITY_CREATE_POOL_SELECTOR_V0_2;
        }
        revert("community createPool selector missing");
    }

    function _communityCreatePoolCustomSelector(address community) internal view returns (bytes4) {
        if (_supportsSelector(community, COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_3)) {
            return COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_3;
        }
        if (_supportsSelector(community, COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_2)) {
            return COMMUNITY_CREATE_POOL_CUSTOM_SELECTOR_V0_2;
        }
        revert("community createPool custom selector missing");
    }

    function _supportsSelector(address diamond, bytes4 selector) internal view returns (bool) {
        return IDiamondLoupe(diamond).facetAddress(selector) != address(0);
    }

    function _eq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
