# Advisory History

This document records Gardens v2 security advisories and bounty decisions that have already been acknowledged by Core Contributors. It is intended to help researchers and automated agents avoid duplicate reports, stale findings, and issues that were already classified.

This ledger is not a replacement for private GitHub Security Advisories. If a report demonstrates a materially different root cause, a new production impact, or exploitability that is not covered by the notes below, it may still be eligible for review.

## How To Use This File

- Search this file before opening a new report.
- Treat matching root causes as duplicates, even if a new report uses different reproduction steps or a different symptom.
- Check `security/known-non-eligible-findings.md` for recurring intended-design, local-only, and out-of-production-scope categories.
- When in doubt, include why the new report is different from the closest entry below.

## Advisory Decisions

| Advisory | Decision | Severity | Status | Component | Root cause / duplicate guidance |
| --- | --- | --- | --- | --- | --- |
| [GHSA-f2mf-mf7h-6jqv](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-f2mf-mf7h-6jqv) | Partially eligible | 3 Medium findings accepted; other findings rejected or out of scope | Patched where accepted | `CVProposalFacet`, `CVPowerFacet`, proposal lifecycle | Bundle contained several `GDN-*` reports. `GDN-01`, `GDN-02`, and `GDN-05` were treated as eligible Medium governance/liveness findings. Requested-amount edits with no active support are intended design. `NFTPowerRegistry` and custom external registry / `CVSyncPowerFacet` paths are not production reachable by default. Trusted admin-only actions are not eligible without a privilege bypass or independent production impact. |
| [GHSA-jwvq-5xmf-f377](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-jwvq-5xmf-f377) | Eligible | High | Patched / upgraded | `StreamingEscrow` cancellation and claim flow | Streaming escrow buffer funds could be claimed by the beneficiary after cancellation instead of returning to the pool. This was classified High because the issue could drain pool-funded escrow buffer amounts through a repeatable flow. |
| [GHSA-3xpr-2mm7-77j7](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-3xpr-2mm7-77j7) | Eligible | High | Patched / upgraded | `StreamingEscrow` dispute resolution | Approve-side dispute resolution for streaming proposals could transfer active escrow reserve funds to the beneficiary. Reports with the same escrow-reserve drain root cause are duplicates. |
| [GHSA-jxgc-cgfq-436j](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-jxgc-cgfq-436j) | Eligible | High | Patched / upgraded | `StreamingEscrow.syncOutflow()` | `syncOutflow()` could drain excess funds to the beneficiary while the escrow was disputed, bypassing the intended dispute lock. Duplicate reports include alternate paths that rely on draining beneficiary-payable excess during an active dispute. |
| [GHSA-wq6c-6p68-3m25](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-wq6c-6p68-3m25) | Eligible | Medium | Patched / upgraded | `CVAllocationFacet.distribute()` | `distribute()` accepted unsupported proposal types before the funding-only guard. Classified Medium because the impact was protocol-state / governance-flow integrity rather than direct theft of all pool funds. Current code should reject non-funding and streaming distributions with `ProposalTypeNotSupported`. |
| [GHSA-22hv-jcwr-j733](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-22hv-jcwr-j733) | Eligible / previously known internally | Medium | Risk acknowledged; fix may be deferred depending on branch | Conviction threshold / activated-points accounting | Partial power decrease could lower the threshold while same-block conviction remained frozen, allowing execution that would otherwise be below threshold. Full deactivation and partial deactivation are related but distinct paths; reports should prove a new production-reachable path not covered by this advisory. Pools with effective `minThresholdPoints` may be less exposed, but this does not automatically make all threshold-drop variants ineligible. |
| [GHSA-942w-gjvj-mrrf](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-942w-gjvj-mrrf) | Eligible | Medium | Patched / upgraded | `CVProposalFacet.editProposal()` and conviction state | Requested amount could be changed after support withdrawal while stale conviction state remained. The accepted fix condition was to require both requested amount and conviction state to be zero before allowing the edit. Classified Medium because it affected proposal execution integrity and required governance-state preconditions, not direct theft of pool funds. Plain proposal requested-amount edits while there is no active support remain intended design unless stale conviction or another independent impact is proven. |
| [GHSA-qpr5-mcg9-v98x](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-qpr5-mcg9-v98x) | Eligible | Medium | Fix in review; deployment pending | Conviction threshold / `totalPointsActivated` snapshot | A proposal threshold could be pinned to a short-lived activated-points spike because the threshold basis used a monotonic maximum snapshot. The accepted remediation checkpoints a per-proposal threshold snapshot and decays decreases with the same factor as conviction. A one-time UUPS migration initializes these fields for existing proposals from the pool's current active points. Duplicate reports should show a distinct threshold-manipulation path not covered by this decay and migration. |
| [GHSA-65m9-93h5-2hm3](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-65m9-93h5-2hm3) | Not eligible | Informational / defense in depth | Closed | `CVAllocationFacet.distribute()` | The reported CEI ordering concern observes `Executed` status during external calls, but `distribute()` is gated through Allo and failed calls revert the full transaction. Reports that only describe transient same-transaction status observation, without a concrete unauthorized reentrant action or durable state impact, are not eligible. |
| [GHSA-9h7v-8r4x-g5x5](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-9h7v-8r4x-g5x5) | Not bounty-eligible | Low | Acknowledged; recovery hardening may be considered | `CVDisputeFacet`, `CollateralVault` | Collateral payout to a native-token-rejecting recipient can fail while dispute resolution continues, leaving a recovery gap. The demonstrated path primarily self-locks the challenger collateral and does not drain pool funds or other users' assets, so it was reduced to Low. Low-severity findings are not covered by the current bounty policy. |
| [GHSA-g52x-729j-w9pj](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-g52x-729j-w9pj) | Not bounty-eligible / intended fallback behavior | Low / Informational | Acknowledged | `CVDisputeFacet`, streaming dispute timeout | The timeout path is an intended fallback when the tribunal does not rule within the production ruling window. For `defaultRuling == 1`, restoring the proposal and both collaterals matches the intended abstain/default-resolution behavior. Streaming funds remain in the escrow during dispute and are recoverable through the normal sync/claim path, so reports that frame this as a free perpetual streaming DoS are not eligible unless they prove unrecoverable loss or a bypass of the arbitrator ruling window. |
| [GHSA-mcww-c424-9jrv](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-mcww-c424-9jrv) | Not eligible as claimed | Informational / defense in depth | Acknowledged | `StreamingEscrowFactory`, `StreamingEscrow`, `CVStreamingFacet` | The factory can tolerate SuperApp registration failure, but the reported permanent-loss framing is defeated by equivalent sync and recovery paths: public escrow sync, rebalance sync fallback, stop-stream handling, and strategy drain paths. Reports about failed SuperApp registration should identify a production path where those recovery mechanisms are unavailable or ineffective. |
| [GHSA-qc96-747c-78w9](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-qc96-747c-78w9) | Not bounty-eligible / trusted maintenance bug | Informational / correctness bug | Acknowledged; consistency fix may be considered | `CVAdminFacet._withdraw()`, council allowlist maintenance | The admin member-removal path can diverge from the normal member deactivation checkpointing logic, but the affected action requires `councilSafe` privileges through `setPoolParams()`. The `councilSafe` is already trusted to maintain the allowlist and is typically a community multisig. Reports about this path are not eligible unless they show an untrusted-user path, privilege bypass, theft, or unauthorized proposal execution. |
| [GHSA-cj2m-c9x5-54m3](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-cj2m-c9x5-54m3) | Partially eligible | 1 Medium accepted; Low findings not bounty-eligible | Acknowledged; hardening tracked where relevant | Keeper/API routes and production facet inventory | The unauthenticated Passport write-score relay was accepted as a Medium operational-gas risk. GoodDollar validity relay, Ably publish capability, and IPFS pin proxy issues were treated as Low hardening items. The production facet-lag claim was not eligible as stated where current streaming-pool facets cover the affected streaming logic. Bounty eligibility is limited to the accepted Medium finding; Low findings are not covered by the current bounty policy. |
| [GHSA-w7jj-264w-wggp](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-w7jj-264w-wggp) | Eligible for narrowed incoming-stream impact | Medium | Fixed in current branch; deployment pending | `CVAdminFacet.connectSuperfluidGDA()`, `CVAdminFacet.disconnectSuperfluidGDA()` | The submitted claim that these functions halt outgoing proposal-beneficiary streams is not valid: they manage whether the strategy accepts funds from a caller-supplied incoming Superfluid GDA pool. However, allowing an untrusted pool member to disconnect that incoming stream can disrupt pool funding and operations, so that narrower denial-of-service impact was accepted as Medium. `connectSuperfluidGDA()` remains callable by pool action users and `RegistryFactory.isAuthorizedWallet()` keepers, while `disconnectSuperfluidGDA()` is restricted to the council safe or authorized keepers. Reports with the same incoming-stream disconnection root cause are duplicates. |
| [GHSA-p4gf-5qrj-mhh4](https://github.com/1Hive/gardens-v2/security/advisories/GHSA-p4gf-5qrj-mhh4) | Eligible merged report | 2 High + 8 Medium accepted in bounty proposal | Patched / tracked through merged security work | Multiple contracts | Consolidated disclosure covering reentrancy, streaming rebalance DoS, dispute/collateral issues, overflow hardening, and related governance/streaming defects. Duplicate reports should be matched by root cause against `security/final-merged-security-report.md` and the advisory rather than by finding title alone. |

## Non-Eligible Or Reduced-Severity Patterns From These Advisories

### Requested Amount Edits Without Active Support

Proposal creators may edit funding proposal requested amounts while there is no active support. This includes the state after all support has been withdrawn. This behavior is intended unless the report also proves stale conviction, active-support bypass, or another independent production impact.

### Funding-Only Distribution

`CVAllocationFacet.distribute()` is intended for funding pools. Reports that require distribution execution in signaling or streaming pools should first prove the current deployed code does not revert for unsupported proposal types.

### Custom Voting Registry / `CVSyncPowerFacet`

The current dapp-created pools use `RegistryCommunity` as the voting power registry. Reports that require custom external voting registries or `CVSyncPowerFacet` paths are not production reachable by default. A report must identify a live production pool using that path and demonstrate impact.

### Local, Test, Or Deprecated Contracts

`NFTPowerRegistry`, `HypercertSignalPool`, tests, mocks, and local-only upgrade payloads are not production vulnerabilities by themselves. They may be useful code-review feedback, but they are not eligible unless tied to deployed production behavior.

### Trusted Admin Actions

Admin, council, proxy-owner, tribunal, or other explicitly trusted-role actions are not eligible by themselves. A valid report must show unauthorized access, privilege bypass, or a concrete user-impacting failure despite the trusted-role assumption.

Council allowlist maintenance through `councilSafe` is a trusted governance operation. The `councilSafe` is expected to maintain pool membership and is typically a community multisig. Reports about unintended accounting side effects in that path are treated as correctness bugs unless they demonstrate an untrusted-user trigger, privilege bypass, theft, or unauthorized proposal execution.

### Low-Severity Hardening

The current bounty table rewards Medium, High, and Critical findings. Low-severity hardening items, including limited operational gas griefing, self-locking recovery gaps, and API abuse paths without fund loss or unauthorized onchain state changes, may still be acknowledged but are not bounty-eligible.

### Dispute Timeout Fallbacks

The dispute timeout path is an intended fallback for cases where the tribunal does not rule within the configured production ruling window. Reports that rely on the default-resolution path being cheaper than an explicit ruling must prove unrecoverable loss, a bypass of the arbitrator ruling window, or another impact beyond delayed resolution and recoverable escrow balances.

### Equivalent Streaming Recovery Paths

Reports about streaming escrow registration, outflow drift, or paused/disputed streaming state should account for the available sync and recovery paths, including public escrow sync, keeper rebalance sync, stop-stream handling, and strategy drain flows. A report is not eligible as a permanent-loss finding unless it proves those paths are unavailable or ineffective in production.

### Incoming Versus Outgoing Superfluid GDA Paths

`connectSuperfluidGDA()` and `disconnectSuperfluidGDA()` manage the strategy contract's membership in an incoming Superfluid GDA pool supplied by the caller. They do not change the strategy's stored outgoing `superfluidGDA`, proposal escrow memberships, GDA member units, or escrow-to-beneficiary streams.

Reports that frame these functions as direct proposal-beneficiary streaming DoS are not eligible as stated. The distinct untrusted interruption of an incoming pool-funding stream is acknowledged as Medium under GHSA-w7jj-264w-wggp and has been restricted to the council safe or authorized keepers; reports with that same root cause are duplicates.

## Related Documents

- `SECURITY.md`
- `security/known-non-eligible-findings.md`
- `security/codex-security-scan-triage-2026-06-12.md`
- `security/final-merged-security-report.md`
- `security/scv-scan.md`
