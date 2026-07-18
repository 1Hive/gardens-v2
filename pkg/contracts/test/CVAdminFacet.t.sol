// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {
    Proposal,
    ArbitrableConfig,
    CVParams,
    ProposalStatus,
    ProposalType,
    PointSystemConfig
} from "../src/CVStrategy/ICVStrategy.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import {
    ISuperfluidPool
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IVotingPowerRegistry} from "../src/interfaces/IVotingPowerRegistry.sol";
import {LibDiamond} from "../src/diamonds/libraries/LibDiamond.sol";
import {MockArbitrator} from "./helpers/CVStrategyHelpers.sol";

contract MockRegistryCommunityAdmin {
    mapping(bytes32 => mapping(address => bool)) public roles;
    mapping(address => uint256) public power;
    mapping(address => bool) public activated;
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

    function setActivated(address member, bool value) external {
        activated[member] = value;
    }

    function getMemberPowerInStrategy(address member, address) external view returns (uint256) {
        return power[member];
    }

    function memberActivatedInStrategies(address member, address) external view returns (bool) {
        return activated[member];
    }

    function deactivateMemberInStrategy(address member, address) external {
        activated[member] = false;
    }

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

    constructor(address agreement_) {
        agreement = agreement_;
    }

    function setAgreement(address agreement_) external {
        agreement = agreement_;
    }

    function getAgreementClass(bytes32) external view returns (address) {
        return agreement;
    }

    function callAgreement(address agreementClass, bytes calldata data, bytes calldata)
        external
        returns (bytes memory)
    {
        if (agreementClass == agreement) {
            bytes4 selector;
            assembly {
                selector := calldataload(data.offset)
            }
            if (selector == bytes4(keccak256("distributeFlow(address,address,address,int96,bytes)"))) {
                (,, address pool, int96 requestedFlowRate,) =
                    abi.decode(data[4:], (address, address, address, int96, bytes));
                MockGDAAgreement(agreement).setFlowRate(pool, requestedFlowRate);
            }
        }
        return "";
    }
}

contract MockGDAAgreement {
    address public lastPool;
    int96 public flowRate;

    function getFlowRate(ISuperToken, address, ISuperfluidPool pool) external view returns (int96) {
        pool;
        return flowRate;
    }

    function setFlowRate(address pool, int96 newFlowRate) external {
        lastPool = pool;
        flowRate = newFlowRate;
    }
}

