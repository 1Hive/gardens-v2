# Codex Security Scan Triage

Date: 2026-06-12
Source: `/home/corantin/Downloads/codex-security-findings-2026-06-11T22-52-53.542Z.csv`

This is the working triage for the 19 Codex security scan findings. It separates production-reachable issues from design-intended, duplicate, local-only, or non-production findings.

## Summary

| Status | Count | Findings |
| --- | ---: | --- |
| Open / needs fix or proof | 5 | GoodDollar whitelist, escrow buffer drain, E2E secrets, zero active-points execution, ProxyOwner upgrade access |
| Operational review | 2 | Optimism Safe payload, agent wallet-import skill |
| Fixed locally | 3 | proposal cap DoS, streaming storage shift, pool join wrong community |
| Not eligible / not production reachable | 7 | Hypercert, NFTPowerRegistry, custom external registry, CVSyncPower custom paths, transferable NFT reuse, proposal edit design, stale registry sync under current dapp config |
| Needs more production-config proof | 2 | saturating deactivate, custom NFT allowlist bypass |

## Open / Needs Fix Or Proof

### GoodDollar root check bypasses sybil whitelist

Status: Open.

Current code treats a non-zero GoodDollar root as sufficient. The finding remains eligible if GoodDollar membership should require the SDK whitelist result or the connected address to match the approved root identity.

Next step: change validation to require the intended GoodDollar whitelist semantics and add tests around root/non-root cases.

### Escrow buffer top-ups are paid out as excess funds

Status: Open.

The strategy tops escrow balances to `depositAmount + 50 bps`, while `StreamingEscrow._drainExcessToBeneficiary()` reserves only `depositAmount()`. The buffer can still be treated as excess.

Next step: make the escrow reserve match the strategy buffer target, or remove the buffer top-up if it is not needed.

### E2E workflow exposes secrets to PR-controlled code

Status: Open operational issue.

`.github/workflows/e2e.yml` runs on `pull_request` and exposes wallet/Vercel secrets at job scope. Even if the Vercel token is read-only, the wallet seed is not safe to expose to PR-controlled install/test code.

Next step: step-scope secrets only to trusted pre-check steps, avoid running secret-bearing jobs on untrusted PR code, or move the job behind protected GitHub environments.

### Deactivated voters can execute funded proposals

Status: Open / needs focused PoC.

The `totalPointsActivated == 0` guard in distribution remains commented. A report is eligible if conviction can remain above a zero or low threshold after all governance points are deactivated, allowing execution without active governance power.

Next step: add an inverted PoC that must pass only when execution reverts with no active governance points.

### Upgrade delegate becomes full protocol owner

Status: Open architecture review.

`ProxyOwner.owner()` resolves to `upgradeAccess` when set. Any downstream `onlyOwner` check that resolves through `owner()` may grant broader powers than upgrade-only access.

Next step: split "upgrade authority" from "owner authority" so delegated upgrade access cannot pass unrelated owner checks.

## Operational Review

### Optimism Safe payload masks live strategy upgrade

Status: Operational review.

This is not a deployed-contract vulnerability by itself unless the payload has been executed or submitted for execution with unintended calldata.

Next step: verify the exact Safe payload intent against `config/networks.json` and live implementation addresses before execution.

### Agent skill imports wallet keys in untrusted terminals

Status: Process hardening.

This is not a protocol exploit. The concern is valid only if agents run wallet import flows in untrusted terminals or with unreviewed commands.

Next step: keep proposal-creation skills preparation-first by default and require explicit local execution approval before keystore import or transaction signing.

## Fixed Locally

### Lifetime proposal cap enables permanent pool proposal DoS

Status: Fixed locally.

The proposal cap now uses `activeProposalCount` instead of lifetime `proposalCounter`, and terminal proposal paths decrement the active count.

Regression coverage exists in `pkg/contracts/test/no-coverage/SecurityPoC.t.sol`.

### Streaming escrow storage shift loses existing escrows

Status: Fixed locally.

`CVStreamingStorage.Layout` no longer inserts a field before `proposalEscrow`, preserving the mapping at the deployed namespaced slot.

Verification:

```bash
./pkg/contracts/scripts/verify-storage-layout.sh --path pkg/contracts/src/CVStrategy --verbose
forge build --contracts pkg/contracts/src/CVStrategy/CVStreamingStorage.sol
```

### Pool join prompt can register users in attacker community

Status: Fixed in current frontend code.

The pool page now feeds membership and `RegisterMember` with the resolved `strategy.registryCommunity.id`, not only the route `_community` parameter.

## Not Eligible / Not Production Reachable

### Submitter can redirect active proposal payouts after votes

Status: Not eligible as reported.

Proposal edits before active support are intended design. Requested amount edits are blocked while active support exists. If all support is withdrawn, the proposal returns to a no-support edit state by design.

### Hypercert stale member allocations

Status: Out of production scope.

`HypercertSignalPool` is not current production Gardens code.

### NFTPowerRegistry and transferable NFT reuse

Status: Out of production scope by default.

`NFTPowerRegistry` is local/test infrastructure and is not used in production.

### Registry deactivation leaves stale sync power

Status: Not production reachable under current dapp config.

The current dapp uses `RegistryCommunity` as `votingPowerRegistry`, and `CVSyncPowerFacet` explicitly disables sync functions when the internal registry is used.

### Inactive NFT sync corrupts activated voting power

Status: Not production reachable under current dapp config.

This requires the external custom voting registry / sync path, which is disabled for the internal `RegistryCommunity` registry.

### Custom NFT registry bypasses pool allowlists

Status: Needs production-config proof.

The current dapp-created pool path uses `RegistryCommunity` as the voting registry. A report must prove a live production pool uses the affected external custom registry path and that the allowlist bypass affects that pool.

### Saturating deactivate can zero activated voting power

Status: Needs production-config proof.

This depends on a mismatch between live voting-registry power and strategy-accounted activated power. Under the current internal registry path, power updates are expected to keep `totalPointsActivated` synchronized. A report should prove the mismatch is reachable in production.

## Public Bounty Guidance

See `security/known-non-eligible-findings.md` for public-facing guidance on intended-design, non-production, duplicate, and out-of-scope report categories.
