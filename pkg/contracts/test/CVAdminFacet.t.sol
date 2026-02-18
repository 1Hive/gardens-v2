// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {Proposal, ArbitrableConfig, CVParams, ProposalStatus, PointSystemConfig} from "../src/CVStrategy/ICVStrategy.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IVotingPowerRegistry} from "../src/interfaces/IVotingPowerRegistry.sol";
import {LibDiamond} from "../src/diamonds/libraries/LibDiamond.sol";
import {MockArbitrator} from "./helpers/CVStrategyHelpers.sol";

contract MockRegistryCommunityAdmin {
    mapping(bytes32 => mapping(address => bool)) public roles;
    mapping(address => uint256) public power;
    address public councilSafe;
    address public registryFactory;

    function setCouncilSafe(address safe) external {
        councilSafe = safe;
    }

    function setRegistryFactory(address _registryFactory) external {
        registryFactory = _registryFactory;
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return roles[role][account];
    }

    function grantRole(bytes32 role, address account) external {
        roles[role][account] = true;
    }

    function revokeRole(bytes32 role, address account) external {
        roles[role][account] = false;
    }

    function setMemberPower(address member, uint256 amount) external {
        power[member] = amount;
    }

    function getMemberPowerInStrategy(address member, address) external view returns (uint256) {
        return power[member];
    }

    function deactivateMemberInStrategy(address, address) external {}

    // IVotingPowerRegistry compatibility stubs
    function isMember(address member) external view returns (bool) {
        return power[member] > 0;
    }

    function getMemberStakedAmount(address) external pure returns (uint256) {
        return 0;
    }

    function ercAddress() external pure returns (address) {
        return address(0);
    }
}

contract MockSybilScorerAdmin is ISybilScorer {
    address public lastStrategy;
    uint256 public lastThreshold;
    address public lastCouncilSafe;
    uint256 public lastModifiedThreshold;

    function canExecuteAction(address, address) external pure returns (bool) {
        return true;
    }

    function modifyThreshold(address, uint256 threshold) external {
        lastModifiedThreshold = threshold;
    }

    function addStrategy(address strategy, uint256 threshold, address councilSafe) external {
        lastStrategy = strategy;
        lastThreshold = threshold;
        lastCouncilSafe = councilSafe;
    }

    function activateStrategy(address) external {}
}

contract MockSuperfluidHost {
    address public agreement;

    function setAgreement(address agreement_) external {
        agreement = agreement_;
    }

    function getAgreementClass(bytes32) external view returns (address) {
        return agreement;
    }

    function callAgreement(address, bytes calldata, bytes calldata) external pure returns (bytes memory) {
        return "";
    }
}

contract MockSuperToken {
    address public host;

    constructor(address host_) {
        host = host_;
    }

    function getHost() external view returns (address) {
        return host;
    }
}

contract MockAlloPool {
    mapping(uint256 => address) public poolTokens;

    function setPoolToken(uint256 poolId, address token) external {
        poolTokens[poolId] = token;
    }

    function getPool(uint256 poolId) external view returns (IAllo.Pool memory pool) {
        pool.token = poolTokens[poolId];
    }
}

contract MockVotingRegistryAdmin is IVotingPowerRegistry {
    function isMember(address) external pure returns (bool) {
        return true;
    }

    function getMemberPowerInStrategy(address, address) external pure returns (uint256) {
        return 1;
    }

    function getMemberStakedAmount(address) external pure returns (uint256) {
        return 0;
    }

    function ercAddress() external pure returns (address) {
        return address(0);
    }
}

contract MockFactoryAllowlist {
    mapping(address => bool) internal allowed;

    function setAllowed(address target, bool isAllowed) external {
        allowed[target] = isAllowed;
    }

    function isContractRegistered(address target) external view returns (bool) {
        return allowed[target];
    }
}

contract CVAdminFacetHarness is CVAdminFacet {
    function setRegistryCommunity(address community) external {
        registryCommunity = RegistryCommunity(community);
    }

    function forceVotingPowerRegistry(address registry) external {
        votingPowerRegistry = IVotingPowerRegistry(registry);
    }

    function setSybilScorer(address scorer) external {
        sybilScorer = ISybilScorer(scorer);
    }

    function setPoolId(uint256 id) external {
        poolId = id;
    }

    function setAllo(address allo_) external {
        allo = IAllo(allo_);
    }

    function setOwner(address owner_) external {
        LibDiamond.setContractOwner(owner_);
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
        p.submitter = address(0xBEEF);
    }

    function setCvParams(CVParams memory params) external {
        cvParams = params;
    }

    function setPointConfig(uint256 maxAmount) external {
        pointConfig = PointSystemConfig(maxAmount);
    }
}

