// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVStreamingStorage} from "../src/CVStrategy/CVStreamingStorage.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {Proposal, ProposalStatus, ProposalType, ArbitrableConfig} from "../src/CVStrategy/ICVStrategy.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {ICollateralVault} from "../src/interfaces/ICollateralVault.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {IVotingPowerRegistry} from "../src/interfaces/IVotingPowerRegistry.sol";
import {ISuperfluidPool} from
    "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";

import {MockRegistryCommunity, MockArbitrator, MockCollateralVault} from "./helpers/CVStrategyHelpers.sol";

contract MockStreamingEscrow {
    bool public disputed;
    bool public resolved;
    uint256 public drainToBeneficiaryCount;
    uint256 public drainToStrategyCount;

    function setDisputed(bool value) external {
        disputed = value;
    }

    function drainToStrategy() external {
        resolved = true;
        drainToStrategyCount++;
    }

    function drainToBeneficiary() external {
        resolved = true;
        drainToBeneficiaryCount++;
    }
}

contract ToggleableReceiver {
    bool public accepts;

    function setAccepts(bool value) external {
        accepts = value;
    }

    receive() external payable {
        require(accepts, "rejects ETH");
    }
}

contract MockDisputeGDA {
    address public lastMember;
    uint128 public lastUnits;
    bool public updateShouldSucceed = true;

    function setUpdateShouldSucceed(bool shouldSucceed) external {
        updateShouldSucceed = shouldSucceed;
    }

    function updateMemberUnits(address member, uint128 units) external returns (bool) {
        lastMember = member;
        lastUnits = units;
        return updateShouldSucceed;
    }
}

contract CVDisputeFacetHarness is CVDisputeFacet {
    function setRegistryCommunity(address community) external {
        registryCommunity = RegistryCommunity(community);
    }

    function setVotingPowerRegistry(address registry) external {
        votingPowerRegistry = IVotingPowerRegistry(registry);
    }

    function setCollateralVault(address vault) external {
        collateralVault = ICollateralVault(vault);
    }

    function setProposalType(ProposalType proposalType_) external {
        proposalType = proposalType_;
    }

    function setArbitrableConfig(uint256 version, ArbitrableConfig memory config) external {
        currentArbitrableConfigVersion = version;
        arbitrableConfigs[version] = config;
    }

    function setProposal(
        uint256 proposalId,
        ProposalStatus status,
        uint256 arbitrableVersion,
        uint256 lastDisputeCompletion
    ) external {
        Proposal storage p = proposals[proposalId];
        p.proposalId = proposalId;
        p.proposalStatus = status;
        p.arbitrableConfigVersion = arbitrableVersion;
        p.lastDisputeCompletion = lastDisputeCompletion;
        p.submitter = address(0xBEEF);
    }

    function setDisputeInfo(uint256 proposalId, uint256 disputeId, uint256 disputeTimestamp, address challenger)
        external
    {
        Proposal storage p = proposals[proposalId];
        p.disputeInfo.disputeId = disputeId;
        p.disputeInfo.disputeTimestamp = disputeTimestamp;
        p.disputeInfo.challenger = challenger;
    }

    function proposalStatusOf(uint256 proposalId) external view returns (ProposalStatus) {
        return proposals[proposalId].proposalStatus;
    }

    function setDisputeId(uint256 disputeId, uint256 proposalId) external {
        disputeIdToProposalId[disputeId] = proposalId;
    }

    function setProposalEscrow(uint256 proposalId, address escrow) external {
        CVStreamingStorage.layout().proposalEscrow[proposalId] = escrow;
    }

    function getProposalEscrow(uint256 proposalId) external view returns (address) {
        return CVStreamingStorage.layout().proposalEscrow[proposalId];
    }

    function setDisputeCount(uint64 count) external {
        disputeCount = count;
    }

    function setSuperfluidGDA(address gda) external {
        superfluidGDA = ISuperfluidPool(gda);
    }
}

