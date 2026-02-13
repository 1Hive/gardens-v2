// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ConvictionsUtils} from "../src/CVStrategy/ConvictionsUtils.sol";
import {HypercertSignalPool} from "../src/HypercertSignalPool/HypercertSignalPool.sol";
import {
    HypercertSignal,
    HypercertSignalPoolInitializeParams,
    InitializedHypercertSignalPool,
    HypercertRegistered,
    HypercertDeregistered,
    SupportAllocated,
    ConvictionUpdated,
    DecayUpdated,
    PointsPerVoterUpdated,
    HypercertAlreadyRegistered,
    HypercertNotRegistered,
    HypercertNotActive,
    HypercertStillActive,
    NotEligibleVoter,
    PointBudgetExceeded,
    InvalidDecay,
    InvalidPointsPerVoter,
    ZeroHypercertId,
    StakesReclaimed
} from "../src/HypercertSignalPool/IHypercertSignalPool.sol";

// ── Mocks ────────────────────────────────────────────────────────────

/// @dev Minimal mock Allo that tracks pool managers for onlyAllo / onlyPoolManager checks.
contract MockSignalAllo {
    mapping(uint256 => mapping(address => bool)) public managers;

    function setPoolManager(uint256 poolId, address manager, bool allowed) external {
        managers[poolId][manager] = allowed;
    }

    function isPoolManager(uint256 poolId, address account) external view returns (bool) {
        return managers[poolId][account];
    }
}

/// @dev Minimal mock VotingPowerRegistry that satisfies isMember checks.
contract MockVotingPowerRegistry {
    mapping(address => bool) public members;

    function setMember(address member, bool allowed) external {
        members[member] = allowed;
    }

    function isMember(address member) external view returns (bool) {
        return members[member];
    }

    function getMemberPowerInStrategy(address member, address) external view returns (uint256) {
        return members[member] ? 1 : 0;
    }

    function getMemberStakedAmount(address) external pure returns (uint256) {
        return 0;
    }

    function ercAddress() external pure returns (address) {
        return address(0);
    }
}

// ── Test Contract ────────────────────────────────────────────────────

