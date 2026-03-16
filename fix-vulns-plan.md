# Vulnerability Fix Plan (from `scv-scan.md`)

## Scope
- Source of truth: `scv-scan.md` (2026-02-24 report)
- Target area: `pkg/contracts/src/**`
- Objective: remove exploitability for all High/Medium findings first, then Low/Informational hardening.
- Constraint: planning only in this file, no code fixes yet.

## Current Gate Status (after reversing PoC assertions)
- Failing security gates (exploitable path still present in harness/code):
  - `H-1-streaming`: beneficiary update ordering (CEI)
  - `M-2a/M-2b/M-2c`: arithmetic underflow/overflow paths in `PowerManagementUtils`
  - `M-3` (PoC numbering): unbounded unregister gas growth (maps to report M-4 class)
  - `H-3/M-6` class: permissionless rebalance behavior in harness
- Passing gates:
  - `H-1` dispute CEI (fixed)
  - `H-2` decreasePower reentrancy gate currently passes in this branch
  - `M-1` stale arbitrable config gate currently passes in this branch

## Execution Order
1. High severity fixes (`H-1`, `H-2`, `H-3`)
2. Medium severity fixes (`M-1` to `M-6`)
3. Low + Informational hardening (`L-1`, `L-2`, `I-1`, `I-2`)
4. Regression and gas-budget verification

## Detailed Fix Plan

### 1) High Severity

1. `H-1` StreamingEscrow CEI/reentrancy window
- Files:
  - `pkg/contracts/src/CVStrategy/StreamingEscrow.sol`
- Planned changes:
  - Reorder logic to follow CEI where possible around `_setOutflow` interactions.
  - Add reentrancy protection for externally reachable state-changing paths (`setBeneficiary`, `setDisputed`, `syncOutflow` if needed).
  - Ensure callback-observable state cannot be transiently inconsistent.
- Acceptance criteria:
  - During external outflow update, observer cannot read post-update beneficiary/disputed state prematurely.
  - No reentrant path can mutate escrow state inconsistently.

2. `H-2` `decreasePower` reentrancy (carry-over)
- Files:
  - `pkg/contracts/src/RegistryCommunity/facets/CommunityPowerFacet.sol`
- Planned changes:
  - Move `stakedAmount` effects before token transfer.
  - Add reentrancy guard on `decreasePower` (and evaluate neighboring stake mutation methods for consistency).
- Acceptance criteria:
  - Callback-capable token cannot drain more than allowed withdrawal.
  - Minimum stake invariant always preserved.

3. `H-3` rebalance permanent DoS risk (unbounded `proposalCounter` loops)
- Files:
  - `pkg/contracts/src/CVStrategy/facets/CVStreamingFacet.sol`
  - (supporting data-structure updates in strategy storage if required)
- Planned changes:
  - Replace full-range loops with paginated processing (`start/end` or cursor-based batches).
  - Track active streaming proposal set (remove finalized/cancelled entries).
  - Add progress/event telemetry for batch completion and failures.
- Acceptance criteria:
  - Rebalance remains callable under block gas limits as proposal history grows.
  - Historical `proposalCounter` growth cannot permanently brick rebalancing.

### 2) Medium Severity

1. `M-1` stale arbitrable config usage in `rule()`
- Files:
  - `pkg/contracts/src/CVStrategy/facets/CVDisputeFacet.sol`
- Planned changes:
  - Ensure all ruling branches use proposal-scoped `arbitrableConfig` values only.
  - Add explicit regression checks for version bump between proposal creation and ruling.
- Acceptance criteria:
  - Collateral split amounts are invariant to later config-version upgrades.

2. `M-2` arithmetic hazards in `PowerManagementUtils`
- Files:
  - `pkg/contracts/src/CVStrategy/PowerManagementUtils.sol`
- Planned changes:
  - Capped branch: guard `memberPower >= cap` and return 0 instead of underflow.
  - Quadratic branch: replace `totalStake * 10 ** decimal` with checked math (`Math.mulDiv` or equivalent safe multiply path).
  - Quadratic decrease: guard underflow conditions (`newTotalPoints <= currentPoints`) and return bounded result (0 on edge case).
- Acceptance criteria:
  - No panic/unchecked underflow/overflow for adversarial but valid input ranges.

3. `M-3` commented-out overflow checks in conviction math
- Files:
  - `pkg/contracts/src/CVStrategy/ConvictionsUtils.sol`
