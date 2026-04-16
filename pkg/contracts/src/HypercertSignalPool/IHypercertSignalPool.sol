// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @title IHypercertSignalPool
/// @notice Types and events for the HypercertSignalPool strategy.
///         This is a signal-only pool where gardeners allocate conviction
///         to operator-curated hypercerts. No fund distribution — the Octant
///         vault reads conviction weights independently via getConvictionWeights().

struct HypercertSignal {
    uint256 hypercertId;
    int256  deltaSupport;   // positive = add support, negative = remove
}

struct HypercertEntry {
    uint256 hypercertId;
    uint256 stakedAmount;    // total staked across all voters
    uint256 convictionLast;  // last computed conviction
    uint256 blockLast;       // block of last conviction update
    bool    active;
    mapping(address => uint256) voterStakedPoints; // per-voter stakes
}

struct HypercertSignalPoolInitializeParams {
    uint256 decay;                    // alpha decay per block (D = 10^7)
    uint256 pointsPerVoter;           // max support points per voter (e.g. 100)
    address registryCommunity;        // Gardens V2 registry community
    address votingPowerRegistry;      // IVotingPowerRegistry for member checks
}

// ── Events ─────────────────────────────────────────────────────────

event InitializedHypercertSignalPool(uint256 poolId, HypercertSignalPoolInitializeParams params);
event HypercertRegistered(uint256 indexed hypercertId, address indexed registeredBy);
event HypercertDeregistered(uint256 indexed hypercertId, address indexed removedBy);
event SupportAllocated(address indexed voter, uint256 indexed hypercertId, int256 delta, uint256 newStake);
event ConvictionUpdated(uint256 indexed hypercertId, uint256 conviction, uint256 stakedAmount);
event DecayUpdated(uint256 oldDecay, uint256 newDecay);
event PointsPerVoterUpdated(uint256 oldPoints, uint256 newPoints);
event StakesReclaimed(address indexed voter, uint256 indexed hypercertId, uint256 amount);

// ── Errors ─────────────────────────────────────────────────────────

error HypercertAlreadyRegistered(uint256 hypercertId);
error HypercertNotRegistered(uint256 hypercertId);
error HypercertNotActive(uint256 hypercertId);
error NotEligibleVoter(address voter);
error PointBudgetExceeded(uint256 used, uint256 budget);
error InvalidDecay(uint256 decay);
error InvalidPointsPerVoter(uint256 points);
error ZeroHypercertId();
error HypercertStillActive(uint256 hypercertId);
