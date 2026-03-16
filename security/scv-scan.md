# Gardens v2 — SCV Security Audit Report (v2)

**Tool:** [scv-scan](https://github.com/kadenzipfel/scv-scan)
**Scope:** `pkg/contracts/src/` (all Solidity contracts)
**Branch:** `streaming-pool`
**Compiler:** Solidity ^0.8.19
**Date:** 2026-02-24

---

## Changes Since Previous Audit (`diamond-implementation` branch)

| Original Finding | Status on `streaming-pool` |
|-----------------|---------------------------|
| H-1 Reentrancy in `disputeProposal` | ✅ **FIXED** — state updated before external calls |
| H-2 Reentrancy in `decreasePower` | ❌ **UNFIXED** |
| M-1 Wrong `arbitrableConfig` version in `rule()` | ❌ **UNFIXED** |
| M-2 Commented-out overflow bounds in `ConvictionsUtils` | ❌ **UNFIXED** |
| M-3 Unbounded loops over member strategies / proposals | ❌ **UNFIXED** |
| L-1 CEI violation in `cancelProposal` | ✅ **FIXED** — status updated before `withdrawCollateral` |
| L-2 ETH payment before `rule()` in `SafeArbitrator` | ❌ **UNFIXED** |
| I-1 `assert()` in conviction math | ❌ **UNFIXED** |

**New attack surface:** `CVStreamingFacet`, `CVSyncPowerFacet`, `StreamingEscrow`, `StreamingEscrowFactory`, `PowerManagementUtils`, `CVPauseFacet`, `CommunityPauseFacet`

---

## Findings

---

### [H-1] Reentrancy in `StreamingEscrow.setBeneficiary` and `setDisputed` — state updated before Superfluid external calls

**File:** `pkg/contracts/src/CVStrategy/StreamingEscrow.sol`
**Severity:** High

**Description:**
`setBeneficiary` writes `beneficiary = _beneficiary` (state change) before calling `_setOutflow()` twice (external calls into the Superfluid host). `setDisputed` similarly sets `disputed = true/false` before calling `_setOutflow()`. Any Superfluid callback triggered during the outflow update (e.g. `afterAgreementUpdated` on another app) can read the already-updated state while `_setOutflow` has not yet completed, creating an inconsistent window.

**Code:**
```solidity
// setBeneficiary — state before interactions
beneficiary = _beneficiary;                      // ← state updated FIRST
if (!disputed) {
    _setOutflow(0, previous);                   // ← external call 1
    _setOutflow(_currentGDAFlowRate(), _beneficiary); // ← external call 2
}

// setDisputed — same pattern
disputed = true;                                 // ← state updated FIRST
_setOutflow(0, beneficiary);                    // ← external call after
```

**Recommendation:** Move Superfluid calls before the state update, OR apply a `nonReentrant` guard that is shared with the strategy (cross-contract lock). Since Superfluid callbacks (`afterAgreementCreated/Updated/Terminated`) can re-enter the escrow, a reentrancy guard is essential.

---

### [H-2] Reentrancy in `CommunityPowerFacet.decreasePower` — token transfer before state update (CARRY-OVER from v1)

**File:** `pkg/contracts/src/RegistryCommunity/facets/CommunityPowerFacet.sol`
**Severity:** High

**Description:**
Unchanged from the previous audit. `gardenToken.safeTransfer(member, _amountUnstaked)` fires at L168 before `addressToMemberInfo[member].stakedAmount -= _amountUnstaked` at L179. No `nonReentrant` guard is present. A callback-capable token (ERC-777 or any ERC-20 with a recipient hook) allows re-entry before the balance is decremented, enabling drainage of the minimum-stake reserve.

**Proof-of-Concept:** Confirmed via `PoC_H2_DecreasePowerReentrancy` Foundry test on `diamond-implementation` branch (still applies here since the code is unchanged).

**Recommendation:** Move `addressToMemberInfo[member].stakedAmount -= _amountUnstaked` to before the `safeTransfer` call. Add `nonReentrant` to `decreasePower`.

---

### [H-3] Unbounded loops over `proposalCounter` in `rebalance()` — permanent DoS of streaming

**File:** `pkg/contracts/src/CVStrategy/facets/CVStreamingFacet.sol`
**Severity:** High

**Description:**
Both loops in `rebalance()` iterate unconditionally from `1` to `proposalCounter`. `proposalCounter` is monotonically increasing — cancelled and rejected proposals are never removed, they remain in the counter and still cost gas to skip (storage reads + status check). Each active streaming proposal incurs two Superfluid external calls per rebalance:

- **Loop 1:** `superfluidGDA.updateMemberUnits(escrow, units)` — ~80,000–120,000 gas
- **Loop 2:** `_topUpEscrowDepositIfNeeded(escrow)` + `IStreamingEscrowSync(escrow).syncOutflow()` — ~10,000–300,000 gas (depending on whether the flow rate changed)

**Gas benchmark (mock with Superfluid-equivalent call costs):**

| Proposals | Gas/proposal (flows stable) | Gas/proposal (flows changing) |
|---|---|---|
| 50 | ~120,000 | ~360,000 |
| 100 | ~120,000 | ~360,000 |

**Permanent DoS threshold:**

| Chain | Gas limit | Threshold (flows stable) | Threshold (flows changing) |
|---|---|---|---|
| ETH / OP / ARB / Base | 30M | ~250 proposals | ~75 proposals |
| Gnosis Chain | 17M | ~140 proposals | ~42 proposals |

Once `proposalCounter` crosses this threshold, every call to `rebalance()` runs out of gas and reverts. Because OOG reverts the entire transaction (including `setLastRebalanceAt`), the cooldown is not blocked — but the function is permanently uncallable without a contract upgrade, and streaming proportions remain frozen at whatever state was last successfully committed.

**Note on EVM atomicity:** A mid-loop OOG revert *does* roll back `setLastRebalanceAt` (EVM atomicity). The cooldown-lock risk therefore applies only to the partial-completion scenario described in M-5 (silent `try/catch` failures), not to OOG.

**Code:**
```solidity
function rebalance() external {                              // ← see M-6 for auth issue
    setLastRebalanceAt(block.timestamp);

    for (uint256 i = 1; i <= proposalCounter; i++) {        // ← unbounded, grows forever
        // updateMemberUnits: ~80k-120k gas per call
    }
    for (uint256 i = 1; i <= proposalCounter; i++) {        // ← second unbounded loop
        _topUpEscrowDepositIfNeeded(escrow);                 // external call
        try IStreamingEscrowSync(escrow).syncOutflow() {} catch {}  // external call
    }
}
```

**Recommendation:**
- Add `start` / `end` index parameters so callers can paginate over proposals in batches.
- Maintain a separate `activeStreamingProposals` list that removes entries when proposals are finalised, bounding the loop to truly active proposals only.

---

### [M-1] Wrong `arbitrableConfig` version in `rule()` ruling == 2 (CARRY-OVER from v1)

**File:** `pkg/contracts/src/CVStrategy/facets/CVDisputeFacet.sol`
**Severity:** Medium

**Description:**
Unchanged from the previous audit. In the `ruling == 2` path, the code reads `arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount / 2` at lines 159 and 165, while the correct value for the proposal is already cached in `arbitrableConfig` (loaded from `proposal.arbitrableConfigVersion` at line 110). If an admin upgrades the config between proposal creation and dispute resolution, the wrong collateral amount is used for the split.

**Recommendation:** Replace `arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount` with `arbitrableConfig.submitterCollateralAmount` throughout `rule()`.

---

### [M-2] Arithmetic underflow/overflow in `PowerManagementUtils` — Quadratic and Capped modes

**File:** `pkg/contracts/src/CVStrategy/PowerManagementUtils.sol`
**Severity:** Medium

**Description:**
Three arithmetic hazards in the new `PowerManagementUtils` library:

**a) Underflow in `increasePowerCapped` (line 38):**
```solidity
_amountToStake = _pointConfigMaxAmount - memberPower;
// underflows if memberPower > _pointConfigMaxAmount (e.g., from legacy data or a bug)
```

