// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {Proposal, ProposalStatus, ProposalType, ProposalSupport, CVParams, ArbitrableConfig} from "../src/CVStrategy/ICVStrategy.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {ICollateralVault} from "../src/interfaces/ICollateralVault.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {IVotingPowerRegistry} from "../src/interfaces/IVotingPowerRegistry.sol";
import {ConvictionsUtils} from "../src/CVStrategy/ConvictionsUtils.sol";
import {TERC20} from "./shared/TERC20.sol";
import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";

import {MockAlloWithPool, MockCollateralVault} from "./helpers/CVStrategyHelpers.sol";

contract MockRegistryCommunityAlloc {
    error StrategyDisabled();

    mapping(address => bool) public members;
    mapping(address => bool) public activated;
    mapping(address => uint256) public power;
    mapping(bytes32 => mapping(address => bool)) public roles;
    bool public strategyEnabled = true;

    function setMember(address member, bool allowed) external {
        members[member] = allowed;
    }

    function setActivated(address member, bool allowed) external {
        activated[member] = allowed;
    }

    function setMemberPower(address member, uint256 amount) external {
        power[member] = amount;
    }

    function isMember(address member) external view returns (bool) {
        return members[member];
    }

    function memberActivatedInStrategies(address member, address) external view returns (bool) {
        return activated[member];
    }

    function getMemberPowerInStrategy(address member, address) external view returns (uint256) {
        return power[member];
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return roles[role][account];
    }

    function grantRole(bytes32 role, address account) external {
        roles[role][account] = true;
    }

    function setStrategyEnabled(bool enabled) external {
        strategyEnabled = enabled;
    }

    function onlyStrategyEnabled(address) external view {
        if (!strategyEnabled) {
            revert StrategyDisabled();
        }
    }

    function enabledStrategies(address) external view returns (bool) {
        return strategyEnabled;
    }

    // IVotingPowerRegistry compatibility stubs
    function getMemberStakedAmount(address) external pure returns (uint256) {
        return 0;
    }

    function ercAddress() external pure returns (address) {
        return address(0);
    }
}

contract RevertingReceiver {
    receive() external payable {
        revert("nope");
    }
}

contract MockSuperToken {
    TERC20 public underlying;
    uint256 public balance;

    constructor(TERC20 underlying_) {
        underlying = underlying_;
    }

    function setBalance(uint256 amount) external {
        balance = amount;
    }

    function balanceOf(address) external view returns (uint256) {
        return balance;
    }

    function downgrade(uint256 amount) external {
        if (amount > balance) {
            amount = balance;
        }
        balance -= amount;
        underlying.mint(msg.sender, amount);
    }
}

contract CVAllocationFacetHarness is CVAllocationFacet {
    function setAllo(address allo_) external {
        allo = IAllo(allo_);
    }

    function setPoolId(uint256 id) external {
        poolId = id;
    }

    function setRegistryCommunity(address community) external {
        registryCommunity = RegistryCommunity(community);
    }

    function setVotingPowerRegistry(address registry) external {
        votingPowerRegistry = IVotingPowerRegistry(registry);
    }

    function setSybilScorer(address scorer) external {
        sybilScorer = ISybilScorer(scorer);
    }

    function setSuperfluidToken(address token) external {
        superfluidToken = ISuperToken(token);
    }

    function setProposalType(ProposalType proposalType_) external {
        proposalType = proposalType_;
    }

    function setCvParams(CVParams memory params) external {
        cvParams = params;
    }

    function setCollateralVault(address vault) external {
        collateralVault = ICollateralVault(vault);
    }

    function setArbitrableConfig(uint256 version, ArbitrableConfig memory config) external {
        currentArbitrableConfigVersion = version;
        arbitrableConfigs[version] = config;
    }

    function setTotalPointsActivated(uint256 amount) external {
        totalPointsActivated = amount;
    }

    function setTotalStaked(uint256 amount) external {
        totalStaked = amount;
    }

    function setTotalVoterStakePct(address member, uint256 amount) external {
        totalVoterStakePct[member] = amount;
    }

    function setProposal(
        uint256 proposalId,
        ProposalStatus status,
        uint256 requestedAmount,
        address requestedToken,
        address beneficiary,
        address submitter,
        uint256 blockLast,
        uint256 convictionLast,
        uint256 arbitrableVersion
    ) external {
        Proposal storage p = proposals[proposalId];
        p.proposalId = proposalId;
        p.proposalStatus = status;
        p.requestedAmount = requestedAmount;
        p.requestedToken = requestedToken;
        p.beneficiary = beneficiary;
        p.submitter = submitter;
        p.blockLast = blockLast;
        p.convictionLast = convictionLast;
        p.arbitrableConfigVersion = arbitrableVersion;
    }

    function setProposalVoterStake(uint256 proposalId, address voter, uint256 amount) external {
        proposals[proposalId].voterStakedPoints[voter] = amount;
    }

    function setProposalStakedAmount(uint256 proposalId, uint256 amount) external {
        proposals[proposalId].stakedAmount = amount;
    }

    function pushVoterProposal(address voter, uint256 proposalId) external {
        voterStakedProposals[voter].push(proposalId);
    }

    function exposedApplyDelta(uint256 support, int256 delta) external pure returns (uint256) {
        return _applyDelta(support, delta);
    }

    function exposedTransferAmount(address token, address to, uint256 amount) external {
        _transferAmount(token, to, amount);
    }

    function exposedGetPoolAmount() external view returns (uint256) {
        return getPoolAmount();
    }

    function nativeToken() external pure returns (address) {
        return NATIVE_TOKEN;
    }

    function getProposalStatus(uint256 proposalId) external view returns (ProposalStatus) {
        return proposals[proposalId].proposalStatus;
    }

    function getProposalVoterStake(uint256 proposalId, address voter) external view returns (uint256) {
        return proposals[proposalId].voterStakedPoints[voter];
    }
}

