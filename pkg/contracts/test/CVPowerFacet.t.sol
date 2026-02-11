// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVPowerFacet} from "../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVStrategyBaseFacet} from "../src/CVStrategy/CVStrategyBaseFacet.sol";
import {Proposal, ProposalStatus, PointSystem, PointSystemConfig} from "../src/CVStrategy/ICVStrategy.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";
import {IVotingPowerRegistry} from "../src/interfaces/IVotingPowerRegistry.sol";
import {TERC20} from "./shared/TERC20.sol";
import {MockSybilScorer} from "./helpers/CVStrategyHelpers.sol";

contract MockRegistryCommunityPower {
    mapping(address => uint256) public power;
    mapping(address => uint256) public staked;
    mapping(address => bool) public activated;
    TERC20 public token;
    address public lastActivated;
    address public lastDeactivated;

    constructor(TERC20 token_) {
        token = token_;
    }

    function setMemberPower(address member, uint256 amount) external {
        power[member] = amount;
    }

    function setMemberStaked(address member, uint256 amount) external {
        staked[member] = amount;
    }

    function setActivated(address member, bool value) external {
        activated[member] = value;
    }

    function getMemberPowerInStrategy(address member, address) external view returns (uint256) {
        return power[member];
    }

    function getMemberStakedAmount(address member) external view returns (uint256) {
        return staked[member];
    }

    function gardenToken() external view returns (address) {
        return address(token);
    }

    function memberActivatedInStrategies(address member, address) external view returns (bool) {
        return activated[member];
    }

    function activateMemberInStrategy(address member, address) external {
        activated[member] = true;
        lastActivated = member;
    }

    function deactivateMemberInStrategy(address member, address) external {
        activated[member] = false;
        lastDeactivated = member;
    }

    function ercAddress() external view returns (address) {
        return address(token);
    }

    function isMember(address member) external view returns (bool) {
        return power[member] > 0;
    }
}

contract MockExternalVotingPowerRegistry {
    mapping(address => uint256) public power;

    function setMemberPower(address member, uint256 amount) external {
        power[member] = amount;
    }

    function getMemberPowerInStrategy(address member, address) external view returns (uint256) {
        return power[member];
    }

    function getMemberStakedAmount(address) external pure returns (uint256) {
        return 0;
    }

    function ercAddress() external pure returns (address) {
        return address(0);
    }

    function isMember(address member) external view returns (bool) {
        return power[member] > 0;
    }
}

contract CVPowerFacetHarness is CVPowerFacet {
    function setRegistryCommunity(address community) external {
        registryCommunity = RegistryCommunity(community);
    }

    function setVotingPowerRegistry(address registry) external {
        votingPowerRegistry = IVotingPowerRegistry(registry);
    }

    function setSybilScorer(address scorer) external {
        sybilScorer = ISybilScorer(scorer);
    }

    function setPointSystem(PointSystem system) external {
        pointSystem = system;
    }

    function setPointConfig(uint256 maxAmount) external {
        pointConfig = PointSystemConfig(maxAmount);
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
    }

    function setProposalSubmitter(uint256 proposalId, address submitter) external {
        proposals[proposalId].submitter = submitter;
    }
}