**b) Overflow in Quadratic multiply (line 55 / 98):**
```solidity
uint256 newTotalPoints = Math.sqrt(totalStake * 10 ** decimal);
// totalStake * 10^18 overflows uint256 when totalStake > ~1.15 × 10^59
```

**c) Underflow in `decreasePowerQuadratic` (line 100):**
```solidity
uint256 pointsToDecrease =
    _votingPowerRegistry.getMemberPowerInStrategy(_member, address(this)) - newTotalPoints;
// underflows if sqrt rounding makes newTotalPoints > current points
```

**Recommendation:**
- Check `memberPower < _pointConfigMaxAmount` before subtracting in the Capped branch.
- Use `Math.mulDiv` (OZ) or explicit checked arithmetic before the sqrt to avoid the overflow.
- Guard the quadratic decrease with a `newTotalPoints <= currentPoints` check; return 0 on rounding edge.

---

### [M-3] Commented-out overflow bounds in `ConvictionsUtils._mul` and `_pow` (CARRY-OVER from v1)

**File:** `pkg/contracts/src/CVStrategy/ConvictionsUtils.sol`
**Severity:** Medium

**Description:**
Unchanged. Guards still commented out with `// TODO: Uncomment when contract size fixed with diamond`. Since this branch already uses the diamond pattern, the size constraint is resolved, but the checks remain disabled.

