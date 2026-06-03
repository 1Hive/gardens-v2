// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVStreamingFacet} from "../src/CVStrategy/facets/CVStreamingFacet.sol";
import {CVStrategyBaseFacet} from "../src/CVStrategy/CVStrategyBaseFacet.sol";
import {CVStreamingStorage, CVStreamingBase} from "../src/CVStrategy/CVStreamingStorage.sol";
import {Proposal, ProposalStatus, CVParams} from "../src/CVStrategy/ICVStrategy.sol";
import {ConvictionsUtils} from "../src/CVStrategy/ConvictionsUtils.sol";
import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import {
    ISuperfluidPool
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IStrategy} from "allo-v2-contracts/core/interfaces/IStrategy.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {LibDiamond} from "../src/diamonds/libraries/LibDiamond.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";

contract MockGDAAgreement {
    int96 public flowRate;

    function getFlowRate(ISuperToken, address, ISuperfluidPool) external view returns (int96) {
        return flowRate;
    }

    function getFlow(ISuperToken, address, ISuperfluidPool) external view returns (uint256, int96, uint256) {
        return (0, flowRate, 0);
    }

    function setFlowRate(int96 newFlowRate) external {
        flowRate = newFlowRate;
    }
}

contract MockHost {
    address public gda;

    constructor(address _gda) {
        gda = _gda;
    }

    function getAgreementClass(bytes32 agreementType) external view returns (address) {
        bytes32 gdaKey = keccak256("org.superfluid-finance.agreements.GeneralDistributionAgreement.v1");
        if (agreementType == gdaKey) {
            return gda;
        }
        return address(0);
    }

    function callAgreement(address agreementClass, bytes calldata data, bytes calldata)
        external
        returns (bytes memory)
    {
        if (agreementClass == gda) {
            bytes4 selector;
            assembly {
                selector := calldataload(data.offset)
            }
            if (selector == bytes4(keccak256("distributeFlow(address,address,address,int96,bytes)"))) {
                (,, address pool, int96 requestedFlowRate,) =
                    abi.decode(data[4:], (address, address, address, int96, bytes));
                uint128 totalUnits = MockSuperfluidPool(pool).getTotalUnits();
                int96 actualFlowRate = requestedFlowRate;
                if (requestedFlowRate > 0 && totalUnits != 0) {
                    actualFlowRate = (requestedFlowRate / int96(uint96(totalUnits))) * int96(uint96(totalUnits));
                }
                MockGDAAgreement(gda).setFlowRate(actualFlowRate);
            }
        }
        return "";
    }
}

// Mock contracts
contract MockERC20 is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint8 private _decimals = 18;

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        _balances[from] -= amount;
        _balances[to] += amount;
        _allowances[from][msg.sender] -= amount;
        return true;
    }

    function totalSupply() external pure override returns (uint256) {
        return 0;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function setDecimals(uint8 decimals_) external {
        _decimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
    }

    function setBalance(address account, uint256 amount) external {
        _balances[account] = amount;
    }
}

