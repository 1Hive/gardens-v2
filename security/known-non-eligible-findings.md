# Known Non-Eligible Findings

This document lists recurring reports that are generally not eligible for Gardens v2 bug bounty rewards. It is meant to help security researchers avoid duplicate or out-of-scope submissions.

This list is not exhaustive. A report may still be eligible if it demonstrates a concrete production impact that is not covered by the assumptions below.

## Intended Design

### Proposal edits before active support

Proposal creators may edit proposal details while the proposal has no active support.

For funding proposals, the requested amount is intentionally editable until support is added. If all support is later withdrawn, the proposal again has no active support, and requested amount edits are allowed again.

This is not eligible unless the report proves that requested amount can be changed while active support remains on the proposal, or proves another impact outside this intended edit window.

### Early proposal metadata and beneficiary edits

Proposal metadata and beneficiary edits are intentionally allowed during the configured early edit window. Reports about edits that stay within that window are not eligible unless they bypass the intended restrictions or cause an independent production impact.

### Trusted governance and admin actions

Actions that require trusted governance, council, owner, proxy owner, or explicitly authorized admin permissions are not eligible by themselves. Reports must show a privilege bypass, unauthorized access, or a concrete failure mode that affects production users despite the trusted-role assumption.

Council allowlist maintenance through `councilSafe` is part of the trusted pool-management model. The `councilSafe` is typically a community multisig and is expected to maintain pool membership. Reports about accounting inconsistencies in this path are treated as correctness bugs unless they show an untrusted-user trigger, privilege bypass, theft, or unauthorized proposal execution.

### Self-penalizing actions

Reports where the demonstrated attacker primarily harms their own funds, collateral, voting power, or execution path are not eligible unless the report also proves concrete loss, unauthorized state change, or material harm to other users or protocol funds.

## Not Production Reachable

### Hypercert signal pool

`HypercertSignalPool` is not part of the current production Gardens deployment path. Findings that only affect Hypercert signal-pool code are out of production scope unless a report proves that the affected contract is deployed, active, and used by production Gardens flows.

### NFTPowerRegistry

`NFTPowerRegistry` is local/test infrastructure and is not used in production. Findings that rely only on this registry are not eligible unless they also affect a production voting-power registry.

### Custom external voting registry paths

The current dapp-created pools use `RegistryCommunity` as the voting power registry. Findings that require a custom external voting registry, including `CVSyncPowerFacet` paths that are disabled for the internal registry, are not production reachable by default.

Such reports must prove that a production pool uses the affected custom registry path and that the issue affects live funds or governance outcomes.

### Test, mock, and local-only code

Reports against tests, mocks, local scripts, PoC scaffolding, generated local caches, or code that is not deployed to production are not eligible unless they directly cause an exploitable issue in deployed contracts or production infrastructure.

### Unexecuted upgrade payloads and local-only changes

Reports about local code changes, generated transaction-builder files, or planned upgrade payloads are not eligible as deployed-contract vulnerabilities until those changes have been executed onchain.

They may still be useful as code-review feedback before an upgrade, but they are evaluated separately from production vulnerability reports.

## Frontend and Operational Issues

Frontend-only bugs are out of scope unless they can directly cause loss of user funds, unauthorized transactions, or a materially incorrect onchain action that a user cannot reasonably detect before signing.

Operational and CI issues are evaluated case-by-case. A report should demonstrate a realistic path from the issue to production user impact, compromised deployment authority, leaked signing keys, or loss of funds.

### Low-severity hardening

The current bounty policy rewards Medium, High, and Critical findings. Low-severity hardening issues may be acknowledged and fixed, but they are not bounty-eligible unless they demonstrate a higher-impact production consequence.

Examples include limited gas griefing, self-locking collateral recovery gaps, unauthenticated API surfaces without fund loss or unauthorized onchain state changes, and spoofable quota or publish controls that do not cross into a Medium-or-higher impact.

### Recoverable locked funds

Locked-funds reports must account for upgradeability and available recovery mechanisms. If funds are recoverable through an upgrade, rescue, sync, claim, or equivalent recovery path, the maximum severity is generally Medium unless the report proves immediate unrecoverable loss or theft.

### Denial of service

Denial-of-service findings are eligible only when the affected operation can be triggered by untrusted or arbitrary addresses, or when the report demonstrates a concrete production impact beyond trusted-operator action.

### Dispute timeout fallback behavior

The dispute timeout path is an intended fallback when the tribunal does not rule within the configured production ruling window. Default-resolution behavior that restores the proposal and both collaterals is not eligible by itself.

For streaming proposals, reports should distinguish delayed outflow from lost funds. Escrowed streaming balances that remain recoverable through the normal sync or claim path are not treated as permanent loss.

### Streaming escrow recovery paths

Reports about failed SuperApp registration, outflow drift, or disputed streaming state should account for the protocol's recovery paths, including public escrow sync, keeper rebalance sync, stop-stream handling, and strategy drain flows.

Such reports are not eligible as permanent-loss findings unless they show that these recovery paths are unavailable or ineffective in production.

### Incoming versus outgoing Superfluid GDA paths

`connectSuperfluidGDA()` and `disconnectSuperfluidGDA()` manage the strategy contract's membership in an incoming Superfluid GDA pool supplied by the caller. They do not change the strategy's stored outgoing `superfluidGDA`, proposal escrow memberships, GDA member units, or escrow-to-beneficiary streams.

Reports that frame these functions as direct proposal-beneficiary streaming DoS are not eligible as stated. The distinct untrusted interruption of an incoming pool-funding stream is acknowledged as Medium under GHSA-w7jj-264w-wggp and has been restricted to the council safe or authorized keepers; reports with that same root cause are duplicates.

## Duplicate and Previously Known Issues

Duplicate reports are not eligible. Before submitting, review:

- GitHub Security Advisories: <https://github.com/1Hive/gardens-v2/security/advisories>
- Advisory history and bounty decisions: `security/advisory-history.md`
- Security reports in this directory, including `security/scv-scan.md` and `security/final-merged-security-report.md`

Reports with the same root cause as an existing advisory or previously submitted finding are treated as duplicates, even if they use a different PoC or describe a different symptom.

## What Makes a Report Eligible

A strong eligible report should show:

- the affected production contract, network, or app flow;
- the exact unauthorized or unintended action;
- the concrete impact on funds, governance outcome, or protocol integrity;
- reproduction steps or a minimal proof of concept;
- why the issue is not covered by the design assumptions above.