**Recommendation:** Uncomment `if (_a >= TWO_128)` and `if (_b >= TWO_128)` in `_mul` and `_pow`, or replace the multiplication with `Math.mulDiv`.

---

### [M-4] DoS via unbounded loops over member strategies and staked proposals (CARRY-OVER from v1)

**Files:**
- `pkg/contracts/src/RegistryCommunity/facets/CommunityMemberFacet.sol` (`deactivateAllStrategies`)
- `pkg/contracts/src/CVStrategy/facets/CVPowerFacet.sol` (`_withdraw`)

**Severity:** Medium

**Description:**
Unchanged. Both loops remain unbounded and no `MAX_STRATEGIES_PER_MEMBER` or `MAX_PROPOSALS_PER_VOTER` cap was added. Additionally, the new `CVSyncPowerFacet.batchSyncPower(address[] calldata _members)` adds a caller-controlled outer loop, each iteration of which calls `_handlePowerDecrease` which itself iterates over `voterStakedProposals[member]` — creating a **nested unbounded loop** in the new code.

**PoC:** `test_M3_GasScalesWithStrategyCount` (strategies loop) and `test_P3_DeactivateGasScalesWithVotedProposalCount` (`voterStakedProposals` loop) in `pkg/contracts/test/SecurityPoC.t.sol` (both PASSING ✓).

**Recommendation:** Add configurable array caps and expose paginated batch functions.

---

### [M-5] `rebalance()` writes timestamp before loops — cooldown blocks retries after partial failure

**File:** `pkg/contracts/src/CVStrategy/facets/CVStreamingFacet.sol`
**Severity:** Medium

**Description:**
`setLastRebalanceAt(block.timestamp)` is called unconditionally at the start of `rebalance()`. If `wrapIfNeeded()` reverts, or any loop iteration throws an uncaught error, the entire transaction reverts — but since `lastRebalanceAt` was written in the same transaction, **the storage write is also reverted**. This specific risk is actually mitigated by EVM atomicity.

However, if the loops complete but the `try/catch` blocks inside the second loop silently swallow errors, `lastRebalanceAt` is committed with partial state — some escrows did not sync — and the cooldown prevents an immediate correction.

**Recommendation:** Emit an event for every swallowed error inside `try/catch` blocks so that off-chain monitoring can detect partial failures. Alternatively, track a `partiallyRebalanced` flag to allow re-entry during cooldown for completing a prior partial run.

---

### [M-6] `rebalance()` is permissionless — cooldown timestamp griefing

**File:** `pkg/contracts/src/CVStrategy/facets/CVStreamingFacet.sol`
**Severity:** Medium