contract MockSuperToken {
    address public host;
    address public underlyingToken;
    mapping(address => uint256) public balances;
    uint256 public lastDowngradeAmount;
    uint256 public lastUpgradeAmount;
    uint256 public lastUnderlyingUpgradeAmount;
    uint8 public decimals = 18;

    constructor(address host_, address underlyingToken_) {
        host = host_;
        underlyingToken = underlyingToken_;
    }

    function getHost() external view returns (address) {
        return host;
    }

    function getUnderlyingToken() external view returns (address) {
        return underlyingToken;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function setBalance(address account, uint256 amount) external {
        balances[account] = amount;
    }

    function setDecimals(uint8 decimals_) external {
        decimals = decimals_;
    }

    function _toUnderlyingAmount(uint256 superTokenAmount) internal view returns (uint256) {
        uint8 underlyingDecimals = MockERC20(underlyingToken).decimals();
        if (decimals == underlyingDecimals) {
            return superTokenAmount;
        }
        if (decimals > underlyingDecimals) {
            return superTokenAmount / (10 ** (decimals - underlyingDecimals));
        }
        return superTokenAmount * (10 ** (underlyingDecimals - decimals));
    }

    function downgrade(uint256 amount) external {
        balances[msg.sender] -= amount;
        lastDowngradeAmount = amount;
        MockERC20(underlyingToken).mint(msg.sender, _toUnderlyingAmount(amount));
    }

    function upgrade(uint256 amount) external {
        lastUpgradeAmount = amount;
        lastUnderlyingUpgradeAmount = _toUnderlyingAmount(amount);
        MockERC20(underlyingToken).burnFrom(msg.sender, lastUnderlyingUpgradeAmount);
        balances[msg.sender] += amount;
    }

    function connectPool(address) external pure returns (bool) {
        return true;
    }

    function disconnectPool(address) external pure returns (bool) {
        return true;
    }
}

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint8 public decimals = 18;

    function setDecimals(uint8 decimals_) external {
        decimals = decimals_;
    }

    function mint(address account, uint256 amount) external {
        balanceOf[account] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function burnFrom(address from, uint256 amount) external {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "INSUFFICIENT_ALLOWANCE");
        allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
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

    function setTotalPointsActivatedWithCheckpoint(uint256 amount) external {
        _checkpointActivePointsAccumulator();
        totalPointsActivated = amount;
    }

    function getAccumulatorState() external view returns (uint256 accumulator, uint256 lastBlock) {
        return (activePointsAccumulator, activePointsAccumulatorLastBlock);
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

    function setProposalType(ProposalType proposalType_) external {
        proposalType = proposalType_;
    }

    function setSuperfluidToken(address token) external {
        superfluidToken = ISuperToken(token);
    }

    function setSuperfluidGDA(address gda) external {
        superfluidGDA = ISuperfluidPool(gda);
    }

    function setProposalStatus(uint256 proposalId, ProposalStatus status) external {
        Proposal storage p = proposals[proposalId];
        p.proposalId = proposalId;
        p.proposalStatus = status;
        if (proposalCounter < proposalId) {
            proposalCounter = proposalId;
        }
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
    MockERC20 internal underlyingToken;

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
        underlyingToken = new MockERC20();

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
        factoryAllowlist.setAllowed(address(arbitrator), true);
        address[] memory add = new address[](1);
        add[0] = member;
        address[] memory remove = new address[](1);
        remove[0] = address(0xBEEF);

        bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));
        registry.grantRole(allowlistRole, address(0));
        registry.grantRole(allowlistRole, remove[0]);

        registry.setMemberPower(remove[0], 2);
        registry.setActivated(remove[0], true);
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
        (uint256 maxRatio,,,) = facet.cvParams();
        assertEq(maxRatio, 1);
        assertEq(sybil.lastModifiedThreshold(), 5);
    }

    function test_setPoolParams_removeFromAllowlist_saturates_when_member_power_exceeds_total() public {
        factoryAllowlist.setAllowed(address(arbitrator), true);
        address[] memory add = new address[](0);
        address[] memory remove = new address[](1);
        remove[0] = member;

        bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));
        registry.grantRole(allowlistRole, member);
        registry.setMemberPower(member, 10);
        registry.setActivated(member, true);
        facet.setTotalPointsActivatedWithCheckpoint(4);
        vm.roll(block.number + 5);

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

        assertEq(facet.totalPointsActivated(), 0);
        (uint256 accumulator, uint256 lastBlock) = facet.getAccumulatorState();
        assertEq(accumulator, 20);
        assertEq(lastBlock, block.number);
        assertFalse(registry.hasRole(allowlistRole, member));
    }

    function test_setPoolParams_revertsIfArbitratorNotAllowed() public {
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
        vm.expectRevert(abi.encodeWithSelector(CVAdminFacet.ArbitratorNotAllowed.selector, address(arbitrator)));
        facet.setPoolParams(arb, params, 5, new address[](0), new address[](0), address(0));
    }

    function test_connect_and_disconnect_superfluid_gda() public {
        factoryAllowlist.setAllowed(address(arbitrator), true);
        MockGDAAgreement gdaAgreement = new MockGDAAgreement();
        MockSuperfluidHost host = new MockSuperfluidHost(address(gdaAgreement));
        MockSuperToken token = new MockSuperToken(address(host), address(underlyingToken));

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

    function test_setPoolParams_streaming_reverts_when_unclosed_proposal_exists() public {
        factoryAllowlist.setAllowed(address(arbitrator), true);
        MockGDAAgreement gdaAgreement = new MockGDAAgreement();
        MockSuperfluidHost host = new MockSuperfluidHost(address(gdaAgreement));
        MockSuperToken oldToken = new MockSuperToken(address(host), address(underlyingToken));
        MockSuperToken newToken = new MockSuperToken(address(host), address(underlyingToken));

        facet.setProposalType(ProposalType.Streaming);
        facet.setSuperfluidToken(address(oldToken));
        facet.setProposalStatus(1, ProposalStatus.Active);

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
        vm.expectRevert(abi.encodeWithSelector(CVAdminFacet.ProposalActive.selector, 1));
        facet.setPoolParams(arb, params, 0, new address[](0), new address[](0), address(newToken), 0);
    }

    function test_setPoolParams_streaming_migrates_balance_when_switching_super_token() public {
        factoryAllowlist.setAllowed(address(arbitrator), true);
        MockGDAAgreement gdaAgreement = new MockGDAAgreement();
        MockSuperfluidHost host = new MockSuperfluidHost(address(gdaAgreement));
        MockSuperToken oldToken = new MockSuperToken(address(host), address(underlyingToken));
        MockSuperToken newToken = new MockSuperToken(address(host), address(underlyingToken));

        allo.setPoolToken(1, address(underlyingToken));
        facet.setProposalType(ProposalType.Streaming);
        facet.setSuperfluidToken(address(oldToken));
        facet.setProposalStatus(1, ProposalStatus.Rejected);
        oldToken.setBalance(address(facet), 25 ether);

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
        facet.setPoolParams(arb, params, 0, new address[](0), new address[](0), address(newToken), 0);

        assertEq(oldToken.balanceOf(address(facet)), 0);
        assertEq(oldToken.lastDowngradeAmount(), 25 ether);
        assertEq(newToken.balanceOf(address(facet)), 25 ether);
        assertEq(newToken.lastUpgradeAmount(), 25 ether);
        assertEq(underlyingToken.balanceOf(address(facet)), 0);
        assertEq(address(facet.superfluidToken()), address(newToken));
    }

    function test_setPoolParams_streaming_migrates_six_decimal_underlying_to_eighteen_decimal_super_token() public {
        factoryAllowlist.setAllowed(address(arbitrator), true);
        underlyingToken.setDecimals(6);
        MockGDAAgreement gdaAgreement = new MockGDAAgreement();
        MockSuperfluidHost host = new MockSuperfluidHost(address(gdaAgreement));
        MockSuperToken oldToken = new MockSuperToken(address(host), address(underlyingToken));
        MockSuperToken newToken = new MockSuperToken(address(host), address(underlyingToken));

        allo.setPoolToken(1, address(underlyingToken));
        facet.setProposalType(ProposalType.Streaming);
        facet.setSuperfluidToken(address(oldToken));
        facet.setProposalStatus(1, ProposalStatus.Rejected);
        oldToken.setBalance(address(facet), 25 ether);

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
        facet.setPoolParams(arb, params, 0, new address[](0), new address[](0), address(newToken), 0);

        assertEq(oldToken.balanceOf(address(facet)), 0);
        assertEq(oldToken.lastDowngradeAmount(), 25 ether);
        assertEq(newToken.balanceOf(address(facet)), 25 ether);
        assertEq(newToken.lastUpgradeAmount(), 25 ether);
        assertEq(newToken.lastUnderlyingUpgradeAmount(), 25_000_000);
        assertEq(underlyingToken.balanceOf(address(facet)), 0);
        assertEq(address(facet.superfluidToken()), address(newToken));
    }

    function test_setPoolParams_streaming_skips_upgrade_when_scaled_migration_amount_rounds_to_zero() public {
        factoryAllowlist.setAllowed(address(arbitrator), true);
        underlyingToken.setDecimals(20);
        MockGDAAgreement gdaAgreement = new MockGDAAgreement();
        MockSuperfluidHost host = new MockSuperfluidHost(address(gdaAgreement));
        MockSuperToken oldToken = new MockSuperToken(address(host), address(underlyingToken));
        MockSuperToken newToken = new MockSuperToken(address(host), address(underlyingToken));
        oldToken.setDecimals(20);

        allo.setPoolToken(1, address(underlyingToken));
        facet.setProposalType(ProposalType.Streaming);
        facet.setSuperfluidToken(address(oldToken));
        facet.setProposalStatus(1, ProposalStatus.Rejected);
        oldToken.setBalance(address(facet), 1);

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
        facet.setPoolParams(arb, params, 0, new address[](0), new address[](0), address(newToken), 0);

        assertEq(oldToken.balanceOf(address(facet)), 0);
        assertEq(oldToken.lastDowngradeAmount(), 1);
        assertEq(newToken.balanceOf(address(facet)), 0);
        assertEq(newToken.lastUpgradeAmount(), 0);
        assertEq(underlyingToken.balanceOf(address(facet)), 1);
        assertEq(address(facet.superfluidToken()), address(newToken));
    }

    function test_setPoolParams_streaming_samePureTokenAddress_skips_migration() public {
        factoryAllowlist.setAllowed(address(arbitrator), true);
        MockGDAAgreement gdaAgreement = new MockGDAAgreement();
        MockSuperfluidHost host = new MockSuperfluidHost(address(gdaAgreement));
        MockSuperToken pureToken = new MockSuperToken(address(host), address(underlyingToken));

        allo.setPoolToken(1, address(pureToken));
        facet.setProposalType(ProposalType.Streaming);
        facet.setSuperfluidToken(address(pureToken));
        pureToken.setBalance(address(facet), 25 ether);

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
        facet.setPoolParams(arb, params, 0, new address[](0), new address[](0), address(pureToken), 0);

        assertEq(pureToken.balanceOf(address(facet)), 25 ether);
        assertEq(pureToken.lastDowngradeAmount(), 0);
        assertEq(pureToken.lastUpgradeAmount(), 0);
        assertEq(address(facet.superfluidToken()), address(pureToken));
    }

    function test_setPoolParams_streaming_rate_change_does_not_update_gda_flow() public {
        factoryAllowlist.setAllowed(address(arbitrator), true);
        MockGDAAgreement gdaAgreement = new MockGDAAgreement();
        MockSuperfluidHost host = new MockSuperfluidHost(address(gdaAgreement));
        MockSuperToken token = new MockSuperToken(address(host), address(underlyingToken));
        address gda = address(0xB0B);

        facet.setProposalType(ProposalType.Streaming);
        facet.setSuperfluidToken(address(token));
        facet.setSuperfluidGDA(gda);

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
        facet.setPoolParams(arb, params, 0, new address[](0), new address[](0), address(token), 123);

        assertEq(address(facet.superfluidToken()), address(token));
        assertEq(facet.streamingRatePerSecond(), 123);
        assertEq(gdaAgreement.lastPool(), address(0));
        assertEq(int256(gdaAgreement.flowRate()), int256(0));
    }

    function test_setPoolParams_streaming_rate_change_without_gda_is_noop() public {
        factoryAllowlist.setAllowed(address(arbitrator), true);
        MockGDAAgreement gdaAgreement = new MockGDAAgreement();
        MockSuperfluidHost host = new MockSuperfluidHost(address(gdaAgreement));
        MockSuperToken token = new MockSuperToken(address(host), address(underlyingToken));

        facet.setProposalType(ProposalType.Streaming);
        facet.setSuperfluidToken(address(token));

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
        facet.setPoolParams(arb, params, 0, new address[](0), new address[](0), address(token), 123);

        assertEq(address(facet.superfluidToken()), address(token));
        assertEq(facet.streamingRatePerSecond(), 123);
        assertEq(gdaAgreement.lastPool(), address(0));
        assertEq(int256(gdaAgreement.flowRate()), int256(0));
    }

    function test_setVotingPowerRegistry_revertsIfNotAllowed() public {
        vm.prank(councilSafe);
        vm.expectRevert(
            abi.encodeWithSelector(CVAdminFacet.VotingPowerRegistryNotAllowed.selector, address(customRegistry))
        );
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