contract CVDisputeFacetTest is Test {
    CVDisputeFacetHarness internal facet;
    MockRegistryCommunity internal registry;
    MockArbitrator internal arbitrator;
    MockCollateralVault internal vault;
    MockDisputeGDA internal gda;
    address internal member = makeAddr("member");

    function setUp() public {
        facet = new CVDisputeFacetHarness();
        registry = new MockRegistryCommunity();
        arbitrator = new MockArbitrator();
        vault = new MockCollateralVault();
        gda = new MockDisputeGDA();

        registry.setMember(member, true);
        registry.setCouncilSafe(makeAddr("council"));
        vm.deal(member, 10 ether);

        facet.setRegistryCommunity(address(registry));
        facet.setVotingPowerRegistry(address(registry));
        facet.setCollateralVault(address(vault));
        facet.setSuperfluidGDA(address(gda));
    }

    function _config(uint256 challengerCollateral, uint256 defaultRuling, uint256 timeout)
        internal
        view
        returns (ArbitrableConfig memory)
    {
        return ArbitrableConfig({
            arbitrator: IArbitrator(address(arbitrator)),
            tribunalSafe: address(0x1234),
            submitterCollateralAmount: 5,
            challengerCollateralAmount: challengerCollateral,
            defaultRuling: defaultRuling,
            defaultRulingTimeout: timeout
        });
    }

    function test_disputeProposal_reverts_for_invalid_status() public {
        facet.setArbitrableConfig(1, _config(1 ether, 1, 10));
        facet.setProposal(1, ProposalStatus.Cancelled, 1, 0);

        vm.prank(member);
        vm.expectRevert(
            abi.encodeWithSelector(CVDisputeFacet.ProposalStatusInvalid.selector, 1, ProposalStatus.Cancelled)
        );
        facet.disputeProposal{value: 1 ether}(1, "ctx", "");
    }

    function test_disputeProposal_reverts_for_low_collateral() public {
        facet.setArbitrableConfig(1, _config(2 ether, 1, 10));
        facet.setProposal(1, ProposalStatus.Active, 1, 0);

        vm.prank(member);
        vm.expectRevert(abi.encodeWithSelector(CVDisputeFacet.ChallengerCollateralTooLow.selector, 1 ether, 2 ether));
        facet.disputeProposal{value: 1 ether}(1, "ctx", "");
    }

    function test_disputeProposal_reverts_for_cooldown() public {
        facet.setArbitrableConfig(1, _config(1 ether, 1, 10));
        facet.setProposal(1, ProposalStatus.Active, 1, block.timestamp);

        vm.prank(member);
        vm.expectRevert(abi.encodeWithSelector(CVDisputeFacet.DisputeCooldownActive.selector, 1, 2 hours));
        facet.disputeProposal{value: 1 ether}(1, "ctx", "");
    }

    function test_disputeProposal_success_streaming_sets_disputed() public {
        facet.setProposalType(ProposalType.Streaming);
        facet.setArbitrableConfig(1, _config(1 ether, 1, 10));
        facet.setProposal(1, ProposalStatus.Active, 1, 0);

        MockStreamingEscrow escrow = new MockStreamingEscrow();
        facet.setProposalEscrow(1, address(escrow));

        vm.prank(member);
        uint256 disputeId = facet.disputeProposal{value: 2 ether}(1, "ctx", "");

        assertEq(disputeId, 0);
        assertTrue(escrow.disputed());
        assertEq(facet.disputeCount(), 1);
    }

    function test_rule_reverts_when_not_disputed() public {
        facet.setArbitrableConfig(1, _config(1 ether, 1, 10));
        facet.setProposal(1, ProposalStatus.Active, 1, 0);
        facet.setDisputeId(1, 1);

        vm.expectRevert(abi.encodeWithSelector(CVDisputeFacet.ProposalStatusInvalid.selector, 1, ProposalStatus.Active));
        facet.rule(1, 1);
    }

    function test_rule_reverts_only_arbitrator() public {
        facet.setArbitrableConfig(1, _config(1 ether, 1, 1000));
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 2, block.timestamp, member);
        facet.setDisputeId(2, 1);

        vm.expectRevert(
            abi.encodeWithSelector(CVDisputeFacet.OnlyArbitrator.selector, address(this), address(arbitrator))
        );
        facet.rule(2, 1);
    }

    function test_rule_reverts_for_stale_dispute_id() public {
        facet.setArbitrableConfig(1, _config(1 ether, 1, 1000));
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 10, block.timestamp, member);
        facet.setDisputeId(9, 1);

        vm.prank(address(arbitrator));
        vm.expectRevert(abi.encodeWithSelector(CVDisputeFacet.DisputeIdMismatch.selector, 1, 10, 9));
        facet.rule(9, 1);
    }

    function test_rule_default_ruling_not_configured() public {
        facet.setArbitrableConfig(1, _config(1 ether, 0, 0));
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 3, block.timestamp - 1, member);
        facet.setDisputeId(3, 1);

        vm.expectRevert(abi.encodeWithSelector(CVDisputeFacet.DefaultRulingNotConfigured.selector, 1));
        facet.rule(3, 0);
    }

    function test_rule_default_ruling_active() public {
        facet.setProposalType(ProposalType.Streaming);
        facet.setArbitrableConfig(1, _config(1 ether, 1, 0));
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 4, block.timestamp - 1, member);
        facet.setDisputeId(4, 1);
        facet.setDisputeCount(1);

        MockStreamingEscrow escrow = new MockStreamingEscrow();
        facet.setProposalEscrow(1, address(escrow));

        facet.rule(4, 0);
        assertFalse(escrow.disputed());
        assertEq(escrow.drainToBeneficiaryCount(), 0);
        assertEq(escrow.drainToStrategyCount(), 0);
        assertEq(facet.disputeIdToProposalId(4), 0);
    }

    function test_rule_default_ruling_rejected() public {
        facet.setProposalType(ProposalType.Streaming);
        facet.setArbitrableConfig(1, _config(1 ether, 2, 0));
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 5, block.timestamp - 1, member);
        facet.setDisputeId(5, 1);
        facet.setDisputeCount(1);

        MockStreamingEscrow escrow = new MockStreamingEscrow();
        facet.setProposalEscrow(1, address(escrow));

        facet.rule(5, 0);
        assertTrue(escrow.resolved());
        assertEq(gda.lastMember(), address(escrow));
        assertEq(gda.lastUnits(), 0);
        assertEq(facet.getProposalEscrow(1), address(escrow));
    }

    function test_rule_ruling_one_transfers_to_council() public {
        ArbitrableConfig memory config = _config(1 ether, 1, 1000);
        facet.setArbitrableConfig(1, config);
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 6, block.timestamp, member);
        facet.setDisputeId(6, 1);
        facet.setDisputeCount(1);

        vm.prank(address(arbitrator));
        facet.rule(6, 1);
    }

    function test_rule_reverts_for_unhandled_live_ruling() public {
        ArbitrableConfig memory config = _config(1 ether, 1, 1000);
        facet.setArbitrableConfig(1, config);
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 6, block.timestamp, member);
        facet.setDisputeId(6, 1);
        facet.setDisputeCount(1);

        vm.prank(address(arbitrator));
        vm.expectRevert(abi.encodeWithSelector(CVDisputeFacet.InvalidRuling.selector, 3));
        facet.rule(6, 3);

        assertEq(facet.disputeCount(), 1);
    }

    function test_rule_ruling_one_streaming_resumes_without_draining_beneficiary() public {
        ArbitrableConfig memory config = _config(1 ether, 1, 1000);
        facet.setArbitrableConfig(1, config);
        facet.setProposalType(ProposalType.Streaming);
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 6, block.timestamp, member);
        facet.setDisputeId(6, 1);
        facet.setDisputeCount(1);
        MockStreamingEscrow escrow = new MockStreamingEscrow();
        escrow.setDisputed(true);
        facet.setProposalEscrow(1, address(escrow));

        vm.prank(address(arbitrator));
        facet.rule(6, 1);

        assertFalse(escrow.disputed());
        assertEq(escrow.drainToBeneficiaryCount(), 0);
        assertEq(escrow.drainToStrategyCount(), 0);
    }

    function test_rule_ruling_two_transfers_split() public {
        ArbitrableConfig memory config = _config(1 ether, 1, 1000);
        config.submitterCollateralAmount = 10;
        facet.setArbitrableConfig(1, config);
        facet.setProposalType(ProposalType.Streaming);
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 7, block.timestamp, member);
        facet.setDisputeId(7, 1);
        facet.setDisputeCount(1);
        MockStreamingEscrow escrow = new MockStreamingEscrow();
        facet.setProposalEscrow(1, address(escrow));

        vm.prank(address(arbitrator));
        facet.rule(7, 2);

        assertTrue(escrow.resolved());
        assertEq(gda.lastMember(), address(escrow));
        assertEq(gda.lastUnits(), 0);
    }

    function test_rule_non_streaming_skips_stream_resolution() public {
        ArbitrableConfig memory config = _config(1 ether, 1, 1000);
        facet.setArbitrableConfig(1, config);
        facet.setProposalType(ProposalType.Funding);
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 8, block.timestamp, member);
        facet.setDisputeId(8, 1);
        facet.setDisputeCount(1);

        vm.prank(address(arbitrator));
        facet.rule(8, 1);
    }

    function test_rule_streaming_no_escrow_returns() public {
        ArbitrableConfig memory config = _config(1 ether, 1, 1000);
        facet.setArbitrableConfig(1, config);
        facet.setProposalType(ProposalType.Streaming);
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 9, block.timestamp, member);
        facet.setDisputeId(9, 1);
        facet.setDisputeCount(1);

        vm.prank(address(arbitrator));
        facet.rule(9, 1);
    }

    /*|--------------------------------------------|*/
    /*|      FAILED COLLATERAL PAYOUT CLAIMS       |*/
    /*|--------------------------------------------|*/

    function _useRealVault() internal returns (CollateralVault realVault) {
        realVault = new CollateralVault();
        vm.prank(address(facet));
        realVault.initialize();
        facet.setCollateralVault(address(realVault));
    }

    function _deposit(CollateralVault realVault, uint256 proposalId, address user, uint256 amount) internal {
        vm.deal(address(facet), amount);
        vm.prank(address(facet));
        realVault.depositCollateral{value: amount}(proposalId, user);
    }

    function _setupTimedOutRejectedDispute(address challenger, uint256 challengerCollateral) internal {
        facet.setArbitrableConfig(1, _config(challengerCollateral, 2, 0));
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 11, block.timestamp - 1, challenger);
        facet.setDisputeId(11, 1);
        facet.setDisputeCount(1);
    }

    function test_rule_failed_payout_is_recorded_and_claimable() public {
        CollateralVault realVault = _useRealVault();
        ToggleableReceiver challenger = new ToggleableReceiver();
        _deposit(realVault, 1, address(challenger), 1 ether);
        _deposit(realVault, 1, address(0xBEEF), 5);
        _setupTimedOutRejectedDispute(address(challenger), 1 ether);

        // Timed out: anyone can rule. The challenger refund fails, but the ruling still goes through.
        vm.prank(makeAddr("anyone"));
        facet.rule(11, 0);

        assertEq(uint8(facet.proposalStatusOf(1)), uint8(ProposalStatus.Rejected));
        assertEq(facet.pendingCollateralClaim(1, address(challenger), address(challenger)), 1 ether);
        assertEq(realVault.proposalCollateral(1, address(challenger)), 1 ether);
        assertEq(facet.pendingCollateralClaim(1, address(0xBEEF), address(0xBEEF)), 0);

        // Still rejecting: the claim reverts and stays in place for a retry.
        vm.expectRevert(CollateralVault.TransferFailed.selector);
        facet.claimCollateral(1, address(challenger), address(challenger));
        assertEq(facet.pendingCollateralClaim(1, address(challenger), address(challenger)), 1 ether);

        // Anyone can push the payout once the recipient accepts ETH; the payee is fixed.
        challenger.setAccepts(true);
        vm.prank(makeAddr("keeper"));
        facet.claimCollateral(1, address(challenger), address(challenger));

        assertEq(address(challenger).balance, 1 ether);
        assertEq(realVault.proposalCollateral(1, address(challenger)), 0);
        assertEq(facet.pendingCollateralClaim(1, address(challenger), address(challenger)), 0);

        vm.expectRevert(
            abi.encodeWithSelector(
                CVDisputeFacet.NoPendingCollateralClaim.selector, 1, address(challenger), address(challenger)
            )
        );
        facet.claimCollateral(1, address(challenger), address(challenger));
    }

    function test_rule_failed_payout_for_other_recipient_is_claimable() public {
        CollateralVault realVault = _useRealVault();
        ToggleableReceiver council = new ToggleableReceiver();
        registry.setCouncilSafe(address(council));
        _deposit(realVault, 1, member, 1 ether);

        facet.setArbitrableConfig(1, _config(1 ether, 1, 1000));
        facet.setProposal(1, ProposalStatus.Disputed, 1, 0);
        facet.setDisputeInfo(1, 12, block.timestamp, member);
        facet.setDisputeId(12, 1);
        facet.setDisputeCount(1);

        // Ruling 1: the challenger's collateral goes to the council Safe, which rejects it.
        vm.prank(address(arbitrator));
        facet.rule(12, 1);
        assertEq(facet.pendingCollateralClaim(1, member, address(council)), 1 ether);

        council.setAccepts(true);
        facet.claimCollateral(1, member, address(council));
        assertEq(address(council).balance, 1 ether);
        assertEq(realVault.proposalCollateral(1, member), 0);
    }

    function test_rule_successful_payout_records_no_claim() public {
        CollateralVault realVault = _useRealVault();
        _deposit(realVault, 1, member, 1 ether);
        _setupTimedOutRejectedDispute(member, 1 ether);

        uint256 balanceBefore = member.balance;
        facet.rule(11, 0);

        assertEq(member.balance, balanceBefore + 1 ether);
        assertEq(facet.pendingCollateralClaim(1, member, member), 0);
    }

    function test_claimCollateral_reverts_without_claim() public {
        vm.expectRevert(abi.encodeWithSelector(CVDisputeFacet.NoPendingCollateralClaim.selector, 1, member, member));
        facet.claimCollateral(1, member, member);
    }
}