contract CVAdminFacetTest is Test {
    CVAdminFacetHarness internal facet;
    MockRegistryCommunityAdmin internal registry;
    MockSybilScorerAdmin internal sybil;
    MockAlloPool internal allo;
    MockArbitrator internal arbitrator;
    MockVotingRegistryAdmin internal customRegistry;
    MockFactoryAllowlist internal factoryAllowlist;

    address internal councilSafe = makeAddr("councilSafe");
    address internal member = makeAddr("member");

    function setUp() public {
        facet = new CVAdminFacetHarness();
        registry = new MockRegistryCommunityAdmin();
        sybil = new MockSybilScorerAdmin();
        allo = new MockAlloPool();
        arbitrator = new MockArbitrator();
        customRegistry = new MockVotingRegistryAdmin();
        factoryAllowlist = new MockFactoryAllowlist();

        facet.setRegistryCommunity(address(registry));
        facet.forceVotingPowerRegistry(address(registry));
        facet.setSybilScorer(address(sybil));
        facet.setOwner(councilSafe);
        facet.setPoolId(1);
        facet.setAllo(address(allo));

        registry.setCouncilSafe(councilSafe);
        registry.setRegistryFactory(address(factoryAllowlist));
    }

    function test_setPoolParams_updates_allowlist_and_configs() public {
        address[] memory add = new address[](1);
        add[0] = member;
        address[] memory remove = new address[](1);
        remove[0] = address(0xBEEF);

        bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));
        registry.grantRole(allowlistRole, address(0));
        registry.grantRole(allowlistRole, remove[0]);

        registry.setMemberPower(remove[0], 2);
        facet.setTotalPointsActivated(5);
        facet.setTotalStaked(10);
        facet.setVoterStake(remove[0], 10);
        facet.pushVoterProposal(remove[0], 1);
        facet.setProposal(1, remove[0], 10, 10);

        ArbitrableConfig memory arb = ArbitrableConfig({
            arbitrator: IArbitrator(address(arbitrator)),
            tribunalSafe: address(0xBEEF),
            submitterCollateralAmount: 1,
            challengerCollateralAmount: 1,
            defaultRuling: 1,
            defaultRulingTimeout: 10
        });
        CVParams memory params = CVParams({maxRatio: 1, weight: 2, decay: 3, minThresholdPoints: 4});

        vm.prank(councilSafe);
        facet.setPoolParams(arb, params, 5, add, remove, address(0));

        assertTrue(registry.hasRole(allowlistRole, add[0]));
        assertFalse(registry.hasRole(allowlistRole, address(0)));
        assertEq(facet.currentArbitrableConfigVersion(), 1);
        (uint256 maxRatio, , , ) = facet.cvParams();
        assertEq(maxRatio, 1);
        assertEq(sybil.lastModifiedThreshold(), 5);
    }

    function test_connect_and_disconnect_superfluid_gda() public {
        MockSuperfluidHost host = new MockSuperfluidHost();
        MockSuperToken token = new MockSuperToken(address(host));
        host.setAgreement(address(0xD00D));

        ArbitrableConfig memory arb = ArbitrableConfig({
            arbitrator: IArbitrator(address(arbitrator)),
            tribunalSafe: address(0xBEEF),
            submitterCollateralAmount: 1,
            challengerCollateralAmount: 1,
            defaultRuling: 1,
            defaultRulingTimeout: 10
        });
        CVParams memory params = CVParams({maxRatio: 0, weight: 0, decay: 0, minThresholdPoints: 0});

        vm.prank(councilSafe);
        facet.setPoolParams(arb, params, 0, new address[](0), new address[](0), address(token));

        vm.prank(councilSafe);
        facet.connectSuperfluidGDA(address(0xB0B));

        vm.prank(councilSafe);
        facet.disconnectSuperfluidGDA(address(0xB0B));
    }

    function test_setVotingPowerRegistry_revertsIfNotAllowed() public {
        vm.prank(councilSafe);
        vm.expectRevert(abi.encodeWithSelector(CVAdminFacet.VotingPowerRegistryNotAllowed.selector, address(customRegistry)));
        facet.setVotingPowerRegistry(address(customRegistry));
    }

    function test_setVotingPowerRegistry_allowsAllowlistedRegistry() public {
        factoryAllowlist.setAllowed(address(customRegistry), true);
        vm.startPrank(councilSafe);
        facet.setVotingPowerRegistry(address(customRegistry));
        vm.stopPrank();

        assertEq(address(facet.votingPowerRegistry()), address(customRegistry));
    }

    function test_setVotingPowerRegistry_allowsRegistryCommunityAddress() public {
        vm.prank(councilSafe);
        facet.setVotingPowerRegistry(address(registry));

        assertEq(address(facet.votingPowerRegistry()), address(registry));
    }

    function test_setVotingPowerRegistry_zeroResetsToRegistryCommunity() public {
        factoryAllowlist.setAllowed(address(customRegistry), true);
        vm.startPrank(councilSafe);
        facet.setVotingPowerRegistry(address(customRegistry));
        facet.setVotingPowerRegistry(address(0));
        vm.stopPrank();

        assertEq(address(facet.votingPowerRegistry()), address(registry));
    }
}