**Description:**
`rebalance()` carries no access-control modifier. Any externally-owned account can call it at any time. Because `setLastRebalanceAt(block.timestamp)` executes at the top of the function (before the loops), a successful call — even one that does nothing useful — commits the current timestamp and starts the cooldown timer.

**Two concrete griefing vectors:**

1. **Cooldown squatting:** An attacker calls `rebalance()` the moment the cooldown expires, writing `lastRebalanceAt = now`. The legitimate operator (e.g., a keeper bot) then hits `RebalanceCooldownActive` and must wait another full cooldown period. The attacker repeats this every cycle, effectively controlling *when* rebalances happen and blocking timely redistribution of streaming funds.

2. **Partial-sync lock (M-5 interaction):** If the loops complete but `try/catch` blocks silently swallow escrow errors, `lastRebalanceAt` is committed with some escrows out of sync. The cooldown then prevents an immediate corrective rebalance.

**Code:**
```solidity
function rebalance() external {          // ← no onlyOwner / no role check
    if (...cooldown active...) revert;
    setLastRebalanceAt(block.timestamp); // ← committed on any successful entry
    // ...loops...
}
```

**Impact:** Unlike H-3, this attack is exploitable immediately with zero proposals and causes no permanent state damage — only delayed or mistimed rebalances. Funds are not at risk of permanent loss, but streaming proportions can stay stale for as long as the attacker controls the cooldown cadence.

**Recommendation:**
- Restrict `rebalance()` to `onlyOwner`, a keeper role (`onlyKeeper`), or a whitelist set via `setAuthorizedRebalanceCaller`.
- If permissionless rebalance is intentional for decentralisation, at minimum move `setLastRebalanceAt` to *after* the loops complete (using a local variable) and emit an event for every swallowed error.

---

### [M-7] Push-payment DoS in `CollateralVault.withdrawCollateral` — challenger ETH refund permanently locks dispute (CARRY-OVER from v1)

**Files:**
- `pkg/contracts/src/CVStrategy/CollateralVault.sol` (`withdrawCollateral`)
- `pkg/contracts/src/CVStrategy/facets/CVDisputeFacet.sol` (`rule`)

**Severity:** Medium

**Description:**
`withdrawCollateral` sends ETH to the challenger via a direct push-payment (`_recipient.call{value: _amount}`). If the challenger is a contract whose `receive()` reverts, every call to `withdrawCollateral` for that address reverts. Since `rule()` calls `withdrawCollateral` unconditionally for the losing party's collateral, a malicious challenger can permanently prevent dispute resolution: the proposal remains locked in `ProposalStatus.Disputed` indefinitely, its requested funds are frozen, and the arbitrator's ruling can never be applied.

**Attack path:**
1. Deploy a contract that accepts ETH initially but can toggle `receive()` to revert.
2. Register as a community member and dispute a target proposal (pays arbitration cost with ETH acceptance ON).
3. Enable ETH rejection on the attacker contract.
4. The Safe tribunal calls `executeRuling(disputeId, ruling)` → `rule()` → `withdrawCollateral(challenger, amount)` → push-payment reverts.
5. Proposal stays in `Disputed` state permanently; funds cannot be distributed or cancelled.

**PoC:** `test_P2_ETHRejectorChallengerLocksDisputeForever` in `pkg/contracts/test/SecurityPoC.t.sol` (PASSING ✓).

**Recommendation:**
Replace push-payment with a pull-payment pattern:
```diff
- (bool ok,) = _recipient.call{value: _amount}("");
- require(ok, "ETH transfer failed");
+ pendingWithdrawals[_recipient] += _amount;
```
Add a separate `claimCollateral()` function that lets recipients pull their ETH, so a reverting `receive()` only blocks the attacker's own withdrawal, not dispute resolution.

---

### [L-1] `SafeArbitrator.executeRuling` — ETH payment before `rule()` callback (CARRY-OVER from v1)

**File:** `pkg/contracts/src/SafeArbitrator.sol`
**Severity:** Low