contract CVPowerFacetTest is Test {
    CVPowerFacetHarness internal facet;
    MockRegistryCommunityPower internal registry;
    MockExternalVotingPowerRegistry internal externalRegistry;
    MockSybilScorer internal sybil;
    TERC20 internal token;
    address internal member = makeAddr("member");

    function setUp() public {
        token = new TERC20("Token", "TOK", 18);
        registry = new MockRegistryCommunityPower(token);
        externalRegistry = new MockExternalVotingPowerRegistry();
        sybil = new MockSybilScorer();

        facet = new CVPowerFacetHarness();
        facet.setRegistryCommunity(address(registry));
        facet.setVotingPowerRegistry(address(registry));
        facet.setSybilScorer(address(sybil));
        facet.setPointSystem(PointSystem.Unlimited);
    }

    function test_activatePoints_reverts_when_sybil_blocks() public {
        sybil.setCanExecute(member, false);
        vm.prank(member);
        vm.expectRevert(abi.encodeWithSelector(CVPowerFacet.UserCannotExecuteAction.selector, member));
        facet.activatePoints();
    }

    function test_activatePoints_increases_total_points() public {
        sybil.setCanExecute(member, true);
        registry.setMemberPower(member, 7);

        vm.prank(member);
        facet.activatePoints();

        assertEq(facet.totalPointsActivated(), 7);
        assertEq(registry.lastActivated(), member);
    }

    function test_increasePower_only_registry_community() public {
        sybil.setCanExecute(member, true);
        registry.setActivated(member, true);

        vm.expectRevert(
            abi.encodeWithSelector(
                CVStrategyBaseFacet.OnlyRegistryCommunity.selector,
                address(this),
                address(registry)
            )
        );
        facet.increasePower(member, 5);

        vm.prank(address(registry));
        uint256 points = facet.increasePower(member, 5);
        assertEq(points, 5);
        assertEq(facet.totalPointsActivated(), 5);
    }

    function test_increasePower_reverts_when_sybil_blocks() public {
        sybil.setCanExecute(member, false);
        registry.setActivated(member, true);

        vm.prank(address(registry));
        vm.expectRevert(abi.encodeWithSelector(CVPowerFacet.UserCannotExecuteAction.selector, member));
        facet.increasePower(member, 5);
    }

    function test_decreasePower_balances_votes_when_unused_low() public {
        registry.setMemberPower(member, 10);
        registry.setMemberStaked(member, 10);
        facet.setVoterStake(member, 10);
        facet.setTotalPointsActivated(10);
        facet.setTotalStaked(10);
        facet.pushVoterProposal(member, 1);
        facet.setProposal(1, member, 10, 10);

        vm.prank(address(registry));
        uint256 points = facet.decreasePower(member, 2);

        assertEq(points, 2);
        assertLt(facet.totalStaked(), 10);
        assertLt(facet.totalVoterStakePct(member), 10);
    }

    function test_decreasePower_skips_rebalance_when_unused_sufficient() public {
        registry.setMemberPower(member, 20);
        registry.setMemberStaked(member, 20);
        facet.setVoterStake(member, 5);
        facet.setTotalPointsActivated(20);
        facet.setTotalStaked(5);
        facet.pushVoterProposal(member, 1);
        facet.setProposal(1, member, 5, 5);

        vm.prank(address(registry));
        uint256 points = facet.decreasePower(member, 2);

        assertEq(points, 2);
        assertEq(facet.totalStaked(), 5);
    }

    function test_deactivatePoints_updates_totals() public {
        registry.setMemberPower(member, 4);
        facet.setTotalPointsActivated(4);

        vm.prank(member);
        facet.deactivatePoints();

        assertEq(facet.totalPointsActivated(), 0);
        assertEq(registry.lastDeactivated(), member);
    }

    function test_deactivatePoints_registry_only() public {
        registry.setMemberPower(member, 3);
        facet.setTotalPointsActivated(3);

        vm.prank(address(registry));
        facet.deactivatePoints(member);

        assertEq(facet.totalPointsActivated(), 0);
        assertEq(registry.lastDeactivated(), member);
    }

    function test_deactivatePoints_withdraws_support() public {
        registry.setMemberPower(member, 5);
        facet.setTotalPointsActivated(5);
        facet.setTotalStaked(5);
        facet.setVoterStake(member, 5);
        facet.pushVoterProposal(member, 1);
        facet.setProposal(1, member, 5, 5);
        facet.setProposalSubmitter(1, address(0xBEEF));

        vm.prank(address(registry));
        facet.deactivatePoints(member);

        assertEq(facet.totalStaked(), 0);
        assertEq(facet.totalVoterStakePct(member), 0);
    }

    function test_increasePower_custom_usesDeltaNotAbsolute() public {
        sybil.setCanExecute(member, true);
        facet.setPointSystem(PointSystem.Custom);
        facet.setVotingPowerRegistry(address(externalRegistry));
        registry.setActivated(member, true);
        registry.setMemberPower(member, 0);
        externalRegistry.setMemberPower(member, 10);

        vm.prank(address(registry));
        uint256 firstIncrease = facet.increasePower(member, 0);
        assertEq(firstIncrease, 10);
        assertEq(facet.totalPointsActivated(), 10);

        // Mirror registry-community bookkeeping after first increase.
        registry.setMemberPower(member, 10);

        vm.prank(address(registry));
        uint256 secondIncrease = facet.increasePower(member, 0);
        assertEq(secondIncrease, 0);
        assertEq(facet.totalPointsActivated(), 10);
    }
}