- Planned changes:
  - Re-enable bounds checks (`TWO_128`) or move to safer arithmetic helpers.
  - Reassess bytecode impact in diamondized deployment context.
- Acceptance criteria:
  - Conviction math cannot overflow silently.

4. `M-4` unbounded loops in member strategy/proposal iteration (+ nested sync loops)
- Files:
  - `pkg/contracts/src/RegistryCommunity/facets/CommunityMemberFacet.sol`
  - `pkg/contracts/src/CVStrategy/facets/CVPowerFacet.sol`
  - `pkg/contracts/src/CVStrategy/facets/CVSyncPowerFacet.sol`
- Planned changes:
  - Introduce configurable caps (`MAX_STRATEGIES_PER_MEMBER`, `MAX_PROPOSALS_PER_VOTER`) and/or paginated APIs.
  - For `batchSyncPower`, enforce bounded batch size and predictable per-call gas.
- Acceptance criteria:
  - User operations cannot be permanently DoS’d by attacker-inflated arrays.

5. `M-5` rebalance partial-failure observability/cooldown interaction
- Files:
  - `pkg/contracts/src/CVStrategy/facets/CVStreamingFacet.sol`
- Planned changes:
  - Emit explicit events for each swallowed `try/catch` failure.
  - Track partial completion state; allow safe follow-up completion path without full cooldown penalty.
- Acceptance criteria:
  - Operators can detect and recover from partial sync failure deterministically.

6. `M-6` permissionless rebalance timestamp griefing
- Files:
  - `pkg/contracts/src/CVStrategy/facets/CVStreamingFacet.sol`
- Planned changes:
  - Add access control (`onlyOwner`, keeper role, or explicit allowlist).
  - Move cooldown timestamp commit to successful completion boundary.
  - If permissionless mode is retained, enforce anti-grief safeguards and full error telemetry.
- Acceptance criteria:
  - Unauthorized callers cannot squat cooldown windows or grief rebalance cadence.

### 3) Low + Informational

1. `L-1` SafeArbitrator payout ordering
- Files:
  - `pkg/contracts/src/SafeArbitrator.sol`
- Planned changes:
  - Ensure `rule()` callback completes before refund transfer.
- Acceptance criteria:
  - No unexpected callback window with pre-callback ETH transfer.

2. `L-2` rounding residual in `_rebalanceProposalStake`
- Files:
  - `pkg/contracts/src/CVStrategy/facets/CVSyncPowerFacet.sol`
- Planned changes:
  - Track cumulative rounding residual and reconcile on final iteration.
- Acceptance criteria:
  - Sum of per-proposal deltas equals target reduction exactly.

3. `I-1` permissionless `syncOutflow()`
- Files:
  - `pkg/contracts/src/CVStrategy/StreamingEscrow.sol`
- Planned changes:
  - Decide explicit model: `onlyStrategy` vs documented permissionless behavior with mitigations.
- Acceptance criteria:
  - Access policy is intentional, documented, and test-covered.

4. `I-2` `assert()` in conviction math path
- Files:
  - `pkg/contracts/src/CVStrategy/CVStrategyBaseFacet.sol`
- Planned changes:
  - Replace `assert` with custom error + explicit validation.
- Acceptance criteria:
  - Failure mode is diagnosable and non-panic.

## Test & Validation Plan
- Unit/regression:
  - Keep `pkg/contracts/test/SecurityPoC.t.sol` as exploitability gate (already inverted).
  - Add focused unit tests per patched function for edge cases and custom errors.
- Invariants:
  - Stake conservation and min-stake invariants for community staking flows.
  - Collateral conservation across dispute lifecycle and config version upgrades.
- Gas:
  - Add gas snapshots for rebalance/unregister/sync batch paths with large-but-valid cardinalities.
  - Define explicit max-gas acceptance thresholds per chain target.

## Rollout Strategy
1. Patch High severity set in a single reviewable PR.
2. Patch Medium set in one or two PRs (math + loop/control-plane split).
3. Patch Low/Info hardening and documentation.
4. Run full `forge test` and security gate subset in CI before merge.
5. Prepare upgrade/deployment checklist for affected diamond facets and proxy components.

## Open Decisions To Finalize Before Implementation
- Rebalance access model: strict keeper/owner vs permissionless-with-guardrails.
- Cap values for member strategies/proposals and batch sizes per network gas profile.
- Whether to standardize on `Math.mulDiv` patterns across all conviction/power math.
