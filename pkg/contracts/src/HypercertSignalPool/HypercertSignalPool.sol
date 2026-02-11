// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {BaseStrategyUpgradeable} from "../BaseStrategyUpgradeable.sol";
import {ConvictionsUtils} from "../CVStrategy/ConvictionsUtils.sol";
import {IVotingPowerRegistry} from "../interfaces/IVotingPowerRegistry.sol";

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
    NotEligibleVoter,
    PointBudgetExceeded,
    InvalidDecay,
    InvalidPointsPerVoter,
    ZeroHypercertId
} from "./IHypercertSignalPool.sol";

/// @title HypercertSignalPool
/// @notice Allo v2 signal-only pool for conviction voting on hypercert fractions.
///         Gardeners allocate conviction to operator-curated hypercerts.
///         The pool is a read-only oracle — the Octant vault strategy reads
///         conviction weights via getConvictionWeights() and independently
///         buys fractions. distribute() is a no-op.
///
/// @dev Extends Gardens V2's BaseStrategyUpgradeable and reuses ConvictionsUtils
///      for alpha-decay conviction math:
///        conviction(t) = α^t · y₀ + x · (1 - α^t) / (1 - α)
///      where α = decay / D, t = blocks elapsed, y₀ = previous conviction, x = staked amount.
contract HypercertSignalPool is BaseStrategyUpgradeable {
    // ── Constants ────────────────────────────────────────────────────

    /// @notice Precision denominator for decay (10^7), matching ConvictionsUtils.D
    uint256 public constant D = ConvictionsUtils.D;

    // ── Storage ──────────────────────────────────────────────────────

    /// @notice Conviction decay parameter (alpha * D where D = 10^7)
    uint256 public decay;

    /// @notice Maximum support points per voter
    uint256 public pointsPerVoter;

    /// @notice Voting power registry for member eligibility checks
    IVotingPowerRegistry public votingPowerRegistry;

    /// @notice Gardens V2 registry community address
    address public registryCommunity;

    /// @notice Ordered array of all registered hypercert IDs
    uint256[] internal _hypercertIds;

    /// @notice Index lookup: hypercertId => index+1 in _hypercertIds (0 = not registered)
    mapping(uint256 => uint256) internal _hypercertIndex;

    /// @notice Total staked points per hypercert across all voters
    mapping(uint256 => uint256) public stakedAmounts;

    /// @notice Last computed conviction per hypercert
    mapping(uint256 => uint256) public convictionLast;

    /// @notice Block number of last conviction update per hypercert
    mapping(uint256 => uint256) public blockLast;

    /// @notice Active status per hypercert (false = deregistered by operator)
    mapping(uint256 => bool) public hypercertActive;

    /// @notice Per-voter stakes per hypercert: hypercertId => voter => stakedPoints
    mapping(uint256 => mapping(address => uint256)) public voterStakes;

    /// @notice Total points used by each voter across all hypercerts
    mapping(address => uint256) public voterUsedPoints;

    // ══════════════════════════════════════════════════════════════════
    //                        INITIALIZATION
    // ══════════════════════════════════════════════════════════════════

    /// @notice Proxy initializer — called once on deployment.
    /// @param _allo Address of the Allo contract
    /// @param _owner Address of the strategy owner
    function init(address _allo, address _owner) external initializer {
        super.init(_allo, "HypercertSignalPool", _owner);
    }

    /// @notice Pool initializer — called by Allo when pool is created.
    /// @param _poolId The Allo pool ID
    /// @param _data ABI-encoded HypercertSignalPoolInitializeParams
    function initialize(uint256 _poolId, bytes memory _data) external override {
        _checkOnlyAllo();
        __BaseStrategy_init(_poolId);

        HypercertSignalPoolInitializeParams memory params =
            abi.decode(_data, (HypercertSignalPoolInitializeParams));

        if (params.decay == 0 || params.decay >= D) revert InvalidDecay(params.decay);
        if (params.pointsPerVoter == 0) revert InvalidPointsPerVoter(params.pointsPerVoter);

        decay = params.decay;
        pointsPerVoter = params.pointsPerVoter;
        registryCommunity = params.registryCommunity;

        // Default to registryCommunity if no separate votingPowerRegistry provided
        votingPowerRegistry = params.votingPowerRegistry == address(0)
            ? IVotingPowerRegistry(params.registryCommunity)
            : IVotingPowerRegistry(params.votingPowerRegistry);

        _setPoolActive(true);

        emit InitializedHypercertSignalPool(_poolId, params);
    }

    // ══════════════════════════════════════════════════════════════════
    //                   ALLO IStrategy (WRITE)
    // ══════════════════════════════════════════════════════════════════

    /// @notice Register a hypercert as eligible for conviction signaling.
    /// @dev Operator-only. Data encodes: abi.encode(uint256 hypercertId)
    /// @param _data ABI-encoded hypercert token ID
    /// @param _sender The operator/pool manager address
    /// @return recipientId Address derived from hypercertId (Allo compatibility)
    function registerRecipient(bytes memory _data, address _sender)
        external
        payable
        override
        returns (address recipientId)
    {
        _checkOnlyAllo();
        _checkOnlyPoolManager(_sender);

        uint256 hypercertId = abi.decode(_data, (uint256));
        if (hypercertId == 0) revert ZeroHypercertId();
        if (_hypercertIndex[hypercertId] != 0) revert HypercertAlreadyRegistered(hypercertId);

        _hypercertIds.push(hypercertId);
        _hypercertIndex[hypercertId] = _hypercertIds.length; // 1-indexed
        hypercertActive[hypercertId] = true;
        blockLast[hypercertId] = block.number;

        recipientId = address(uint160(hypercertId));

        emit HypercertRegistered(hypercertId, _sender);
    }

    /// @notice Allocate conviction support to hypercerts.
    /// @dev Voter must be a member of the registry community.
    ///      Data encodes: abi.encode(HypercertSignal[])
    /// @param _data ABI-encoded array of HypercertSignal structs
    /// @param _sender The voter's address
    function allocate(bytes memory _data, address _sender) external payable override {
        _checkOnlyAllo();
        _checkOnlyActivePool();

        if (!votingPowerRegistry.isMember(_sender)) revert NotEligibleVoter(_sender);

        HypercertSignal[] memory signals = abi.decode(_data, (HypercertSignal[]));
        uint256 currentUsed = voterUsedPoints[_sender];

        for (uint256 i = 0; i < signals.length;) {
            uint256 hcId = signals[i].hypercertId;
            int256 delta = signals[i].deltaSupport;

            if (hcId == 0) revert ZeroHypercertId();
            if (_hypercertIndex[hcId] == 0) revert HypercertNotRegistered(hcId);
            if (!hypercertActive[hcId]) revert HypercertNotActive(hcId);

            // Update conviction before changing stakes
            _updateConviction(hcId);

            // Apply delta to voter's stake
            uint256 voterCurrent = voterStakes[hcId][_sender];
            uint256 newStake;

            if (delta > 0) {
                uint256 increase = uint256(delta);
                newStake = voterCurrent + increase;
                currentUsed += increase;
                stakedAmounts[hcId] += increase;
            } else {
                uint256 decrease = uint256(-delta);
                // Clamp removal to actual stake
                if (decrease > voterCurrent) {
                    decrease = voterCurrent;
                }
                newStake = voterCurrent - decrease;
                currentUsed -= decrease;
                stakedAmounts[hcId] -= decrease;
            }

            voterStakes[hcId][_sender] = newStake;

            emit SupportAllocated(_sender, hcId, delta, newStake);

            unchecked { ++i; }
        }

        // Check point budget after all allocations
        if (currentUsed > pointsPerVoter) revert PointBudgetExceeded(currentUsed, pointsPerVoter);
        voterUsedPoints[_sender] = currentUsed;
    }

    /// @notice No-op. This is a signal pool — distribution is handled by the vault.
    function distribute(address[] memory, bytes memory, address) external view override {
        _checkOnlyAllo();
        // Signal pool — no fund distribution
    }

    /// @notice Signal pool holds no funds.
    /// @return Always 0
    function getPoolAmount() external pure override returns (uint256) {
        return 0;
    }

    // ══════════════════════════════════════════════════════════════════
    //                      OPERATOR FUNCTIONS
    // ══════════════════════════════════════════════════════════════════

    /// @notice Deregister a hypercert from the signal pool.
    /// @dev Operator-only. Does not erase conviction data — just marks inactive.
    ///      Existing stakes remain but no new support can be allocated.
    /// @param _hypercertId The hypercert token ID to deregister
    function deregisterHypercert(uint256 _hypercertId) external {
        _checkOnlyPoolManager(msg.sender);
        if (_hypercertIndex[_hypercertId] == 0) revert HypercertNotRegistered(_hypercertId);
        if (!hypercertActive[_hypercertId]) revert HypercertNotActive(_hypercertId);

        // Snapshot conviction before deactivation
        _updateConviction(_hypercertId);
        hypercertActive[_hypercertId] = false;

        emit HypercertDeregistered(_hypercertId, msg.sender);
    }

    /// @notice Update the decay parameter.
    /// @param _decay New decay value (must be > 0 and < D)
    function setDecay(uint256 _decay) external {
        _checkOnlyPoolManager(msg.sender);
        if (_decay == 0 || _decay >= D) revert InvalidDecay(_decay);

        uint256 oldDecay = decay;
        decay = _decay;

        emit DecayUpdated(oldDecay, _decay);
    }

    /// @notice Update the points-per-voter budget.
    /// @param _pointsPerVoter New points per voter value (must be > 0)
    function setPointsPerVoter(uint256 _pointsPerVoter) external {
        _checkOnlyPoolManager(msg.sender);
        if (_pointsPerVoter == 0) revert InvalidPointsPerVoter(_pointsPerVoter);

        uint256 oldPoints = pointsPerVoter;
        pointsPerVoter = _pointsPerVoter;

        emit PointsPerVoterUpdated(oldPoints, _pointsPerVoter);
    }

    // ══════════════════════════════════════════════════════════════════
    //               READ FUNCTIONS (VAULT ORACLE INTERFACE)
    // ══════════════════════════════════════════════════════════════════

    /// @notice Get real-time conviction for a hypercert, applying decay since last update.
    /// @param _hypercertId The hypercert token ID
    /// @return conviction The current conviction value
    function calculateConviction(uint256 _hypercertId) external view returns (uint256 conviction) {
        if (_hypercertIndex[_hypercertId] == 0) revert HypercertNotRegistered(_hypercertId);

        uint256 timePassed = block.number - blockLast[_hypercertId];
        conviction = ConvictionsUtils.calculateConviction(
            timePassed,
            convictionLast[_hypercertId],
            stakedAmounts[_hypercertId],
            decay
        );
    }

    /// @notice Get all conviction weights for active hypercerts.
    /// @dev Primary read target for the Octant vault strategy.
    ///      Returns real-time conviction (applies decay since last on-chain update).
    /// @return hypercertIds Array of active hypercert IDs
    /// @return weights Array of corresponding conviction weights
    function getConvictionWeights()
        external
        view
        returns (uint256[] memory hypercertIds, uint256[] memory weights)
    {
        // Count active hypercerts
        uint256 activeCount = 0;
        for (uint256 i = 0; i < _hypercertIds.length;) {
            if (hypercertActive[_hypercertIds[i]]) {
                unchecked { ++activeCount; }
            }
            unchecked { ++i; }
        }

        hypercertIds = new uint256[](activeCount);
        weights = new uint256[](activeCount);

        uint256 idx = 0;
        for (uint256 i = 0; i < _hypercertIds.length;) {
            uint256 hcId = _hypercertIds[i];
            if (hypercertActive[hcId]) {
                hypercertIds[idx] = hcId;
                uint256 timePassed = block.number - blockLast[hcId];
                weights[idx] = ConvictionsUtils.calculateConviction(
                    timePassed,
                    convictionLast[hcId],
                    stakedAmounts[hcId],
                    decay
                );
                unchecked { ++idx; }
            }
            unchecked { ++i; }
        }
    }

    /// @notice Get a voter's support allocations across all hypercerts.
    /// @param _voter The voter address
    /// @return hypercertIds Array of hypercert IDs with non-zero stakes
    /// @return amounts Array of corresponding staked amounts
    function getVoterAllocations(address _voter)
        external
        view
        returns (uint256[] memory hypercertIds, uint256[] memory amounts)
    {
        // Count non-zero allocations
        uint256 count = 0;
        for (uint256 i = 0; i < _hypercertIds.length;) {
            if (voterStakes[_hypercertIds[i]][_voter] > 0) {
                unchecked { ++count; }
            }
            unchecked { ++i; }
        }

        hypercertIds = new uint256[](count);
        amounts = new uint256[](count);

        uint256 idx = 0;
        for (uint256 i = 0; i < _hypercertIds.length;) {
            uint256 hcId = _hypercertIds[i];
            uint256 stake = voterStakes[hcId][_voter];
            if (stake > 0) {
                hypercertIds[idx] = hcId;
                amounts[idx] = stake;
                unchecked { ++idx; }
            }
            unchecked { ++i; }
        }
    }

    /// @notice Get all registered hypercert IDs (including inactive).
    function getRegisteredHypercerts() external view returns (uint256[] memory) {
        return _hypercertIds;
    }

    /// @notice Check if an address is an eligible voter.
    /// @param _account The address to check
    /// @return True if the address is a member of the registry community
    function isEligibleVoter(address _account) external view returns (bool) {
        return votingPowerRegistry.isMember(_account);
    }

    /// @notice Get the count of active hypercerts.
    function activeHypercertCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < _hypercertIds.length;) {
            if (hypercertActive[_hypercertIds[i]]) {
                unchecked { ++count; }
            }
            unchecked { ++i; }
        }
    }

    // ══════════════════════════════════════════════════════════════════
    //                           INTERNAL
    // ══════════════════════════════════════════════════════════════════

    /// @notice Update conviction for a hypercert using ConvictionsUtils alpha decay formula.
    /// @dev Called before any stake change to snapshot the current conviction.
    /// @param _hypercertId The hypercert to update
    function _updateConviction(uint256 _hypercertId) internal {
        uint256 timePassed = block.number - blockLast[_hypercertId];
        if (timePassed == 0) return;

        uint256 newConviction = ConvictionsUtils.calculateConviction(
            timePassed,
            convictionLast[_hypercertId],
            stakedAmounts[_hypercertId],
            decay
        );

        convictionLast[_hypercertId] = newConviction;
        blockLast[_hypercertId] = block.number;

        emit ConvictionUpdated(_hypercertId, newConviction, stakedAmounts[_hypercertId]);
    }
}
