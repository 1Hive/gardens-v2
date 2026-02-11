// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVSyncPowerFacet} from "../src/CVStrategy/facets/CVSyncPowerFacet.sol";
import {CVSyncPowerStorage} from "../src/CVStrategy/CVSyncPowerStorage.sol";
import {CVStrategyBaseFacet} from "../src/CVStrategy/CVStrategyBaseFacet.sol";
import {Proposal, ProposalStatus, PointSystem, PointSystemConfig} from "../src/CVStrategy/ICVStrategy.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {IVotingPowerRegistry} from "../src/interfaces/IVotingPowerRegistry.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";
import {TERC20} from "./shared/TERC20.sol";

// ═══════════════════════════════════════════════════════════════════════════
// Mock: Configurable dual registry/community for testing
// ═══════════════════════════════════════════════════════════════════════════

contract MockCommunityForSync {
    mapping(address => uint256) public cachedPower;
    mapping(address => bool) public activated;
    TERC20 public token;
    address public councilSafeAddr;

    constructor(TERC20 token_, address councilSafe_) {
        token = token_;
        councilSafeAddr = councilSafe_;
    }

    function setCachedPower(address member, uint256 amount) external {
        cachedPower[member] = amount;
    }

    function setActivated(address member, bool value) external {
        activated[member] = value;
    }

    function getMemberPowerInStrategy(address member, address) external view returns (uint256) {
        return cachedPower[member];
    }

    function memberActivatedInStrategies(address member, address) external view returns (bool) {
        return activated[member];
    }

    function councilSafe() external view returns (address) {
        return councilSafeAddr;
    }

    // Stubs for RegistryCommunity interface compatibility
    function hasRole(bytes32, address) external pure returns (bool) { return true; }
    function grantRole(bytes32, address) external {}
    function revokeRole(bytes32, address) external {}
    function activateMemberInStrategy(address, address) external {}
    function deactivateMemberInStrategy(address, address) external {}
    function gardenToken() external view returns (address) { return address(token); }
    function getMemberStakedAmount(address) external pure returns (uint256) { return 0; }
}

/// @notice Mock voting power registry that returns configurable live power
contract MockVotingPowerRegistryForSync {
    mapping(address => uint256) public livePower;

    function setLivePower(address member, uint256 amount) external {
        livePower[member] = amount;
    }

    function getMemberPowerInStrategy(address member, address) external view returns (uint256) {
        return livePower[member];
    }

    function getMemberStakedAmount(address) external pure returns (uint256) { return 0; }
    function ercAddress() external pure returns (address) { return address(0); }
    function isMember(address member) external view returns (bool) { return livePower[member] > 0; }
}

// ═══════════════════════════════════════════════════════════════════════════
// Harness: Exposes internals for testing
// ═══════════════════════════════════════════════════════════════════════════