contract HypercertSignalPoolTest is Test {
    uint256 constant D = 10_000_000; // ConvictionsUtils.D
    uint256 constant POOL_ID = 1;
    uint256 constant DEFAULT_DECAY = 9_999_946; // ~3-day half-life on Base (2s blocks)
    uint256 constant DEFAULT_POINTS = 100;

    MockSignalAllo allo;
    MockVotingPowerRegistry registry;
    HypercertSignalPool pool;

    address owner = address(0xCAFE);
    address operator = address(0xBEEF);
    address voter1 = address(0x1001);
    address voter2 = address(0x1002);
    address nonMember = address(0xDEAD);

    // ── Setup ─────────────────────────────────────────────────────────

    function setUp() public {
        allo = new MockSignalAllo();
        registry = new MockVotingPowerRegistry();

        // Deploy implementation + proxy
        HypercertSignalPool impl = new HypercertSignalPool();
        bytes memory initCall = abi.encodeWithSignature("init(address,address)", address(allo), owner);
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initCall);
        pool = HypercertSignalPool(address(proxy));

        // Set up pool manager
        allo.setPoolManager(POOL_ID, operator, true);

        // Register members
        registry.setMember(voter1, true);
        registry.setMember(voter2, true);

        // Initialize pool (as Allo)
        HypercertSignalPoolInitializeParams memory params = HypercertSignalPoolInitializeParams({
            decay: DEFAULT_DECAY,
            pointsPerVoter: DEFAULT_POINTS,
            registryCommunity: address(registry),
            votingPowerRegistry: address(registry)
        });

        vm.prank(address(allo));
        pool.initialize(POOL_ID, abi.encode(params));
    }

    // ═══════════════════════════════════════════════════════════════════
    //                        INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    function test_initialize_setsParameters() public view {
        assertEq(pool.decay(), DEFAULT_DECAY);
        assertEq(pool.pointsPerVoter(), DEFAULT_POINTS);
        assertEq(address(pool.votingPowerRegistry()), address(registry));
        assertEq(pool.registryCommunity(), address(registry));
        assertTrue(pool.isPoolActive());
    }

    function test_initialize_revertsIfNotAllo() public {
        HypercertSignalPool impl2 = new HypercertSignalPool();
        bytes memory initCall = abi.encodeWithSignature("init(address,address)", address(allo), owner);
        ERC1967Proxy proxy2 = new ERC1967Proxy(address(impl2), initCall);
        HypercertSignalPool pool2 = HypercertSignalPool(address(proxy2));

        HypercertSignalPoolInitializeParams memory params = HypercertSignalPoolInitializeParams({
            decay: DEFAULT_DECAY,
            pointsPerVoter: DEFAULT_POINTS,
            registryCommunity: address(registry),
            votingPowerRegistry: address(registry)
        });

        vm.expectRevert();
        pool2.initialize(2, abi.encode(params));
    }

    function test_initialize_revertsIfDecayZero() public {
        HypercertSignalPool impl2 = new HypercertSignalPool();
        bytes memory initCall = abi.encodeWithSignature("init(address,address)", address(allo), owner);
        ERC1967Proxy proxy2 = new ERC1967Proxy(address(impl2), initCall);
        HypercertSignalPool pool2 = HypercertSignalPool(address(proxy2));

        HypercertSignalPoolInitializeParams memory params = HypercertSignalPoolInitializeParams({
            decay: 0,
            pointsPerVoter: DEFAULT_POINTS,
            registryCommunity: address(registry),
            votingPowerRegistry: address(registry)
        });

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(InvalidDecay.selector, 0));
        pool2.initialize(2, abi.encode(params));
    }

    function test_initialize_revertsIfDecayGteD() public {
        HypercertSignalPool impl2 = new HypercertSignalPool();
        bytes memory initCall = abi.encodeWithSignature("init(address,address)", address(allo), owner);
        ERC1967Proxy proxy2 = new ERC1967Proxy(address(impl2), initCall);
        HypercertSignalPool pool2 = HypercertSignalPool(address(proxy2));

        HypercertSignalPoolInitializeParams memory params = HypercertSignalPoolInitializeParams({
            decay: D,
            pointsPerVoter: DEFAULT_POINTS,
            registryCommunity: address(registry),
            votingPowerRegistry: address(registry)
        });

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(InvalidDecay.selector, D));
        pool2.initialize(2, abi.encode(params));
    }

    function test_initialize_revertsIfPointsZero() public {
        HypercertSignalPool impl2 = new HypercertSignalPool();
        bytes memory initCall = abi.encodeWithSignature("init(address,address)", address(allo), owner);
        ERC1967Proxy proxy2 = new ERC1967Proxy(address(impl2), initCall);
        HypercertSignalPool pool2 = HypercertSignalPool(address(proxy2));

        HypercertSignalPoolInitializeParams memory params = HypercertSignalPoolInitializeParams({
            decay: DEFAULT_DECAY,
            pointsPerVoter: 0,
            registryCommunity: address(registry),
            votingPowerRegistry: address(registry)
        });

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(InvalidPointsPerVoter.selector, 0));
        pool2.initialize(2, abi.encode(params));
    }

    function test_initialize_defaultsVotingPowerRegistryToRegistryCommunity() public {
        HypercertSignalPool impl2 = new HypercertSignalPool();
        bytes memory initCall = abi.encodeWithSignature("init(address,address)", address(allo), owner);
        ERC1967Proxy proxy2 = new ERC1967Proxy(address(impl2), initCall);
        HypercertSignalPool pool2 = HypercertSignalPool(address(proxy2));

        HypercertSignalPoolInitializeParams memory params = HypercertSignalPoolInitializeParams({
            decay: DEFAULT_DECAY,
            pointsPerVoter: DEFAULT_POINTS,
            registryCommunity: address(registry),
            votingPowerRegistry: address(0) // zero = use registryCommunity
        });

        vm.prank(address(allo));
        pool2.initialize(2, abi.encode(params));

        assertEq(address(pool2.votingPowerRegistry()), address(registry));
    }

    function test_getPoolAmount_returnsZero() public view {
        assertEq(pool.getPoolAmount(), 0);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                    HYPERCERT REGISTRATION
    // ═══════════════════════════════════════════════════════════════════

    function test_registerRecipient_success() public {
        uint256 hcId = 1001;

        vm.prank(address(allo));
        address recipientId = pool.registerRecipient(abi.encode(hcId), operator);

        assertEq(recipientId, address(uint160(hcId)));
        assertTrue(pool.hypercertActive(hcId));
        assertEq(pool.blockLast(hcId), block.number);

        uint256[] memory registered = pool.getRegisteredHypercerts();
        assertEq(registered.length, 1);
        assertEq(registered[0], hcId);
    }

    function test_registerRecipient_emitsEvent() public {
        uint256 hcId = 1001;

        vm.expectEmit(true, true, false, false);
        emit HypercertRegistered(hcId, operator);

        vm.prank(address(allo));
        pool.registerRecipient(abi.encode(hcId), operator);
    }

    function test_registerRecipient_revertsIfNotAllo() public {
        vm.expectRevert();
        pool.registerRecipient(abi.encode(uint256(1001)), operator);
    }

    function test_registerRecipient_revertsIfNotPoolManager() public {
        vm.prank(address(allo));
        vm.expectRevert();
        pool.registerRecipient(abi.encode(uint256(1001)), nonMember);
    }

    function test_registerRecipient_revertsIfZeroId() public {
        vm.prank(address(allo));
        vm.expectRevert(ZeroHypercertId.selector);
        pool.registerRecipient(abi.encode(uint256(0)), operator);
    }

    function test_registerRecipient_revertsIfDuplicate() public {
        uint256 hcId = 1001;

        vm.prank(address(allo));
        pool.registerRecipient(abi.encode(hcId), operator);

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(HypercertAlreadyRegistered.selector, hcId));
        pool.registerRecipient(abi.encode(hcId), operator);
    }

    function test_registerRecipient_multipleHypercerts() public {
        uint256[] memory ids = new uint256[](3);
        ids[0] = 1001;
        ids[1] = 1002;
        ids[2] = 1003;

        for (uint256 i = 0; i < ids.length; i++) {
            vm.prank(address(allo));
            pool.registerRecipient(abi.encode(ids[i]), operator);
        }

        uint256[] memory registered = pool.getRegisteredHypercerts();
        assertEq(registered.length, 3);
        assertEq(registered[0], 1001);
        assertEq(registered[1], 1002);
        assertEq(registered[2], 1003);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                    CONVICTION ALLOCATION
    // ═══════════════════════════════════════════════════════════════════

    function _registerHypercert(uint256 hcId) internal {
        vm.prank(address(allo));
        pool.registerRecipient(abi.encode(hcId), operator);
    }

    function _allocate(address voter, HypercertSignal[] memory signals) internal {
        vm.prank(address(allo));
        pool.allocate(abi.encode(signals), voter);
    }

    function test_allocate_singleHypercert() public {
        _registerHypercert(1001);

        HypercertSignal[] memory signals = new HypercertSignal[](1);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 50});

        _allocate(voter1, signals);

        assertEq(pool.voterStakes(1001, voter1), 50);
        assertEq(pool.stakedAmounts(1001), 50);
        assertEq(pool.voterUsedPoints(voter1), 50);
    }

    function test_allocate_multipleHypercerts() public {
        _registerHypercert(1001);
        _registerHypercert(1002);

        HypercertSignal[] memory signals = new HypercertSignal[](2);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 30});
        signals[1] = HypercertSignal({hypercertId: 1002, deltaSupport: 40});

        _allocate(voter1, signals);

        assertEq(pool.voterStakes(1001, voter1), 30);
        assertEq(pool.voterStakes(1002, voter1), 40);
        assertEq(pool.voterUsedPoints(voter1), 70);
    }

    function test_allocate_removeSupport() public {
        _registerHypercert(1001);

        // Add support
        HypercertSignal[] memory add = new HypercertSignal[](1);
        add[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 80});
        _allocate(voter1, add);

        // Remove some support
        HypercertSignal[] memory remove = new HypercertSignal[](1);
        remove[0] = HypercertSignal({hypercertId: 1001, deltaSupport: -30});

        vm.roll(block.number + 1); // advance block for conviction update
        _allocate(voter1, remove);

        assertEq(pool.voterStakes(1001, voter1), 50);
        assertEq(pool.stakedAmounts(1001), 50);
        assertEq(pool.voterUsedPoints(voter1), 50);
    }

    function test_allocate_removeClampsToActualStake() public {
        _registerHypercert(1001);

        // Add 30 points
        HypercertSignal[] memory add = new HypercertSignal[](1);
        add[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 30});
        _allocate(voter1, add);

        // Try to remove 50 (more than staked) — should clamp to 30
        HypercertSignal[] memory remove = new HypercertSignal[](1);
        remove[0] = HypercertSignal({hypercertId: 1001, deltaSupport: -50});

        vm.roll(block.number + 1);
        _allocate(voter1, remove);

        assertEq(pool.voterStakes(1001, voter1), 0);
        assertEq(pool.stakedAmounts(1001), 0);
        assertEq(pool.voterUsedPoints(voter1), 0);
    }

    function test_allocate_emitsEvent() public {
        _registerHypercert(1001);

        HypercertSignal[] memory signals = new HypercertSignal[](1);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 50});

        vm.expectEmit(true, true, false, true);
        emit SupportAllocated(voter1, 1001, 50, 50);

        _allocate(voter1, signals);
    }

    function test_allocate_revertsIfNotMember() public {
        _registerHypercert(1001);

        HypercertSignal[] memory signals = new HypercertSignal[](1);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 10});

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(NotEligibleVoter.selector, nonMember));
        pool.allocate(abi.encode(signals), nonMember);
    }

    function test_allocate_revertsIfBudgetExceeded() public {
        _registerHypercert(1001);

        HypercertSignal[] memory signals = new HypercertSignal[](1);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: int256(DEFAULT_POINTS + 1)});

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(PointBudgetExceeded.selector, DEFAULT_POINTS + 1, DEFAULT_POINTS));
        pool.allocate(abi.encode(signals), voter1);
    }

    function test_allocate_revertsIfHypercertNotRegistered() public {
        HypercertSignal[] memory signals = new HypercertSignal[](1);
        signals[0] = HypercertSignal({hypercertId: 9999, deltaSupport: 10});

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(HypercertNotRegistered.selector, 9999));
        pool.allocate(abi.encode(signals), voter1);
    }

    function test_allocate_revertsIfHypercertNotActive() public {
        _registerHypercert(1001);

        // Deregister
        vm.prank(operator);
        pool.deregisterHypercert(1001);

        HypercertSignal[] memory signals = new HypercertSignal[](1);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 10});

        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(HypercertNotActive.selector, 1001));
        pool.allocate(abi.encode(signals), voter1);
    }

    function test_allocate_revertsIfZeroId() public {
        HypercertSignal[] memory signals = new HypercertSignal[](1);
        signals[0] = HypercertSignal({hypercertId: 0, deltaSupport: 10});

        vm.prank(address(allo));
        vm.expectRevert(ZeroHypercertId.selector);
        pool.allocate(abi.encode(signals), voter1);
    }

    function test_allocate_multipleVoters() public {
        _registerHypercert(1001);

        HypercertSignal[] memory s1 = new HypercertSignal[](1);
        s1[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 60});
        _allocate(voter1, s1);

        HypercertSignal[] memory s2 = new HypercertSignal[](1);
        s2[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 40});

        vm.roll(block.number + 1);
        _allocate(voter2, s2);

        assertEq(pool.stakedAmounts(1001), 100); // combined
        assertEq(pool.voterStakes(1001, voter1), 60);
        assertEq(pool.voterStakes(1001, voter2), 40);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                      CONVICTION MATH
    // ═══════════════════════════════════════════════════════════════════

    function test_conviction_growsOverTime() public {
        _registerHypercert(1001);

        HypercertSignal[] memory signals = new HypercertSignal[](1);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 50});
        _allocate(voter1, signals);

        // At block 0 relative to allocation: conviction should be 0 (just allocated)
        uint256 conv0 = pool.calculateConviction(1001);

        // Advance 100 blocks
        vm.roll(block.number + 100);
        uint256 conv100 = pool.calculateConviction(1001);
        assertGt(conv100, conv0, "Conviction should grow over time");

        // Advance 1000 more blocks
        vm.roll(block.number + 1000);
        uint256 conv1100 = pool.calculateConviction(1001);
        assertGt(conv1100, conv100, "Conviction should continue growing");
    }

    function test_conviction_decaysWithoutSupport() public {
        _registerHypercert(1001);

        // Allocate support
        HypercertSignal[] memory add = new HypercertSignal[](1);
        add[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 50});
        _allocate(voter1, add);

        // Build up conviction over 1000 blocks
        vm.roll(block.number + 1000);
        uint256 convBefore = pool.calculateConviction(1001);
        assertGt(convBefore, 0, "Should have conviction after staking");

        // Remove all support
        HypercertSignal[] memory remove = new HypercertSignal[](1);
        remove[0] = HypercertSignal({hypercertId: 1001, deltaSupport: -50});
        _allocate(voter1, remove);

        // Advance — conviction should decay toward 0
        vm.roll(block.number + 10000);
        uint256 convAfter = pool.calculateConviction(1001);
        assertLt(convAfter, convBefore, "Conviction should decay after removing support");
    }

    function test_conviction_converges_to_maxConviction() public {
        _registerHypercert(1001);

        HypercertSignal[] memory signals = new HypercertSignal[](1);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 50});
        _allocate(voter1, signals);

        // Max conviction = amount * D / (D - decay)
        uint256 maxConv = ConvictionsUtils.getMaxConviction(50, DEFAULT_DECAY);

        // Advance a large number of blocks
        vm.roll(block.number + 10_000_000);
        uint256 conv = pool.calculateConviction(1001);

        // Should be very close to max (within 1%)
        assertGt(conv, (maxConv * 99) / 100, "Conviction should converge to max");
        assertLe(conv, maxConv, "Conviction should not exceed max");
    }

    function test_calculateConviction_revertsIfNotRegistered() public {
        vm.expectRevert(abi.encodeWithSelector(HypercertNotRegistered.selector, 9999));
        pool.calculateConviction(9999);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                    CONVICTION WEIGHTS (ORACLE)
    // ═══════════════════════════════════════════════════════════════════

    function test_getConvictionWeights_emptyPool() public view {
        (uint256[] memory ids, uint256[] memory weights) = pool.getConvictionWeights();
        assertEq(ids.length, 0);
        assertEq(weights.length, 0);
    }

    function test_getConvictionWeights_singleHypercert() public {
        _registerHypercert(1001);

        HypercertSignal[] memory signals = new HypercertSignal[](1);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 50});
        _allocate(voter1, signals);

        vm.roll(block.number + 100);

        (uint256[] memory ids, uint256[] memory weights) = pool.getConvictionWeights();
        assertEq(ids.length, 1);
        assertEq(ids[0], 1001);
        assertGt(weights[0], 0);
    }

    function test_getConvictionWeights_excludesInactive() public {
        _registerHypercert(1001);
        _registerHypercert(1002);

        // Deregister 1001
        vm.prank(operator);
        pool.deregisterHypercert(1001);

        (uint256[] memory ids, uint256[] memory weights) = pool.getConvictionWeights();
        assertEq(ids.length, 1);
        assertEq(ids[0], 1002);
    }

    function test_getConvictionWeights_multipleWithDifferentStakes() public {
        _registerHypercert(1001);
        _registerHypercert(1002);

        HypercertSignal[] memory signals = new HypercertSignal[](2);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 70});
        signals[1] = HypercertSignal({hypercertId: 1002, deltaSupport: 30});
        _allocate(voter1, signals);

        vm.roll(block.number + 500);

        (uint256[] memory ids, uint256[] memory weights) = pool.getConvictionWeights();
        assertEq(ids.length, 2);
        // Higher stake should produce higher conviction weight
        assertGt(weights[0], weights[1], "Higher-staked hypercert should have higher conviction");
    }

    // ═══════════════════════════════════════════════════════════════════
    //                      VOTER ALLOCATIONS
    // ═══════════════════════════════════════════════════════════════════

    function test_getVoterAllocations_empty() public view {
        (uint256[] memory ids, uint256[] memory amounts) = pool.getVoterAllocations(voter1);
        assertEq(ids.length, 0);
        assertEq(amounts.length, 0);
    }

    function test_getVoterAllocations_withStakes() public {
        _registerHypercert(1001);
        _registerHypercert(1002);

        HypercertSignal[] memory signals = new HypercertSignal[](2);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 30});
        signals[1] = HypercertSignal({hypercertId: 1002, deltaSupport: 40});
        _allocate(voter1, signals);

        (uint256[] memory ids, uint256[] memory amounts) = pool.getVoterAllocations(voter1);
        assertEq(ids.length, 2);
        assertEq(amounts[0], 30);
        assertEq(amounts[1], 40);
    }

    function test_isEligibleVoter() public view {
        assertTrue(pool.isEligibleVoter(voter1));
        assertTrue(pool.isEligibleVoter(voter2));
        assertFalse(pool.isEligibleVoter(nonMember));
    }

    function test_activeHypercertCount() public {
        assertEq(pool.activeHypercertCount(), 0);

        _registerHypercert(1001);
        _registerHypercert(1002);
        assertEq(pool.activeHypercertCount(), 2);

        vm.prank(operator);
        pool.deregisterHypercert(1001);
        assertEq(pool.activeHypercertCount(), 1);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                     OPERATOR FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function test_deregisterHypercert_success() public {
        _registerHypercert(1001);

        vm.expectEmit(true, true, false, false);
        emit HypercertDeregistered(1001, operator);

        vm.prank(operator);
        pool.deregisterHypercert(1001);

        assertFalse(pool.hypercertActive(1001));
    }

    function test_deregisterHypercert_revertsIfNotRegistered() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(HypercertNotRegistered.selector, 9999));
        pool.deregisterHypercert(9999);
    }

    function test_deregisterHypercert_revertsIfAlreadyInactive() public {
        _registerHypercert(1001);

        vm.prank(operator);
        pool.deregisterHypercert(1001);

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(HypercertNotActive.selector, 1001));
        pool.deregisterHypercert(1001);
    }

    function test_deregisterHypercert_revertsIfNotPoolManager() public {
        _registerHypercert(1001);

        vm.prank(nonMember);
        vm.expectRevert();
        pool.deregisterHypercert(1001);
    }

    function test_setDecay_success() public {
        uint256 newDecay = 9_999_900;

        vm.expectEmit(false, false, false, true);
        emit DecayUpdated(DEFAULT_DECAY, newDecay);

        vm.prank(operator);
        pool.setDecay(newDecay);

        assertEq(pool.decay(), newDecay);
    }

    function test_setDecay_revertsIfZero() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(InvalidDecay.selector, 0));
        pool.setDecay(0);
    }

    function test_setDecay_revertsIfGteD() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(InvalidDecay.selector, D));
        pool.setDecay(D);
    }

    function test_setDecay_revertsIfNotPoolManager() public {
        vm.prank(nonMember);
        vm.expectRevert();
        pool.setDecay(9_999_900);
    }

    function test_setPointsPerVoter_success() public {
        uint256 newPoints = 200;

        vm.expectEmit(false, false, false, true);
        emit PointsPerVoterUpdated(DEFAULT_POINTS, newPoints);

        vm.prank(operator);
        pool.setPointsPerVoter(newPoints);

        assertEq(pool.pointsPerVoter(), newPoints);
    }

    function test_setPointsPerVoter_revertsIfZero() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(InvalidPointsPerVoter.selector, 0));
        pool.setPointsPerVoter(0);
    }

    function test_setPointsPerVoter_revertsIfNotPoolManager() public {
        vm.prank(nonMember);
        vm.expectRevert();
        pool.setPointsPerVoter(200);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                        DISTRIBUTE (NO-OP)
    // ═══════════════════════════════════════════════════════════════════

    function test_distribute_isNoOp() public {
        address[] memory recipients = new address[](0);
        bytes memory data = "";

        vm.prank(address(allo));
        pool.distribute(recipients, data, operator);
        // No revert = success. State unchanged.
    }

    function test_distribute_revertsIfNotAllo() public {
        address[] memory recipients = new address[](0);
        vm.expectRevert();
        pool.distribute(recipients, "", operator);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                     INTEGRATION SCENARIOS
    // ═══════════════════════════════════════════════════════════════════

    function test_fullLifecycle() public {
        // 1. Operator registers 3 hypercerts
        _registerHypercert(1001);
        _registerHypercert(1002);
        _registerHypercert(1003);

        // 2. Voter1 allocates across all three
        HypercertSignal[] memory v1Signals = new HypercertSignal[](3);
        v1Signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 40});
        v1Signals[1] = HypercertSignal({hypercertId: 1002, deltaSupport: 30});
        v1Signals[2] = HypercertSignal({hypercertId: 1003, deltaSupport: 30});
        _allocate(voter1, v1Signals);
        assertEq(pool.voterUsedPoints(voter1), 100);

        // 3. Voter2 focuses on one
        vm.roll(block.number + 10);
        HypercertSignal[] memory v2Signals = new HypercertSignal[](1);
        v2Signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 80});
        _allocate(voter2, v2Signals);

        // 4. Time passes — conviction builds
        vm.roll(block.number + 500);

        // 5. Vault reads conviction weights
        (uint256[] memory ids, uint256[] memory weights) = pool.getConvictionWeights();
        assertEq(ids.length, 3);
        // 1001 has 120 total staked (40 + 80), should dominate
        assertGt(weights[0], weights[1], "1001 should have highest conviction");
        assertGt(weights[0], weights[2], "1001 should beat 1003");

        // 6. Operator deregisters 1003
        vm.prank(operator);
        pool.deregisterHypercert(1003);

        // 7. Weights now exclude 1003
        (uint256[] memory ids2, uint256[] memory weights2) = pool.getConvictionWeights();
        assertEq(ids2.length, 2);

        // 8. Voter1 reallocates away from 1002
        HypercertSignal[] memory realloc = new HypercertSignal[](2);
        realloc[0] = HypercertSignal({hypercertId: 1002, deltaSupport: -30}); // remove from 1002
        realloc[1] = HypercertSignal({hypercertId: 1001, deltaSupport: 30});  // add to 1001
        _allocate(voter1, realloc);

        assertEq(pool.voterStakes(1001, voter1), 70); // 40 + 30
        assertEq(pool.voterStakes(1002, voter1), 0);
        assertEq(pool.voterUsedPoints(voter1), 100); // 100 - 30 + 30 = 100 (net zero change)
    }

    // ═══════════════════════════════════════════════════════════════════
    //                      RECLAIM STAKES
    // ═══════════════════════════════════════════════════════════════════

    function test_reclaimStakes_success() public {
        _registerHypercert(1001);

        // Allocate 60 points
        HypercertSignal[] memory signals = new HypercertSignal[](1);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 60});
        _allocate(voter1, signals);

        assertEq(pool.voterUsedPoints(voter1), 60);
        assertEq(pool.stakedAmounts(1001), 60);

        // Deregister the hypercert
        vm.prank(operator);
        pool.deregisterHypercert(1001);

        // Reclaim stakes
        uint256[] memory ids = new uint256[](1);
        ids[0] = 1001;

        vm.expectEmit(true, true, false, true);
        emit StakesReclaimed(voter1, 1001, 60);

        vm.prank(voter1);
        pool.reclaimStakes(ids);

        assertEq(pool.voterStakes(1001, voter1), 0);
        assertEq(pool.voterUsedPoints(voter1), 0);
        assertEq(pool.stakedAmounts(1001), 0);
    }

    function test_reclaimStakes_revertsIfActive() public {
        _registerHypercert(1001);

        uint256[] memory ids = new uint256[](1);
        ids[0] = 1001;

        vm.prank(voter1);
        vm.expectRevert(abi.encodeWithSelector(HypercertStillActive.selector, 1001));
        pool.reclaimStakes(ids);
    }

    function test_reclaimStakes_noOpIfNoStake() public {
        _registerHypercert(1001);

        vm.prank(operator);
        pool.deregisterHypercert(1001);

        // Reclaim with no prior stake — should succeed silently
        uint256[] memory ids = new uint256[](1);
        ids[0] = 1001;

        vm.prank(voter1);
        pool.reclaimStakes(ids);

        assertEq(pool.voterUsedPoints(voter1), 0);
    }

    function test_reclaimStakes_freesBudgetForNewAllocations() public {
        _registerHypercert(1001);
        _registerHypercert(1002);

        // Use full budget on 1001
        HypercertSignal[] memory signals = new HypercertSignal[](1);
        signals[0] = HypercertSignal({hypercertId: 1001, deltaSupport: int256(DEFAULT_POINTS)});
        _allocate(voter1, signals);

        // Deregister 1001
        vm.prank(operator);
        pool.deregisterHypercert(1001);

        // Can't allocate to 1002 — budget fully consumed
        HypercertSignal[] memory s2 = new HypercertSignal[](1);
        s2[0] = HypercertSignal({hypercertId: 1002, deltaSupport: 10});

        vm.roll(block.number + 1);
        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(PointBudgetExceeded.selector, DEFAULT_POINTS + 10, DEFAULT_POINTS));
        pool.allocate(abi.encode(s2), voter1);

        // Reclaim from 1001
        uint256[] memory ids = new uint256[](1);
        ids[0] = 1001;
        vm.prank(voter1);
        pool.reclaimStakes(ids);

        // Now allocation to 1002 should succeed
        vm.roll(block.number + 1);
        _allocate(voter1, s2);

        assertEq(pool.voterStakes(1002, voter1), 10);
        assertEq(pool.voterUsedPoints(voter1), 10);
    }

    function test_budgetEnforcementAcrossMultipleAllocations() public {
        _registerHypercert(1001);
        _registerHypercert(1002);

        // First allocation uses 80 points
        HypercertSignal[] memory s1 = new HypercertSignal[](1);
        s1[0] = HypercertSignal({hypercertId: 1001, deltaSupport: 80});
        _allocate(voter1, s1);

        // Second allocation tries to add 30 more (total 110 > 100 budget)
        HypercertSignal[] memory s2 = new HypercertSignal[](1);
        s2[0] = HypercertSignal({hypercertId: 1002, deltaSupport: 30});

        vm.roll(block.number + 1);
        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(PointBudgetExceeded.selector, 110, DEFAULT_POINTS));
        pool.allocate(abi.encode(s2), voter1);
    }
}
