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

## Duplicate and Previously Known Issues

Duplicate reports are not eligible. Before submitting, review:

- GitHub Security Advisories: <https://github.com/1Hive/gardens-v2/security/advisories>
- Security reports in this directory, including `security/scv-scan.md` and `security/final-merged-security-report.md`

Reports with the same root cause as an existing advisory or previously submitted finding are treated as duplicates, even if they use a different PoC or describe a different symptom.

## What Makes a Report Eligible

A strong eligible report should show:

- the affected production contract, network, or app flow;
- the exact unauthorized or unintended action;
- the concrete impact on funds, governance outcome, or protocol integrity;
- reproduction steps or a minimal proof of concept;
- why the issue is not covered by the design assumptions above.