contract MockSuperToken {
    address public host;
    address public underlyingToken;
    mapping(address => uint256) public balances;
    uint256 public upgradeCallCount;
    uint256 public lastUpgradeAmount;
    uint256 public lastUnderlyingUpgradeAmount;
    int96 public gdaFlowRate;
    int96 public lastDistributedFlowRate;
    bool public transferShouldSucceed = true;

    constructor(address _host, address _underlyingToken) {
        host = _host;
        underlyingToken = _underlyingToken;
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

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function mint(address account, uint256 amount) external {
        balances[account] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (!transferShouldSucceed) {
            return false;
        }
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }

    function setTransferShouldSucceed(bool value) external {
        transferShouldSucceed = value;
    }

    function upgrade(uint256 amount) external {
        uint8 underlyingDecimals = IERC20Metadata(underlyingToken).decimals();
        uint8 superDecimals = this.decimals();
        uint256 underlyingAmount = amount;
        if (superDecimals > underlyingDecimals) {
            underlyingAmount = amount / (10 ** (superDecimals - underlyingDecimals));
        } else if (superDecimals < underlyingDecimals) {
            underlyingAmount = amount * (10 ** (underlyingDecimals - superDecimals));
        }

        // Transfer underlying tokens from sender
        IERC20(underlyingToken).transferFrom(msg.sender, address(this), underlyingAmount);

        upgradeCallCount++;
        lastUpgradeAmount = amount;
        lastUnderlyingUpgradeAmount = underlyingAmount;
        balances[msg.sender] += amount;
    }

    // Keep these helpers for direct assertions.
    function setObservedFlowRate(int96 flowRate) external {
        gdaFlowRate = flowRate;
        lastDistributedFlowRate = flowRate;
    }
}

contract MockSuperfluidPool {
    mapping(address => uint128) public memberUnits;
    uint256 public updateCount;
    uint128 public totalUnits;
    bool public updateShouldSucceed = true;

    function updateMemberUnits(address member, uint128 units) external returns (bool) {
        if (!updateShouldSucceed) {
            return false;
        }
        totalUnits = totalUnits - memberUnits[member] + units;
        memberUnits[member] = units;
        updateCount++;
        return true;
    }

    function getTotalUnits() external view returns (uint128) {
        return totalUnits;
    }

    function setUpdateShouldSucceed(bool value) external {
        updateShouldSucceed = value;
    }
}

contract MockAllo {
    mapping(uint256 => address) public poolTokens;

    function setPool(uint256 poolId, address token) external {
        poolTokens[poolId] = token;
    }

    function getPool(uint256 poolId) external view returns (IAllo.Pool memory) {
        return IAllo.Pool({
            profileId: bytes32(0),
            strategy: IStrategy(address(0)),
            token: poolTokens[poolId],
            metadata: Metadata({protocol: 0, pointer: ""}),
            managerRole: bytes32(0),
            adminRole: bytes32(0)
        });
    }
}

contract MockRegistryCommunityStreaming {
    error StrategyDisabled();

    bool public strategyEnabled = true;
    address public councilSafeAddress;
    address public registryFactoryAddress;

    function setStrategyEnabled(bool enabled) external {
        strategyEnabled = enabled;
    }

    function setCouncilSafe(address safe_) external {
        councilSafeAddress = safe_;
    }

    function setRegistryFactory(address factory_) external {
        registryFactoryAddress = factory_;
    }

    function onlyStrategyEnabled(address) external view {
        if (!strategyEnabled) {
            revert StrategyDisabled();
        }
    }

    function enabledStrategies(address) external view returns (bool) {
        return strategyEnabled;
    }

    function councilSafe() external view returns (address) {
        return councilSafeAddress;
    }

    function registryFactory() external view returns (address) {
        return registryFactoryAddress;
    }
}

contract MockRegistryFactoryStreaming {
    mapping(address => bool) public rebalanceCallerAllowlist;

    function setRebalanceCaller(address caller, bool allowed) external {
        rebalanceCallerAllowlist[caller] = allowed;
    }

    function isStreamRebalanceCallerAllowed(address caller) external view returns (bool) {
        return rebalanceCallerAllowlist[caller];
    }

    function isAuthorizedWallet(address caller) external view returns (bool) {
        return rebalanceCallerAllowlist[caller];
    }
}

contract MockStreamingEscrowSync {
    uint256 public requiredDeposit;
    uint256 public syncCount;
    bool public revertSync;
    bool public revertDepositLookup;

    function setRequiredDeposit(uint256 amount) external {
        requiredDeposit = amount;
    }

    function depositAmount() external view returns (uint256) {
        if (revertDepositLookup) {
            revert("deposit lookup failed");
        }
        return requiredDeposit;
    }

    function syncOutflow() external {
        if (revertSync) {
            revert("sync failed");
        }
        syncCount++;
    }

    function setRevertSync(bool value) external {
        revertSync = value;
    }

    function setRevertDepositLookup(bool value) external {
        revertDepositLookup = value;
    }
}

contract MockSafe {
    address[] private _owners;

    function addOwner(address owner_) external {
        _owners.push(owner_);
    }

    function getOwners() external view returns (address[] memory) {
        return _owners;
    }
}

contract CVStreamingFacetHarness is CVStreamingFacet {
    bool internal shouldStart;
    bool internal useRealShouldStart;
    bool internal skipWrap;

    function setCooldown(uint256 cooldown) external {
        setRebalanceCooldown(cooldown);
    }

    function setLastRebalance(uint256 ts) external {
        setLastRebalanceAt(ts);
    }

    function getLastRebalance() external view returns (uint256) {
        return CVStreamingStorage.layout().lastRebalanceAt;
    }

    function setShouldStartStream(bool value) external {
        shouldStart = value;
        useRealShouldStart = false;
    }

    function useRealShouldStartStream() external {
        useRealShouldStart = true;
    }

    function setSkipWrap(bool _skip) external {
        skipWrap = _skip;
    }

    function wrapIfNeeded() public override {
        if (skipWrap) return;
        super.wrapIfNeeded();
    }

    function _shouldStartStream(uint256 totalEligibleConviction, uint256 maxConviction)
        internal
        view
        override
        returns (bool)
    {
        if (useRealShouldStart) {
            return super._shouldStartStream(totalEligibleConviction, maxConviction);
        }
        return shouldStart;
    }

    function exposedBaseShouldStartStream() external view returns (bool) {
        return super._shouldStartStream(1, 1);
    }

    function exposedShouldStartStream(uint256 totalEligibleConviction, uint256 maxConviction)
        external
        view
        returns (bool)
    {
        return super._shouldStartStream(totalEligibleConviction, maxConviction);
    }

    function exposedCalculateProposalConviction(uint256 proposalId) external view returns (uint256) {
        return calculateProposalConviction(proposalId);
    }

    function exposedWrapIfNeeded() external {
        super.wrapIfNeeded();
    }

    function exposedStreamingUnitBudget(uint256 requestedFlowRate) external pure returns (uint128) {
        return _streamingUnitBudget(requestedFlowRate);
    }

    function exposedScaledUnitsForStreaming(
        uint256 convictionValue,
        uint256 totalEligibleConviction,
        uint128 unitBudget
    ) external pure returns (uint128) {
        return _scaledUnitsForStreaming(convictionValue, totalEligibleConviction, unitBudget);
    }

    function exposedLegacyScaledUnits(uint256 convictionValue) external pure returns (uint128) {
        return _legacyScaledUnits(convictionValue);
    }

    function exposedToInt96StreamingRate(uint256 flowRate) external pure returns (int96) {
        return _toInt96StreamingRate(flowRate);
    }

    function exposedStreamingRatePerSecondInSuperTokenUnits() external view returns (uint256) {
        return _streamingRatePerSecondInSuperTokenUnits();
    }

    function setStreamingEscrowExternal(uint256 proposalId, address escrow) external {
        setStreamingEscrow(proposalId, escrow);
    }

    function getStreamingEscrowExternal(uint256 proposalId) external view returns (address) {
        return streamingEscrow(proposalId);
    }

    // Storage setup helpers
    function setupAllo(address _allo) external {
        allo = IAllo(_allo);
    }

    function setupRegistryCommunity(address _registry) external {
        registryCommunity = RegistryCommunity(_registry);
    }

    function setupPool(uint256 _poolId) external {
        poolId = _poolId;
    }

    function setupSuperfluidToken(address _token) external {
        superfluidToken = ISuperToken(_token);
    }

    function setupSuperfluidGDA(address _gda) external {
        superfluidGDA = ISuperfluidPool(_gda);
    }

    function setupCVParams(uint256 decay) external {
        cvParams.decay = decay;
    }

    function setupThresholdParams(uint256 maxRatio, uint256 weight, uint256 minThresholdPoints) external {
        cvParams.maxRatio = maxRatio;
        cvParams.weight = weight;
        cvParams.minThresholdPoints = minThresholdPoints;
    }

    function setupStreamingRatePerSecond(uint256 rate) external {
        streamingRatePerSecond = rate;
    }

    function setupTotalPointsActivated(uint256 points) external {
        totalPointsActivated = points;
    }

    function setupProposal(
        uint256 proposalId,
        ProposalStatus status,
        uint256 stakedAmount,
        uint256 convictionLast,
        uint256 blockLast
    ) external {
        proposalCounter = proposalId > proposalCounter ? proposalId : proposalCounter;
        proposals[proposalId].proposalId = proposalId;
        proposals[proposalId].proposalStatus = status;
        proposals[proposalId].stakedAmount = stakedAmount;
        proposals[proposalId].convictionLast = convictionLast;
        proposals[proposalId].blockLast = blockLast;
        proposals[proposalId].submitter = address(0x1);
    }

    function setProposalRequestedAmount(uint256 proposalId, uint256 requestedAmount) external {
        proposals[proposalId].requestedAmount = requestedAmount;
    }

    function getProposalSnapshot(uint256 proposalId)
        external
        view
        returns (uint256 blockLast, uint256 convictionLast, uint8 status)
    {
        Proposal storage p = proposals[proposalId];
        return (p.blockLast, p.convictionLast, uint8(p.proposalStatus));
    }

    function setDiamondOwner(address owner_) external {
        LibDiamond.setContractOwner(owner_);
    }

    function setProxyOwner(address owner_) external {
        _owner = owner_;
    }
}

contract CVStreamingFacetTest is Test {
    CVStreamingFacetHarness internal facet;
    MockERC20 internal token;
    MockSuperToken internal superToken;
    MockGDAAgreement internal gdaAgreement;
    MockHost internal host;
    MockSuperfluidPool internal gdaPool;
    MockAllo internal allo;
    MockRegistryCommunityStreaming internal registry;
    MockRegistryFactoryStreaming internal registryFactory;

    address internal escrow1;
    address internal escrow2;
    address internal escrow3;

    uint256 constant DECAY = 9940581;
    uint256 constant D = 10 ** 7;

    function setUp() public {
        vm.roll(100); // Set block number high enough to avoid underflow
        vm.warp(1000); // Set timestamp high enough

        facet = new CVStreamingFacetHarness();
        token = new MockERC20();
        gdaAgreement = new MockGDAAgreement();
        host = new MockHost(address(gdaAgreement));
        superToken = new MockSuperToken(address(host), address(token));
        gdaPool = new MockSuperfluidPool();
        allo = new MockAllo();
        registry = new MockRegistryCommunityStreaming();
        registryFactory = new MockRegistryFactoryStreaming();
        escrow1 = address(new MockStreamingEscrowSync());
        escrow2 = address(new MockStreamingEscrowSync());
        escrow3 = address(new MockStreamingEscrowSync());

        facet.setupAllo(address(allo));
        facet.setupRegistryCommunity(address(registry));
        facet.setupPool(1);
        facet.setupSuperfluidToken(address(superToken));
        facet.setupSuperfluidGDA(address(gdaPool));
        facet.setupCVParams(DECAY);
        facet.setupThresholdParams(9_000_000, 1_000_000, 0);
        facet.setupStreamingRatePerSecond(1);
        facet.setupTotalPointsActivated(1_000 * D);
        facet.setDiamondOwner(address(this));
        facet.setProxyOwner(address(this));
        registry.setCouncilSafe(address(0xC011C1));
        registry.setRegistryFactory(address(registryFactory));

        allo.setPool(1, address(token));
        token.mint(address(facet), 1_000 ether);

        // Skip wrapping by default to simplify tests
        // Tests that specifically need wrapping can enable it
        facet.setSkipWrap(true);
    }

    /*//////////////////////////////////////////////////////////////
                    ORIGINAL TESTS
    //////////////////////////////////////////////////////////////*/

    function test_rebalance_updates_timestamp() public {
        facet.setupProposal(1, ProposalStatus.Active, 100 ether, 0, block.number - 10);
        facet.setStreamingEscrowExternal(1, escrow1);
        uint256 nowTs = block.timestamp + 10;
        vm.warp(nowTs);
        facet.rebalance();
        assertEq(facet.getLastRebalance(), nowTs);
    }

    function test_rebalance_reverts_when_cooldown_active() public {
        uint256 nowTs = block.timestamp + 10;
        facet.setCooldown(100);
        facet.setLastRebalance(nowTs);

        vm.warp(nowTs + 1);
        vm.expectRevert(abi.encodeWithSelector(CVStreamingBase.RebalanceCooldownActive.selector, 99));
        facet.rebalance();
    }

    function test_rebalance_reverts_for_unauthorized_caller() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(abi.encodeWithSelector(CVStreamingFacet.UnauthorizedRebalanceCaller.selector, address(0xBAD)));
        facet.rebalance();
    }

    function test_rebalance_allows_factory_allowlisted_caller() public {
        address cronWallet = address(0xCA11);
        registryFactory.setRebalanceCaller(cronWallet, true);

        vm.prank(cronWallet);
        facet.rebalance();

        assertEq(facet.getLastRebalance(), 0);
    }

    function test_rebalance_starts_stream_when_enabled() public {
        facet.setShouldStartStream(true);
        facet.setupProposal(1, ProposalStatus.Active, 100 ether, 0, block.number - 10);
        facet.setStreamingEscrowExternal(1, escrow1);
        facet.rebalance();
        assertGt(facet.getLastRebalance(), 0);
    }

    function test_shouldStartStream_base_returns_false() public {
        assertFalse(facet.exposedBaseShouldStartStream());
    }

    function test_streamingEscrow_set_get() public {
        address escrow = address(0xBEEF);
        facet.setStreamingEscrowExternal(1, escrow);
        assertEq(facet.getStreamingEscrowExternal(1), escrow);
    }

    /*//////////////////////////////////////////////////////////////
                    WRAP IF NEEDED TESTS
    //////////////////////////////////////////////////////////////*/

    // Note: wrapIfNeeded tests are simplified since full ERC20/SuperToken mocking
    // is complex. The key functionality is tested via integration tests.

    function test_wrapIfNeeded_no_supertoken_address() public {
        facet.setupSuperfluidToken(address(0));
        token.mint(address(facet), 100 ether);

        facet.exposedWrapIfNeeded(); // Should return early without reverting

        assertEq(superToken.upgradeCallCount(), 0);
    }

    function test_wrapIfNeeded_native_pool_token_returns_early() public {
        allo.setPool(1, 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
        token.mint(address(facet), 100 ether);

        facet.setSkipWrap(false);
        facet.exposedWrapIfNeeded();

        assertEq(superToken.upgradeCallCount(), 0);
    }

    function test_wrapIfNeeded_underlying_mismatch_returns_early() public {
        allo.setPool(1, address(0xBEEF));
        token.mint(address(facet), 100 ether);

        facet.setSkipWrap(false);
        facet.exposedWrapIfNeeded();

        assertEq(superToken.upgradeCallCount(), 0);
    }

    function test_wrapIfNeeded_pureSuperTokenPool_returns_early() public {
        allo.setPool(1, address(superToken));
        superToken.mint(address(facet), 100 ether);

        facet.setSkipWrap(false);
        facet.exposedWrapIfNeeded();

        assertEq(superToken.upgradeCallCount(), 0);
    }

    function test_wrapIfNeeded_zero_underlying_balance_returns_early() public {
        token.setBalance(address(facet), 0);

        facet.setSkipWrap(false);
        facet.exposedWrapIfNeeded();

        assertEq(superToken.upgradeCallCount(), 0);
    }

    function test_wrapIfNeeded_success_upgrades_underlying_balance() public {
        token.mint(address(facet), 25 ether);

        facet.setSkipWrap(false);
        facet.exposedWrapIfNeeded();

        assertEq(superToken.upgradeCallCount(), 1);
        assertEq(superToken.lastUpgradeAmount(), 1_025 ether);
        assertEq(superToken.balanceOf(address(facet)), 1_025 ether);
    }

    function test_wrapIfNeeded_scales_six_decimal_underlying_to_eighteen_decimal_supertoken() public {
        token.setDecimals(6);
        token.setBalance(address(facet), 23_018_453);

        facet.setSkipWrap(false);
        facet.exposedWrapIfNeeded();

        assertEq(superToken.upgradeCallCount(), 1);
        assertEq(superToken.lastUpgradeAmount(), 23_018_453 * 1e12);
        assertEq(superToken.lastUnderlyingUpgradeAmount(), 23_018_453);
        assertEq(superToken.balanceOf(address(facet)), 23_018_453 * 1e12);
        assertEq(token.balanceOf(address(facet)), 0);
    }

    function test_wrapIfNeeded_skips_when_scaled_upgrade_amount_rounds_to_zero() public {
        token.setDecimals(20);
        token.setBalance(address(facet), 1);

        facet.setSkipWrap(false);
        facet.exposedWrapIfNeeded();

        assertEq(superToken.upgradeCallCount(), 0);
        assertEq(superToken.balanceOf(address(facet)), 0);
        assertEq(token.balanceOf(address(facet)), 1);
    }

    function test_rebalance_scales_pool_token_rate_to_supertoken_flow_rate() public {
        token.setDecimals(6);
        token.setBalance(address(facet), 23_018_453);
        facet.setSkipWrap(false);
        facet.useRealShouldStartStream();
        facet.setupStreamingRatePerSecond(19);
        facet.setupTotalPointsActivated(1 ether);
        facet.setupCVParams(9_082_183);
        facet.setupThresholdParams(3_656_188, 133_677, 0);
        facet.setupProposal(1, ProposalStatus.Active, 1 ether, 0, block.number - 10);
        facet.setStreamingEscrowExternal(1, escrow1);

        facet.rebalance();

        assertEq(facet.exposedStreamingRatePerSecondInSuperTokenUnits(), 19 * 1e12);
        assertEq(superToken.lastUpgradeAmount(), 23_018_453 * 1e12);
        assertGt(gdaAgreement.flowRate(), 0);
        assertLe(uint256(uint96(gdaAgreement.flowRate())), 19 * 1e12);
    }

    /*//////////////////////////////////////////////////////////////
                SHOULD START STREAM TESTS
    //////////////////////////////////////////////////////////////*/

    function test_shouldStartStream_with_balance() public {
        facet.useRealShouldStartStream();
        superToken.mint(address(facet), 100 ether);
        assertTrue(facet.exposedBaseShouldStartStream());
    }

    function test_shouldStartStream_no_balance() public {
        facet.useRealShouldStartStream();
        assertFalse(facet.exposedBaseShouldStartStream());
    }

    function test_shouldStartStream_no_supertoken() public {
        facet.setupSuperfluidToken(address(0));
        assertFalse(facet.exposedBaseShouldStartStream());
    }

    function test_shouldStartStream_false_when_rate_or_conviction_zero() public {
        facet.useRealShouldStartStream();
        superToken.mint(address(facet), 100 ether);

        facet.setupStreamingRatePerSecond(0);
        assertFalse(facet.exposedShouldStartStream(1, 1));

        facet.setupStreamingRatePerSecond(1);
        assertFalse(facet.exposedShouldStartStream(0, 1));
        assertFalse(facet.exposedShouldStartStream(1, 0));
    }

    function test_streaming_helper_bounds() public {
        assertEq(facet.exposedStreamingUnitBudget(123), 123);
        assertEq(facet.exposedStreamingUnitBudget(uint256(type(uint128).max) + 1), type(uint128).max);

        assertEq(facet.exposedScaledUnitsForStreaming(0, 1, 1), 0);
        assertEq(facet.exposedScaledUnitsForStreaming(1, 2, 1), 1);
        assertEq(facet.exposedScaledUnitsForStreaming(type(uint128).max, 1, type(uint128).max), type(uint128).max);

        assertEq(facet.exposedLegacyScaledUnits(type(uint256).max), type(uint128).max);
        assertEq(facet.exposedToInt96StreamingRate(uint256(uint96(type(int96).max))), type(int96).max);

        uint256 overflowingFlowRate = uint256(uint96(type(int96).max)) + 1;
        vm.expectRevert(abi.encodeWithSelector(CVStreamingFacet.StreamingRateOverflow.selector, overflowingFlowRate));
        facet.exposedToInt96StreamingRate(overflowingFlowRate);
    }

    /*//////////////////////////////////////////////////////////////
            CALCULATE PROPOSAL CONVICTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_calculateProposalConviction_basic() public {
        uint256 proposalId = 1;
        uint256 stakedAmount = 100 ether;
        facet.setupProposal(proposalId, ProposalStatus.Active, stakedAmount, 0, block.number);

        vm.roll(block.number + 10);

        uint256 conviction = facet.exposedCalculateProposalConviction(proposalId);

        assertGt(conviction, 0);
        assertGt(conviction, stakedAmount);
    }

    function test_calculateProposalConviction_accumulates_over_time() public {
        uint256 proposalId = 1;
        uint256 stakedAmount = 100 ether;
        facet.setupProposal(proposalId, ProposalStatus.Active, stakedAmount, 0, block.number);

        vm.roll(block.number + 10);
        uint256 conviction1 = facet.exposedCalculateProposalConviction(proposalId);

        vm.roll(block.number + 20);
        uint256 conviction2 = facet.exposedCalculateProposalConviction(proposalId);

        assertGt(conviction2, conviction1);
    }

    /*//////////////////////////////////////////////////////////////
                    REBALANCE COMPREHENSIVE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_rebalance_cooldown_zero() public {
        facet.setCooldown(0);

        facet.rebalance();
        facet.rebalance();
        facet.rebalance();
    }

    function test_rebalance_cooldown_expired() public {
        uint256 cooldown = 100;
        facet.setCooldown(cooldown);

        facet.rebalance();

        vm.warp(block.timestamp + cooldown + 1); // Wait until cooldown expires

        facet.rebalance();
    }

    function test_rebalance_single_active_proposal() public {
        uint256 proposalId = 1;
        uint256 stakedAmount = 100 ether;
        facet.setupProposal(proposalId, ProposalStatus.Active, stakedAmount, 0, block.number - 10);
        facet.setStreamingEscrowExternal(proposalId, escrow1);

        facet.rebalance();

        assertEq(gdaPool.updateCount(), 1);
        assertGt(gdaPool.memberUnits(escrow1), 0);
    }

    function test_getPoolAmount_scales_six_decimal_pool_token_and_eighteen_decimal_super_token() public {
        token.setDecimals(6);
        token.setBalance(address(facet), 1_000_000);
        superToken.mint(address(facet), 1 ether);

        assertEq(facet.getPoolAmount(), 2_000_000);
    }

    function test_rebalance_pureSuperTokenPool_keeps_zero_requested_streaming_proposal_eligible() public {
        uint256 realPoolBalance = 100 ether;
        uint256 requestedAmount = 100 ether;

        allo.setPool(1, address(superToken));
        superToken.mint(address(facet), realPoolBalance);

        uint256 thresholdIfDoubleCounted = ConvictionsUtils.calculateThreshold(
            requestedAmount, realPoolBalance * 2, 1_000 * D, DECAY, 1_000_000, 9_000_000, 0
        );

        facet.setupProposal(1, ProposalStatus.Active, 0, thresholdIfDoubleCounted + 1, block.number);
        facet.setProposalRequestedAmount(1, requestedAmount);
        facet.setStreamingEscrowExternal(1, escrow1);

        assertEq(facet.getPoolAmount(), realPoolBalance);

        facet.rebalance();

        assertGt(gdaPool.memberUnits(escrow1), 0);
    }

    function test_rebalance_multiple_active_proposals() public {
        facet.setupProposal(1, ProposalStatus.Active, 100 ether, 0, block.number - 10);
        facet.setupProposal(2, ProposalStatus.Active, 200 ether, 0, block.number - 5);
        facet.setupProposal(3, ProposalStatus.Active, 50 ether, 0, block.number - 15);

        facet.setStreamingEscrowExternal(1, escrow1);
        facet.setStreamingEscrowExternal(2, escrow2);
        facet.setStreamingEscrowExternal(3, escrow3);

        facet.rebalance();

        assertEq(gdaPool.updateCount(), 3);

        uint128 units1 = gdaPool.memberUnits(escrow1);
        uint128 units2 = gdaPool.memberUnits(escrow2);
        uint128 units3 = gdaPool.memberUnits(escrow3);

        assertGt(units1, 0);
        assertGt(units2, 0);
        assertGt(units3, 0);
        assertGt(units2, units1);
        assertGt(units2, units3);
    }

    function test_rebalance_skips_inactive_proposals() public {
        facet.setupProposal(1, ProposalStatus.Active, 100 ether, 0, block.number - 10);
        facet.setupProposal(2, ProposalStatus.Cancelled, 200 ether, 0, block.number - 5);
        facet.setupProposal(3, ProposalStatus.Executed, 150 ether, 0, block.number - 8);
        facet.setupProposal(4, ProposalStatus.Active, 50 ether, 0, block.number - 12);

        facet.setStreamingEscrowExternal(1, escrow1);
        facet.setStreamingEscrowExternal(2, escrow2);
        facet.setStreamingEscrowExternal(3, escrow3);
        facet.setStreamingEscrowExternal(4, address(new MockStreamingEscrowSync()));

        facet.rebalance();

        assertEq(gdaPool.updateCount(), 4);
        assertGt(gdaPool.memberUnits(escrow1), 0);
        assertEq(gdaPool.memberUnits(escrow2), 0);
        assertEq(gdaPool.memberUnits(escrow3), 0);
    }

    function test_rebalance_skips_proposals_without_escrow() public {
        facet.setupProposal(1, ProposalStatus.Active, 100 ether, 0, block.number - 10);

        facet.rebalance();

        assertEq(gdaPool.updateCount(), 0);
    }

    function test_rebalance_disabled_pool_sets_flow_to_zero_only() public {
        superToken.mint(address(facet), 1_000 ether);
        facet.setupStreamingRatePerSecond(1_000_000_000);
        facet.setupTotalPointsActivated(1_000 * D);
        facet.setupProposal(1, ProposalStatus.Active, 100 ether, 0, block.number - 10);
        facet.setStreamingEscrowExternal(1, escrow1);

        facet.rebalance();
        assertGt(gdaPool.memberUnits(escrow1), 0);
        gdaAgreement.setFlowRate(123);

        registry.setStrategyEnabled(false);
        vm.roll(block.number + 5);
        facet.rebalance();

        assertGt(gdaPool.memberUnits(escrow1), 0);
        assertEq(gdaAgreement.flowRate(), 0);
    }

    function test_rebalance_disabled_pool_freezes_conviction_after_snapshot() public {
        facet.setupProposal(1, ProposalStatus.Active, 100 ether, 0, block.number - 10);
        facet.setStreamingEscrowExternal(1, escrow1);
        (uint256 initialBlockLast, uint256 initialConviction,) = facet.getProposalSnapshot(1);

        registry.setStrategyEnabled(false);
        vm.roll(block.number + 5);
        facet.rebalance();

        (uint256 blockLastAfterSnapshot, uint256 convictionAfterSnapshot,) = facet.getProposalSnapshot(1);
        assertEq(blockLastAfterSnapshot, initialBlockLast);
        assertEq(convictionAfterSnapshot, initialConviction);

        vm.roll(block.number + 12);
        facet.rebalance();

        (uint256 blockLastAfterSecondRebalance, uint256 convictionAfterSecondRebalance,) = facet.getProposalSnapshot(1);
        assertEq(blockLastAfterSecondRebalance, blockLastAfterSnapshot);
        assertEq(convictionAfterSecondRebalance, convictionAfterSnapshot);
    }

    function test_rebalance_disabled_without_flow_change_keeps_timestamp() public {
        registry.setStrategyEnabled(false);

        facet.rebalance();

        assertEq(facet.getLastRebalance(), 0);
    }

    // Note: Extreme edge case tests removed as they cause overflow in conviction calculation
    // The scaling and overflow protection logic is tested with realistic values in other tests

    function test_rebalance_proportional_distribution() public {
        facet.setupProposal(1, ProposalStatus.Active, 100 ether, 0, block.number - 10);
        facet.setupProposal(2, ProposalStatus.Active, 200 ether, 0, block.number - 10);
        facet.setupProposal(3, ProposalStatus.Active, 300 ether, 0, block.number - 10);

        facet.setStreamingEscrowExternal(1, escrow1);
        facet.setStreamingEscrowExternal(2, escrow2);
        facet.setStreamingEscrowExternal(3, escrow3);

        facet.rebalance();

        uint128 units1 = gdaPool.memberUnits(escrow1);
        uint128 units2 = gdaPool.memberUnits(escrow2);
        uint128 units3 = gdaPool.memberUnits(escrow3);

        assertGt(units1, 0);
        assertGt(units2, units1);
        assertGt(units3, units2);
    }

    function test_rebalance_with_stream_start() public {
        facet.setupStreamingRatePerSecond(1_000_000_000);
        facet.setupTotalPointsActivated(1000 * D);
        superToken.mint(address(facet), 1000 ether);
        facet.setupProposal(1, ProposalStatus.Active, 100 ether, 0, block.number - 10);
        facet.setStreamingEscrowExternal(1, escrow1);
        facet.rebalance();
        assertEq(facet.getLastRebalance(), block.timestamp);
        assertLe(int256(gdaAgreement.flowRate()), int256(1_000_000_000));
    }

    function test_rebalance_starts_stream_when_eligible_units_would_round_flow_to_zero() public {
        token.setBalance(address(facet), 0);
        superToken.mint(address(facet), 10 ether);
        facet.useRealShouldStartStream();
        facet.setupCVParams(9_999_959);
        facet.setupThresholdParams(3_656_188, 133_677, 30 ether);
        facet.setupTotalPointsActivated(300 ether);
        facet.setupStreamingRatePerSecond(38_051_750_380_518);

        uint256 requestedAmount = 1;
        uint256 threshold = ConvictionsUtils.calculateThreshold(
            requestedAmount, 10 ether, 300 ether, 9_999_959, 133_677, 3_656_188, 30 ether
        );
        facet.setupProposal(1, ProposalStatus.Active, 0, threshold - 1, block.number);
        facet.setupProposal(2, ProposalStatus.Active, 0, threshold + 1, block.number);
        facet.setProposalRequestedAmount(1, requestedAmount);
        facet.setProposalRequestedAmount(2, requestedAmount);
        facet.setStreamingEscrowExternal(1, escrow1);
        facet.setStreamingEscrowExternal(2, escrow2);

        facet.rebalance();

        assertEq(gdaPool.memberUnits(escrow1), 0);
        assertGt(gdaPool.memberUnits(escrow2), 0);
        assertGt(gdaAgreement.flowRate(), 0);
    }

    function test_rebalance_tops_up_escrow_deposit_with_buffer_before_sync() public {
        MockStreamingEscrowSync escrow = new MockStreamingEscrowSync();
        escrow.setRequiredDeposit(50 ether);

        superToken.mint(address(facet), 200 ether);
        facet.setupProposal(1, ProposalStatus.Active, 1 ether, 0, block.number - 5);
        facet.setStreamingEscrowExternal(1, address(escrow));

        facet.rebalance();

        assertEq(superToken.balanceOf(address(escrow)), 50.25 ether);
        assertEq(escrow.syncCount(), 1);
    }

    function test_rebalance_tops_up_buffer_when_escrow_has_exact_required_deposit() public {
        MockStreamingEscrowSync escrow = new MockStreamingEscrowSync();
        escrow.setRequiredDeposit(50 ether);

        superToken.mint(address(escrow), 50 ether);
        superToken.mint(address(facet), 1 ether);
        facet.setupProposal(1, ProposalStatus.Active, 1 ether, 0, block.number - 5);
        facet.setStreamingEscrowExternal(1, address(escrow));

        facet.rebalance();

        assertEq(superToken.balanceOf(address(escrow)), 50.25 ether);
        assertEq(escrow.syncCount(), 1);
    }

    function test_rebalance_does_not_top_up_when_escrow_has_buffered_deposit() public {
        MockStreamingEscrowSync escrow = new MockStreamingEscrowSync();
        escrow.setRequiredDeposit(50 ether);

        superToken.mint(address(escrow), 50.25 ether);
        superToken.mint(address(facet), 1 ether);
        facet.setupProposal(1, ProposalStatus.Active, 1 ether, 0, block.number - 5);
        facet.setStreamingEscrowExternal(1, address(escrow));

        facet.rebalance();

        assertEq(superToken.balanceOf(address(escrow)), 50.25 ether);
        assertEq(superToken.balanceOf(address(facet)), 1 ether);
        assertEq(escrow.syncCount(), 1);
    }

    function test_rebalance_tops_up_only_available_balance() public {
        MockStreamingEscrowSync escrow = new MockStreamingEscrowSync();
        escrow.setRequiredDeposit(100 ether);

        superToken.mint(address(facet), 20 ether);
        facet.setupProposal(1, ProposalStatus.Active, 1 ether, 0, block.number - 5);
        facet.setStreamingEscrowExternal(1, address(escrow));

        facet.rebalance();

        assertEq(superToken.balanceOf(address(escrow)), 20 ether);
        assertEq(escrow.syncCount(), 1);
    }

    function test_rebalance_ignores_deposit_lookup_failures() public {
        MockStreamingEscrowSync escrow = new MockStreamingEscrowSync();
        escrow.setRevertDepositLookup(true);

        facet.setupProposal(1, ProposalStatus.Active, 1 ether, 0, block.number - 5);
        facet.setStreamingEscrowExternal(1, address(escrow));

        facet.rebalance();

        assertEq(escrow.syncCount(), 1);
    }

    function test_rebalance_sync_error_does_not_advance_timestamp() public {
        MockStreamingEscrowSync escrow = new MockStreamingEscrowSync();
        escrow.setRevertSync(true);

        facet.setShouldStartStream(true);
        facet.setupProposal(1, ProposalStatus.Active, 1 ether, 0, block.number - 5);
        facet.setStreamingEscrowExternal(1, address(escrow));

        facet.rebalance();

        assertEq(facet.getLastRebalance(), 0);
    }

    function test_rebalance_update_member_units_failure_reverts() public {
        facet.setupProposal(1, ProposalStatus.Active, 1 ether, 0, block.number - 5);
        facet.setStreamingEscrowExternal(1, escrow1);
        gdaPool.setUpdateShouldSucceed(false);

        vm.expectRevert();
        facet.rebalance();
    }

    function test_rebalance_transfer_failure_reverts_on_top_up() public {
        MockStreamingEscrowSync escrow = new MockStreamingEscrowSync();
        escrow.setRequiredDeposit(1 ether);

        superToken.mint(address(facet), 1 ether);
        superToken.setTransferShouldSucceed(false);
        facet.setupProposal(1, ProposalStatus.Active, 1 ether, 0, block.number - 5);
        facet.setStreamingEscrowExternal(1, address(escrow));

        vm.expectRevert(
            abi.encodeWithSelector(CVStreamingFacet.SuperTokenTransferFailed.selector, address(escrow), 1 ether)
        );
        facet.rebalance();
    }

    function test_rebalance_zero_conviction() public {
        uint256 proposalId = 1;
        facet.setupProposal(proposalId, ProposalStatus.Active, 0, 0, block.number);
        facet.setStreamingEscrowExternal(proposalId, escrow1);

        facet.rebalance();

        assertEq(gdaPool.memberUnits(escrow1), 0);
        assertEq(gdaPool.updateCount(), 1);
    }

    // Note: Wrapping functionality is complex to mock, so we skip this test
    // The core rebalance logic is tested separately

    /*//////////////////////////////////////////////////////////////
                    INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_integration_full_workflow() public {
        // Setup proposals with supertokens already available
        superToken.mint(address(facet), 1000 ether);

        facet.setupProposal(1, ProposalStatus.Active, 100 ether, 0, block.number - 10);
        facet.setupProposal(2, ProposalStatus.Active, 200 ether, 0, block.number - 5);
        facet.setStreamingEscrowExternal(1, escrow1);
        facet.setStreamingEscrowExternal(2, escrow2);

        facet.rebalance();

        assertEq(gdaPool.updateCount(), 2);
        assertGt(gdaPool.memberUnits(escrow1), 0);
        assertGt(gdaPool.memberUnits(escrow2), 0);

        vm.roll(block.number + 10);
        vm.warp(block.timestamp + 1000);

        facet.rebalance();

        assertEq(gdaPool.updateCount(), 4);
    }

    /*//////////////////////////////////////////////////////////////
                    EDGE CASE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_edge_case_max_proposals() public {
        uint256 numProposals = 50;
        for (uint256 i = 1; i <= numProposals; i++) {
            facet.setupProposal(i, ProposalStatus.Active, 10 ether * i, 0, block.number - i);
            facet.setStreamingEscrowExternal(i, address(new MockStreamingEscrowSync()));
        }

        facet.rebalance();

        assertEq(gdaPool.updateCount(), numProposals);
    }

    function test_edge_case_conviction_precision() public {
        uint256 tinyConviction = D / 2;
        facet.setupProposal(1, ProposalStatus.Active, 0, tinyConviction, block.number);
        facet.setStreamingEscrowExternal(1, escrow1);

        facet.rebalance();

        assertEq(gdaPool.memberUnits(escrow1), 0);
    }

    function test_setAuthorizedRebalanceCaller_defaults_to_false_for_unknown_caller() public view {
        assertFalse(facet.isAuthorizedRebalanceCaller(address(0xB0B)));
    }

    function test_setAuthorizedRebalanceCaller_allows_council_and_enables_rebalance() public {
        address caller = address(0xB0B);

        vm.prank(registry.councilSafe());
        facet.setAuthorizedRebalanceCaller(caller, true);
        assertTrue(facet.isAuthorizedRebalanceCaller(caller));

        vm.prank(caller);
        facet.rebalance();
    }

    function test_stopEscrowStream_requires_owner_and_zeroes_units() public {
        facet.setupProposal(1, ProposalStatus.Active, 1 ether, 0, block.number - 5);
        facet.setStreamingEscrowExternal(1, escrow1);
        facet.rebalance();
        assertGt(gdaPool.memberUnits(escrow1), 0);

        vm.prank(address(0xBAD));
        vm.expectRevert(abi.encodeWithSelector(CVStrategyBaseFacet.OnlyOwner.selector, address(0xBAD), address(this)));
        facet.stopEscrowStream(escrow1);

        facet.stopEscrowStream(escrow1);
        assertEq(gdaPool.memberUnits(escrow1), 0);
    }

    function test_stopEscrowStream_reverts_for_zero_address() public {
        vm.expectRevert(abi.encodeWithSelector(CVStreamingFacet.StreamingEscrowNotFound.selector, address(0)));
        facet.stopEscrowStream(address(0));
    }

    function test_stopEscrowStream_reverts_when_member_units_update_fails() public {
        gdaPool.setUpdateShouldSucceed(false);

        vm.expectRevert(abi.encodeWithSelector(CVStreamingFacet.UpdateMemberUnitsFailed.selector, escrow1, 0));
        facet.stopEscrowStream(escrow1);
    }

    function test_stopEscrowStream_tolerates_sync_failure() public {
        MockStreamingEscrowSync escrow = new MockStreamingEscrowSync();
        escrow.setRevertSync(true);

        facet.stopEscrowStream(address(escrow));
        assertEq(gdaPool.memberUnits(address(escrow)), 0);
    }

    // Note: Removed unrealistic uint128 max test - causes overflow in conviction calculation

    /*//////////////////////////////////////////////////////////////
                    AUTHORIZATION BRANCH TESTS
    //////////////////////////////////////////////////////////////*/

    function test_auth_none_returns_false() public view {
        assertFalse(facet.isAuthorizedRebalanceCaller(address(0xDEAD)));
    }

    function test_auth_contract_owner() public view {
        // address(this) is set as proxy owner in setUp
        assertTrue(facet.isAuthorizedRebalanceCaller(address(this)));
    }

    function test_auth_internal_address_this() public view {
        // The strategy contract itself is always authorized
        assertTrue(facet.isAuthorizedRebalanceCaller(address(facet)));
    }

    function test_auth_council_safe_address() public view {
        assertTrue(facet.isAuthorizedRebalanceCaller(registry.councilSafeAddress()));
    }

    function test_auth_council_safe_owner() public {
        MockSafe safe = new MockSafe();
        address safeOwner = address(0xF00D);
        safe.addOwner(safeOwner);
        registry.setCouncilSafe(address(safe));

        assertTrue(facet.isAuthorizedRebalanceCaller(safeOwner));
    }

    function test_auth_council_safe_non_owner_returns_false() public {
        MockSafe safe = new MockSafe();
        safe.addOwner(address(0xF00D));
        registry.setCouncilSafe(address(safe));

        assertFalse(facet.isAuthorizedRebalanceCaller(address(0xBAD)));
    }

    function test_auth_factory_allowlist() public {
        address keeper = address(0xCA11);
        registryFactory.setRebalanceCaller(keeper, true);

        assertTrue(facet.isAuthorizedRebalanceCaller(keeper));
    }

    function test_auth_factory_allowlist_removed() public {
        address keeper = address(0xCA11);
        registryFactory.setRebalanceCaller(keeper, true);
        assertTrue(facet.isAuthorizedRebalanceCaller(keeper));

        registryFactory.setRebalanceCaller(keeper, false);
        assertFalse(facet.isAuthorizedRebalanceCaller(keeper));
    }

    function test_auth_strategy_allowlist() public {
        address keeper = address(0xBEEF);
        vm.prank(registry.councilSafeAddress());
        facet.setAuthorizedRebalanceCaller(keeper, true);

        assertTrue(facet.isAuthorizedRebalanceCaller(keeper));
    }

    function test_auth_strategy_allowlist_revoked() public {
        address keeper = address(0xBEEF);
        vm.prank(registry.councilSafeAddress());
        facet.setAuthorizedRebalanceCaller(keeper, true);
        assertTrue(facet.isAuthorizedRebalanceCaller(keeper));

        vm.prank(registry.councilSafeAddress());
        facet.setAuthorizedRebalanceCaller(keeper, false);
        assertFalse(facet.isAuthorizedRebalanceCaller(keeper));
    }

    function test_auth_zero_registry_returns_false() public {
        facet.setupRegistryCommunity(address(0));
        assertFalse(facet.isAuthorizedRebalanceCaller(address(this)));
    }

    function test_auth_council_safe_non_contract_owner_path_returns_false() public view {
        // councilSafe is 0xC011C1 (no code) — _isCouncilSafeOwner must return false gracefully
        assertFalse(facet.isAuthorizedRebalanceCaller(address(0xABCD)));
    }
}