contract CVAllocationFacetTest is Test {
    CVAllocationFacetHarness internal facet;
    MockRegistryCommunityAlloc internal registry;
    MockAlloWithPool internal allo;
    MockCollateralVault internal vault;
    TERC20 internal token;

    address internal member = makeAddr("member");
    address internal beneficiary = makeAddr("beneficiary");

    function setUp() public {
        facet = new CVAllocationFacetHarness();
        registry = new MockRegistryCommunityAlloc();
        allo = new MockAlloWithPool();
        vault = new MockCollateralVault();
        token = new TERC20("Token", "TOK", 18);

        facet.setAllo(address(allo));
        facet.setPoolId(1);
        facet.setRegistryCommunity(address(registry));
        facet.setVotingPowerRegistry(address(registry));
        facet.setCollateralVault(address(vault));

        registry.setMember(member, true);
        registry.setActivated(member, true);
        registry.setMemberPower(member, 100);
        allo.setPoolToken(1, address(token));
    }

    function _support(uint256 proposalId, int256 delta) internal pure returns (ProposalSupport[] memory pv) {
        pv = new ProposalSupport[](1);
        pv[0] = ProposalSupport({proposalId: proposalId, deltaSupport: delta});
    }

    function test_allocate_reverts_invalid_status() public {
        facet.setProposal(1, ProposalStatus.Cancelled, 0, address(token), beneficiary, member, 0, 0, 0);

        vm.prank(address(allo));
        vm.expectRevert(
            abi.encodeWithSelector(
                CVAllocationFacet.ProposalInvalidForAllocation.selector,
                1,
                ProposalStatus.Cancelled
            )
        );
        facet.allocate(abi.encode(_support(1, 1)), member);
    }

    function test_allocate_reverts_user_inactive() public {
        registry.setActivated(member, false);
        facet.setProposal(1, ProposalStatus.Active, 0, address(token), beneficiary, member, 0, 0, 0);

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(CVAllocationFacet.UserIsInactive.selector, member));
        facet.allocate(abi.encode(_support(1, 1)), member);
    }

    function test_allocate_reverts_when_strategy_disabled() public {
        registry.setStrategyEnabled(false);
        facet.setProposal(1, ProposalStatus.Active, 0, address(token), beneficiary, member, 0, 0, 0);

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(MockRegistryCommunityAlloc.StrategyDisabled.selector));
        facet.allocate(abi.encode(_support(1, 1)), member);
    }

    function test_allocate_reverts_user_cannot_execute_action() public {
        facet.setProposal(1, ProposalStatus.Active, 0, address(token), beneficiary, member, 0, 0, 0);

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(CVAllocationFacet.UserCannotExecuteAction.selector, member));
        facet.allocate(abi.encode(_support(1, 1)), member);
    }

    function test_allocate_reverts_not_enough_points() public {
        bytes32 role = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));
        registry.grantRole(role, address(0));
        registry.setMemberPower(member, 1);
        facet.setProposal(1, ProposalStatus.Active, 0, address(token), beneficiary, member, 0, 0, 0);

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(CVAllocationFacet.NotEnoughPointsToSupport.selector, 2, 1));
        facet.allocate(abi.encode(_support(1, 2)), member);
    }

    function test_allocate_reverts_duplicate_proposal() public {
        bytes32 role = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));
        registry.grantRole(role, address(0));
        facet.setProposal(1, ProposalStatus.Active, 0, address(token), beneficiary, member, 0, 0, 0);

        ProposalSupport[] memory pv = new ProposalSupport[](2);
        pv[0] = ProposalSupport({proposalId: 1, deltaSupport: 1});
        pv[1] = ProposalSupport({proposalId: 1, deltaSupport: 1});

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(CVAllocationFacet.ProposalSupportDuplicated.selector, 1, 0));
        facet.allocate(abi.encode(pv), member);
    }

    function test_allocate_success_updates_state_and_conviction() public {
        bytes32 role = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));
        registry.grantRole(role, address(0));
        facet.setProposal(1, ProposalStatus.Active, 0, address(token), beneficiary, member, 0, 0, 0);

        vm.prank(address(allo));
        facet.allocate(abi.encode(_support(1, 5)), member);

        assertEq(facet.totalStaked(), 5);
        assertEq(facet.totalVoterStakePct(member), 5);
        assertEq(facet.getProposalVoterStake(1, member), 5);

        vm.roll(block.number + 1);
        vm.prank(address(allo));
        facet.allocate(abi.encode(_support(1, 1)), member);

        assertEq(facet.totalStaked(), 6);
    }

    function test_applyDelta_underflow_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(CVAllocationFacet.SupportUnderflow.selector, 1, -2, -1));
        facet.exposedApplyDelta(1, -2);
    }

    function test_transferAmount_native_reverts_on_failure() public {
        RevertingReceiver receiver = new RevertingReceiver();
        vm.deal(address(facet), 1 ether);

        address nativeToken = facet.nativeToken();
        vm.expectRevert(abi.encodeWithSelector(CVAllocationFacet.NativeTransferFailed.selector, address(receiver), 1));
        facet.exposedTransferAmount(nativeToken, address(receiver), 1);
    }

    function test_distribute_reverts_empty_data() public {
        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(CVAllocationFacet.ProposalDataIsEmpty.selector, 0));
        facet.distribute(new address[](0), "", address(0));
    }

    function test_distribute_reverts_pool_empty() public {
        allo.setPoolToken(1, facet.nativeToken());
        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(CVAllocationFacet.PoolIsEmpty.selector, 0));
        facet.distribute(new address[](0), abi.encode(uint256(1)), address(0));
    }

    function test_distribute_reverts_not_in_list() public {
        allo.setPoolToken(1, facet.nativeToken());
        vm.deal(address(facet), 1 ether);
        facet.setProposalType(ProposalType.Funding);

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(CVAllocationFacet.ProposalNotInList.selector, 1));
        facet.distribute(new address[](0), abi.encode(uint256(1)), address(0));
    }

    function test_distribute_reverts_not_active() public {
        allo.setPoolToken(1, facet.nativeToken());
        vm.deal(address(facet), 1 ether);
        facet.setProposalType(ProposalType.Funding);
        facet.setProposal(1, ProposalStatus.Cancelled, 1, facet.nativeToken(), beneficiary, member, 0, 0, 0);

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(CVAllocationFacet.ProposalNotActive.selector, 1, uint8(ProposalStatus.Cancelled)));
        facet.distribute(new address[](0), abi.encode(uint256(1)), address(0));
    }

    function test_distribute_reverts_pool_amount_not_enough() public {
        allo.setPoolToken(1, facet.nativeToken());
        vm.deal(address(facet), 1 ether);
        facet.setProposalType(ProposalType.Funding);
        facet.setProposal(1, ProposalStatus.Active, 2 ether, facet.nativeToken(), beneficiary, member, 0, 0, 0);

        vm.prank(address(allo));
        vm.expectRevert(
            abi.encodeWithSelector(CVAllocationFacet.PoolAmountNotEnough.selector, 1, 2 ether, 1 ether)
        );
        facet.distribute(new address[](0), abi.encode(uint256(1)), address(0));
    }

    function test_distribute_reverts_over_max_ratio() public {
        allo.setPoolToken(1, facet.nativeToken());
        vm.deal(address(facet), 10 ether);
        facet.setProposalType(ProposalType.Funding);
        facet.setCvParams(CVParams({maxRatio: 1, weight: 0, decay: 0, minThresholdPoints: 0}));
        facet.setProposal(1, ProposalStatus.Active, 5 ether, facet.nativeToken(), beneficiary, member, 0, 0, 0);

        uint256 maxAllowed = (1 * 10 ether) / ConvictionsUtils.D;
        vm.prank(address(allo));
        vm.expectRevert(
            abi.encodeWithSelector(CVAllocationFacet.AmountOverMaxRatio.selector, 5 ether, maxAllowed, 10 ether)
        );
        facet.distribute(new address[](0), abi.encode(uint256(1)), address(0));
    }

    function test_distribute_reverts_conviction_under_threshold() public {
        allo.setPoolToken(1, facet.nativeToken());
        vm.deal(address(facet), 10 ether);
        facet.setProposalType(ProposalType.Funding);
        facet.setCvParams(CVParams({maxRatio: 10_000_000, weight: 1, decay: 1, minThresholdPoints: 1}));
        facet.setTotalPointsActivated(1);
        facet.setProposal(1, ProposalStatus.Active, 1 ether, facet.nativeToken(), beneficiary, member, block.number, 0, 0);

        uint256 threshold = ConvictionsUtils.calculateThreshold(
            1 ether, 10 ether, 1, 1, 1, 10_000_000, 1
        );
        vm.prank(address(allo));
        vm.expectRevert(
            abi.encodeWithSelector(CVAllocationFacet.ConvictionUnderMinimumThreshold.selector, 0, threshold, 1 ether)
        );
        facet.distribute(new address[](0), abi.encode(uint256(1)), address(0));
    }

    function test_distribute_success_executes() public {
        allo.setPoolToken(1, facet.nativeToken());
        vm.deal(address(facet), 1 ether);
        facet.setProposalType(ProposalType.Funding);
        facet.setCvParams(CVParams({maxRatio: 10_000_000, weight: 0, decay: 0, minThresholdPoints: 0}));
        facet.setArbitrableConfig(1, ArbitrableConfig({
            arbitrator: IArbitrator(address(0)),
            tribunalSafe: address(0),
            submitterCollateralAmount: 1,
            challengerCollateralAmount: 1,
            defaultRuling: 0,
            defaultRulingTimeout: 0
        }));
        facet.setProposal(1, ProposalStatus.Active, 0, facet.nativeToken(), beneficiary, member, 0, 0, 1);

        vm.prank(address(allo));
        facet.distribute(new address[](0), abi.encode(uint256(1)), address(0));

        assertEq(uint8(facet.getProposalStatus(1)), uint8(ProposalStatus.Executed));
    }

    function test_transferAmount_erc20_success() public {
        TERC20 erc = new TERC20("Token", "TOK", 18);
        erc.mint(address(facet), 10);

        facet.exposedTransferAmount(address(erc), beneficiary, 5);
        assertEq(erc.balanceOf(beneficiary), 5);
    }

    function test_getPoolAmount_downscales_superfluid_balance() public {
        TERC20 token6 = new TERC20("USDC", "USDC", 6);
        token6.mint(address(facet), 1_000_000);
        MockSuperToken superToken = new MockSuperToken(token6);
        superToken.setBalance(1 ether);

        facet.setSuperfluidToken(address(superToken));
        allo.setPoolToken(1, address(token6));

        uint256 poolAmount = facet.exposedGetPoolAmount();
        assertEq(poolAmount, 2_000_000);
    }

    function test_getPoolAmount_upscales_superfluid_balance() public {
        TERC20 token20 = new TERC20("BIG", "BIG", 20);
        MockSuperToken superToken = new MockSuperToken(token20);
        superToken.setBalance(1 ether);

        facet.setSuperfluidToken(address(superToken));
        allo.setPoolToken(1, address(token20));

        uint256 poolAmount = facet.exposedGetPoolAmount();
        assertEq(poolAmount, 100 * 1 ether);
    }

    function test_distribute_unwraps_superfluid_token() public {
        TERC20 underlying = new TERC20("Token", "TOK", 18);
        MockSuperToken superToken = new MockSuperToken(underlying);
        superToken.setBalance(5 ether);

        facet.setSuperfluidToken(address(superToken));
        allo.setPoolToken(1, address(underlying));
        facet.setProposalType(ProposalType.Signaling);
        facet.setProposal(1, ProposalStatus.Active, 1 ether, address(underlying), beneficiary, member, 0, 0, 0);

        vm.prank(address(allo));
        facet.distribute(new address[](0), abi.encode(uint256(1)), address(0));
    }
}