contract CVSyncPowerFacetHarness is CVSyncPowerFacet {
    function setRegistryCommunity(address community) external {
        registryCommunity = RegistryCommunity(community);
    }

    function setVotingPowerRegistry(address registry) external {
        votingPowerRegistry = IVotingPowerRegistry(registry);
    }

    function setTotalPointsActivated(uint256 amount) external {
        totalPointsActivated = amount;
    }

    function setTotalStaked(uint256 amount) external {
        totalStaked = amount;
    }

    function setVoterStake(address member, uint256 amount) external {
        totalVoterStakePct[member] = amount;
    }

    function pushVoterProposal(address member, uint256 proposalId) external {
        voterStakedProposals[member].push(proposalId);
    }

    function setProposal(uint256 proposalId, address member, uint256 stakedAmount, uint256 voterStaked) external {
        Proposal storage p = proposals[proposalId];
        p.proposalId = proposalId;
        p.proposalStatus = ProposalStatus.Active;
        p.stakedAmount = stakedAmount;
        p.voterStakedPoints[member] = voterStaked;
        p.submitter = member;
    }

    function getProposalStakedAmount(uint256 proposalId) external view returns (uint256) {
        return proposals[proposalId].stakedAmount;
    }

    function getVoterStakedPoints(uint256 proposalId, address member) external view returns (uint256) {
        return proposals[proposalId].voterStakedPoints[member];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

contract CVSyncPowerFacetTest is Test {
    CVSyncPowerFacetHarness internal facet;
    MockCommunityForSync internal community;
    MockVotingPowerRegistryForSync internal registry;
    TERC20 internal token;

    address internal councilSafe = makeAddr("councilSafe");
    address internal syncCaller = makeAddr("syncCaller");
    address internal member = makeAddr("member");
    address internal unauthorized = makeAddr("unauthorized");

    function setUp() public {
        token = new TERC20("Token", "TOK", 18);
        community = new MockCommunityForSync(token, councilSafe);
        registry = new MockVotingPowerRegistryForSync();

        facet = new CVSyncPowerFacetHarness();
        facet.setRegistryCommunity(address(community));
        facet.setVotingPowerRegistry(address(registry));
    }

    // ─── Authorization Tests ────────────────────────────────────────────

    function test_syncPower_revertsIfNotAuthorized() public {
        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(CVSyncPowerFacet.NotAuthorizedSyncCaller.selector, unauthorized));
        facet.syncPower(member);
    }

    function test_setAuthorizedSyncCaller_onlyCouncilSafe() public {
        // councilSafe can authorize
        vm.prank(councilSafe);
        facet.setAuthorizedSyncCaller(syncCaller, true);
        assertTrue(facet.isAuthorizedSyncCaller(syncCaller));
    }

    function test_setAuthorizedSyncCaller_emitsEvent() public {
        vm.prank(councilSafe);
        vm.expectEmit(true, false, false, true);
        emit CVSyncPowerFacet.AuthorizedSyncCallerUpdated(syncCaller, true);
        facet.setAuthorizedSyncCaller(syncCaller, true);
    }

    function test_setAuthorizedSyncCaller_canDeauthorize() public {
        vm.startPrank(councilSafe);
        facet.setAuthorizedSyncCaller(syncCaller, true);
        assertTrue(facet.isAuthorizedSyncCaller(syncCaller));

        facet.setAuthorizedSyncCaller(syncCaller, false);
        assertFalse(facet.isAuthorizedSyncCaller(syncCaller));
        vm.stopPrank();
    }

    // ─── Sync Power: No Change ──────────────────────────────────────────

    function test_syncPower_noOpWhenPowerUnchanged() public {
        _authorizeSyncCaller();
        community.setCachedPower(member, 100);
        registry.setLivePower(member, 100);
        facet.setTotalPointsActivated(100);

        vm.prank(syncCaller);
        facet.syncPower(member);

        // totalPointsActivated should be unchanged
        assertEq(facet.totalPointsActivated(), 100);
    }

    // ─── Sync Power: Increase ───────────────────────────────────────────

    function test_syncPower_increasesActivatedPoints() public {
        _authorizeSyncCaller();
        community.setCachedPower(member, 100);
        community.setActivated(member, true);
        registry.setLivePower(member, 150);
        facet.setTotalPointsActivated(100);

        vm.prank(syncCaller);
        vm.expectEmit(true, false, false, true);
        emit CVSyncPowerFacet.PowerSynced(member, 100, 150);
        facet.syncPower(member);

        assertEq(facet.totalPointsActivated(), 150); // 100 + 50 increase
    }

    function test_syncPower_increaseIgnoredIfNotActivated() public {
        _authorizeSyncCaller();
        community.setCachedPower(member, 100);
        community.setActivated(member, false); // Not activated
        registry.setLivePower(member, 150);
        facet.setTotalPointsActivated(100);

        vm.prank(syncCaller);
        facet.syncPower(member);

        // totalPointsActivated should NOT change since member isn't activated
        assertEq(facet.totalPointsActivated(), 100);
    }

    // ─── Sync Power: Decrease ───────────────────────────────────────────

    function test_syncPower_decreasesActivatedPoints() public {
        _authorizeSyncCaller();
        community.setCachedPower(member, 100);
        registry.setLivePower(member, 60);
        facet.setTotalPointsActivated(100);
        // Member has no proposals staked, so unused power > decrease
        facet.setVoterStake(member, 0);

        vm.prank(syncCaller);
        vm.expectEmit(true, false, false, true);
        emit CVSyncPowerFacet.MemberPowerRevoked(member, 40);
        facet.syncPower(member);

        assertEq(facet.totalPointsActivated(), 60); // 100 - 40 decrease
    }

    function test_syncPower_decreaseRebalancesProposals() public {
        _authorizeSyncCaller();
        community.setCachedPower(member, 100);
        registry.setLivePower(member, 0); // Full revocation
        facet.setTotalPointsActivated(100);
        facet.setTotalStaked(80);
        facet.setVoterStake(member, 80);

        // Member has 80 points staked on proposal 1
        facet.setProposal(1, member, 80, 80);
        facet.pushVoterProposal(member, 1);

        vm.prank(syncCaller);
        facet.syncPower(member);

        // All power revoked
        assertEq(facet.totalPointsActivated(), 0);
        // Proposals should be rebalanced (staked reduced)
        assertEq(facet.getProposalStakedAmount(1), 0);
        assertEq(facet.getVoterStakedPoints(1, member), 0);
    }

    // ─── Batch Sync ─────────────────────────────────────────────────────

    function test_batchSyncPower_syncsMultipleMembers() public {
        _authorizeSyncCaller();
        address member2 = makeAddr("member2");

        community.setCachedPower(member, 100);
        community.setCachedPower(member2, 50);
        community.setActivated(member, true);
        community.setActivated(member2, true);
        registry.setLivePower(member, 120);
        registry.setLivePower(member2, 70);
        facet.setTotalPointsActivated(150); // 100 + 50

        address[] memory members = new address[](2);
        members[0] = member;
        members[1] = member2;

        vm.prank(syncCaller);
        facet.batchSyncPower(members);

        // 150 + 20 (member increase) + 20 (member2 increase) = 190
        assertEq(facet.totalPointsActivated(), 190);
    }

    function test_batchSyncPower_revertsIfNotAuthorized() public {
        address[] memory members = new address[](1);
        members[0] = member;

        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSelector(CVSyncPowerFacet.NotAuthorizedSyncCaller.selector, unauthorized));
        facet.batchSyncPower(members);
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    function _authorizeSyncCaller() internal {
        vm.prank(councilSafe);
        facet.setAuthorizedSyncCaller(syncCaller, true);
    }
}