**Description:**
Unchanged. `dispute.ruling` and `dispute.status` are correctly set first, but the ETH refund to `msg.sender` fires before `dispute.arbitrated.rule()`. If the tribunal safe has a custom `receive()` that interacts with the arbitrable contract, unexpected side effects could occur during the callback window.

**Recommendation:** Move the ETH payment after `dispute.arbitrated.rule()`.

---

### [L-2] Fixed-point rounding error accumulation in `CVSyncPowerFacet._rebalanceProposalStake`

**File:** `pkg/contracts/src/CVStrategy/facets/CVSyncPowerFacet.sol`
**Severity:** Low

**Description:**
The power-reduction ratio is computed as `balancingRatio = (reductionNeeded << 128) / voterStake`, then applied per proposal as:
```solidity
newStakedPoints = stakedPoints - ((stakedPoints * balancingRatio + (1 << 127)) >> 128);
```
The rounding applied to each proposal's share may accumulate. After iterating over N proposals, the total `stakeDelta` subtracted from proposals can differ from `reductionNeeded` by up to ±N units. The `totalPointsActivated -= _decrease` line uses the raw `_decrease` input to paper over this discrepancy, leaving proposal-level tracking slightly inconsistent with the member-level total.

**Recommendation:** Track an accumulator during the loop and subtract any remaining rounding residual from the last proposal, ensuring `Σ stakeDelta == reductionNeeded` exactly.

---

### [I-1] `syncOutflow()` is permissionless on `StreamingEscrow`

**File:** `pkg/contracts/src/CVStrategy/StreamingEscrow.sol`
**Severity:** Informational

**Description:**
`syncOutflow()` has no access control. Any externally-owned account can call it, re-querying the current GDA flow rate and triggering a Superfluid transfer/flow update. While the function's logic is bounded by contract state (it can only direct flows within configured parameters), a griefing actor could call it repeatedly to consume Superfluid deposit or cause unnecessary state churn. The `rebalance()` already calls it via `try/catch`, so external calls are anticipated.

**Recommendation:** Add `onlyStrategy` if the function is only meant to be called from the strategy, or document the permissionless intent and ensure all state-reading paths handle concurrent callers correctly.

---

### [I-2] `assert()` in conviction math (CARRY-OVER from v1)

**File:** `pkg/contracts/src/CVStrategy/CVStrategyBaseFacet.sol`
**Severity:** Informational

**Description:**
`assert(_proposal.blockLast <= blockNumber)` remains. Prefer a custom error for debuggability.

---

## Summary

| Severity     | Count | Notes |
|--------------|-------|-------|
| High         | 3     | H-1 (new — StreamingEscrow CEI), H-2 (carry-over), H-3 (new — unbounded loop permanent DoS; threshold ~42–250 proposals depending on chain) |
| Medium       | 7     | M-1 (carry-over), M-2 (new — PowerManagementUtils arithmetic), M-3 (carry-over), M-4 (carry-over + new nested loop), M-5 (new — cooldown/partial), M-6 (new — rebalance permissionless, cooldown griefing), M-7 (carry-over — push-payment DoS locks dispute) |
| Low          | 2     | L-1 (carry-over), L-2 (new — rounding) |
| Informational| 2     | I-1 (new), I-2 (carry-over) |
| **Total**    | **14**| |

### Fixed Since Previous Audit
- ~~H-1~~ `disputeProposal` CEI violation — **FIXED**
- ~~L-1~~ `cancelProposal` CEI violation — **FIXED**

---

## Notes on False Positives Discarded

- **`StreamingEscrowFactory.escrows` array growth**: Read-only; no loop over it in hot paths; low practical risk.
- **`uint128` conviction clamping**: Values clamped to `type(uint128).max` distort proportionality only when conviction values are astronomically large; unlikely in practice but worth monitoring.
- **`ProxyOwnableUpgrader.owner()` recursion**: Protected by `try/catch`; cannot cause DoS.
- **Superfluid `onlyHost` callbacks**: The `onlyHost` modifier correctly gates `afterAgreement*` hooks; unauthorized re-entry via callbacks is prevented.
