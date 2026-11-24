---
name: advisory-triage-remediation
description: Triage Gardens v2 security advisories against policy and full historical context, coordinate private replies and Moderate bounties, fix accepted findings with regression tests, and monitor the disclosure-order proposal queue. Use for advisory eligibility, duplicate, severity, remediation, and bounty work.
user-invocable: true
---

# Gardens Advisory Triage and Remediation

## Authority and safety

- Private GitHub Security Advisories are the source of truth for report content, submission time, reporter replies, and disclosure state. The on-chain pool is the source of truth for proposal state, beneficiary, support, conviction, threshold, and payment. The advisory board is a view of those facts, not a substitute for them.
- Keep unpatched exploit details in the private advisory. Do not put them in public issues, public documentation, commit messages, a public branch, or a PR before disclosure is approved or production is protected.
- You may independently close clear duplicates and non-eligible reports with a reasoned reply. You may accept and prepare a policy-compliant Moderate **non-fund-loss** bounty when evidence is complete. Escalate contested decisions, High/Critical reward commitments, and every eligible direct fund-loss reward to the user.
- Bounty eligibility and remediation are separate decisions. A validated security defect in an out-of-scope surface, including the web app, still needs a concrete fix with regression coverage proposed in a PR or pushed to an existing remediation branch. A duplicate should inherit the original root cause's fix plan, not receive a redundant patch.
- Do not merge PRs, upgrade production contracts, publish advisories, support or execute proposals, or make a second payout automatically. A source patch, a passing test, a deployed implementation, and an upgraded live proxy are different states.

## Source map

Read the authoritative sources first. Search all relevant GitHub advisories, including private drafts, closed and published entries, their comments, and original report timestamps. Paginate the API results; do not assume the first page is the whole history.

| Role | Source |
| --- | --- |
| Bounty scope, severity and reward policy | [Security Policy](../../SECURITY.md), at the revision published on `main` when the root cause was first submitted |
| Acknowledged decisions and duplicate roots | [Advisory History](../../security/advisory-history.md) |
| Reusable intended-design and out-of-scope precedent | [Known Non-Eligible Findings](../../security/known-non-eligible-findings.md) |
| Earlier review context, **not current status** | [Codex security scan triage](../../security/codex-security-scan-triage-2026-06-12.md), [merged security report](../../security/final-merged-security-report.md), [SCV scan](../../security/scv-scan.md) |
| Earlier test context, **not the active CI gate** | [Archived SecurityPoC](../../security/pkg/contracts/test/SecurityPoC.t.sol) |
| Current contract regression gate | [SecurityPoC](../../pkg/contracts/test/no-coverage/SecurityPoC.t.sol), [Security PoC CI](../../.github/workflows/security-poc.yml), [contract package guide](../../pkg/contracts/AGENTS.md) |
| Board state semantics, if board access is available | [Private advisory board](https://github.com/1Hive/gardens-advisory-board); verify its current workflow instead of relying on an untracked local copy |
| Proposal and chain operations | [Proposal creator](../proposal-creator/SKILL.md), [indexed reads](../query-subgraph/SKILL.md), [on-chain reads](../read-contracts/SKILL.md), [write preparation](../write-contract/SKILL.md) |

The dated scans can identify an older root cause, but their `fixed`/`unfixed` labels describe an older revision. The public ledger intentionally omits unresolved private details; absence from it is not proof that a report is new. Check linked commits, tests, live deployments, and private advisory comments before claiming a precedent is fixed or a new report is distinct.

## 1. Establish the case

1. Identify the GHSA ID, reporter, original submission time, affected component and claimed impact. For multi-finding reports, assess each root cause separately. A resubmission of the same root cause keeps its original disclosure time and policy version.
2. Read the report and relevant follow-up comments. Search the full advisory history and the source map by component, behavior, trigger, and root cause, not merely by title or PoC. Identify the closest accepted, rejected, unpublished, and internally known precedents.
3. Confirm the path in the current source and the production deployment: configured pools and token, roles, versions, proxies/facets, enabled integrations, and reachable call path. Separate test-only or deprecated code, trusted-admin operations, provider trust assumptions, intended behavior, and future deployments from current production exposure.
4. Reproduce the claimed behavior with a control and assess recoverability, attacker prerequisites, realistic repeatability, and affected assets or governance. A local PoC is evidence of code behavior, not by itself evidence of current production exposure. A closed duplicate is not evidence that its underlying path was fixed.
   - For denial of service, check whether an authorized contract upgrade or other existing recovery path can restore service. Verify the deployed proxy and upgrade authority, whether the current controller can actually execute the upgrade, what code or state migration is required, and the realistic rollout time and coordination across affected chains. Distinguish an irreversible external-state collision from a recoverable Gardens service outage. Do not call a DoS permanent when an upgrade can bypass it, but do not dismiss an attacker-triggered outage merely because an upgrade is possible. If upgrade execution or timing is unverified, record that uncertainty.
5. Record an evidence-backed result: distinct eligible, duplicate, non-eligible, or pending. Record the closest precedent and exact difference. If private history, code, or production state cannot be checked, leave the case pending and request specific evidence or access; do not infer novelty from missing information.

## 2. Decide and communicate

- Use the policy published on `main` at original submission, not an uncommitted edit or a later policy revision. Assess severity using the stated CVSS tiers and documented production impact. Record why any reported severity differs from the accepted severity.
- For a recoverable denial of service, base severity on the affected production workflow, attacker cost and repeatability, and the likely interruption until the authorized fix can be built, reviewed, approved, and upgraded. Do not equate an occupied external identifier with permanent loss of service when a verified factory or proxy upgrade can route around it; document the recovery path and its operational cost in the private decision.
- For clear duplicates or non-eligible reports, reply privately with the reason and closest precedent; link a precedent only if it is already public and doing so is safe. If the behavior is a validated security defect, identify the affected production path and a specific code/test remediation before closing; track its fix independently of bounty state. Preserve any distinct surviving path as remediation coverage for the original finding. Do not imply that bounty exclusion means the defect will be ignored.
- If proof is missing, ask once for concrete missing evidence. Follow up after seven days; after 14 days without a substantive response, close with an invitation to reopen on new evidence. Do not auto-close an unresolved plausible High/Critical production risk solely because the reporter is silent.
- For clearly validated Moderate non-fund-loss findings, confirm the decision privately, set GitHub severity, and request a recipient address for Optimism USDT. Escalate contested cases or High/Critical rewards before making a commitment.
- Keep the private advisory board's **manual workflow stage** aligned with the last completed action. A request for missing proof, reproduction details, or production context belongs in **Needs more info** (`needs-info`) after the question is posted privately. An acceptance reply that asks for the Optimism USDT recipient belongs in **Accepted replied** (`accepted`) after the acceptance and address request are posted. Asking for a payout address is not an unresolved-evidence request. Never set `accepted` merely because GitHub activity shows a team reply: that reply may be the request for more information.
  - Read the current GitHub advisory state and comments and the board's saved stage before moving a card. Move it only when the stage differs, through the authenticated board control so its supported GitHub state handling is honored. Needs more info can leave a GitHub `triage` advisory in that state; moving a `triage` advisory to Accepted replied may transition it to GitHub `draft`. Do not post a duplicate question or acceptance just to change the stage.
  - For a direct fund-loss finding, retain the approval gate in section 3. An approval request to the user is not an acceptance reply to the researcher and does not justify `accepted` or a payout-address request. If researcher evidence is still missing, use `needs-info`; otherwise keep the case in Triage until the gate is satisfied.
  - When the researcher supplies the requested evidence, resume Triage for evaluation; move to `accepted` only after an actual acceptance/address-request reply, to **Recipient address given** only after validating the supplied address, and to **Proposal created** only after the real proposal exists. If the board write is unavailable, record the intended stage and reason in the private run handoff and report the sync failure instead of claiming the card moved.
- Record a changed decision or remediation state privately first. Update the sanitized [advisory history](../../security/advisory-history.md) and reusable [known findings](../../security/known-non-eligible-findings.md) only when the entry is safe to publish; even its existence or component name may disclose an unpatched finding. Record source-fixed, CI-verified, testnet-deployed, production-upgraded, and published states separately.

## 3. Direct fund-loss approval gate

For a distinct finding whose accepted impact is direct theft, diversion, or unrecoverable loss of user or pool funds, stop **before** confirming eligibility, requesting a wallet, promising a reward, or creating a bounty proposal.

This is an external decision and payout gate, not a reason to delay private technical reproduction, an emergency escalation, or a local fix. Do not retract an acceptance or on-chain proposal already made before this procedure; require approval before any new reward commitment or proposal. Continue read-only monitoring of existing proposals.

1. Calculate the severity-tier amount from the bounty pool balance at assessment. If the fund-loss cap was in force at the original submission, estimate the maximum reasonably demonstrable funds at risk in currently deployed and used flows, including per-attempt extraction, realistic repeatability, detection/mitigation window, token valuation, and uncertainty; suggest the lower of that exposure and the tier amount. For pre-cap reports, show the applicable tier amount without applying the cap retroactively. Mixed reports keep non-theft findings separate.
2. Send a concise approval request in this Codex chat **and** to the connected Gmail account. Include GHSA ID, private link, accepted severity, original submission/policy date, tier amount, exposure assumptions, suggested cap or payout, and a clear requested approval amount. Do not email exploit instructions or sensitive PoC material. If email fails, report that in chat and leave the gate closed.
3. Accept approval only as an explicit message from the user in this Codex chat that identifies the GHSA and amount. Email replies, absence of objection, prior advisory decisions, and a proposal draft are not approval. Persist the approval in the private monitor state with the GHSA, amount, policy revision, exposure-assumption fingerprint, approval quote/time, and notification status. Recheck that record before each gated action; a changed amount or material assumption requires new approval.
4. Only after matching approval and successful chat/email notification may you send the eligibility reply, ask for an address, and proceed to the proposal workflow. If approval is denied or remains pending, keep the advisory in triage without a reward commitment.

For the daily monitor, keep the private approval/notification record at `/home/corantin/.codex/automations/gardens-bounty-conviction-monitor/state.json`, outside the repository. Restrict it to the current user. Before emailing, check the record and sent mail for the same GHSA and proposal fingerprint to avoid repeat notifications. Never store wallet secrets, full PoCs, or private advisory descriptions in that record.

## 4. Fix and verify validated findings

- Fix accepted bounty findings and validated out-of-scope security defects alike. Propose the patch in a PR or push it to an existing remediation branch, with a GHSA-to-fix link in the private advisory. If the defect is already covered by another fix, verify and link that fix rather than duplicating work.
- Preserve intended behavior and unrelated workflows. First write a regression control for legitimate pre-fix behavior, then a reproducer for the defect; the patch should change only the exploit path. If every viable fix changes legitimate behavior, mark that finding `Behavior change needed` in the private advisory workflow and pause that finding until the user explicitly approves the change. If the board cannot store this tag, record it in the private GHSA-to-fix ledger and do not claim the board is tagged. Do not treat approval of a bounty amount or a general instruction to fix advisories as approval of a behavior change. Other independent findings in the batch may continue.
- Before requesting behavior-change approval, explain it to the user for each finding ID as **Before (verified current behavior)** versus **After (proposed behavior)**. Cover both the normal path and the affected edge case; identify who is affected, what action or outcome changes, and any change to funds, rates, timing, permissions, or recoverability. State why a behavior-preserving fix is insufficient, which choices remain open, and what tests will preserve unaffected behavior. Distinguish a proposed change from code already implemented and from behavior verified in production. Record the comparison privately with the finding and request approval for the specific choice, not a generic permission to fix.
- When asked for a batch, use one branch and one review unit, but assign a separate finding ID to each GHSA/root cause. Track each ID's reproducer, behavior-preservation control, patch, test result, approval gate, and deployment status independently in the private remediation ledger at `/home/corantin/.codex/automations/gardens-bounty-conviction-monitor/remediation-batch.json`; do not collapse distinct findings into one acceptance or reward decision.
- Work on one clean, persistent `feature/advisory-remediation-batch` branch/worktree from current `origin/main`; reuse it for later fixes when practical. If that worktree has unrelated changes, use a dedicated clean branch. Do not reset or clean other worktrees. Keep sensitive changes local or in a private advisory fork while a public diff could expose an unpatched production issue.
- For every validated vulnerability fix, add a dedicated anti-regression SecurityPoC case for its distinct root cause. Show the vulnerable behavior before the patch and preserve a passing legitimate-behavior control; the test must fail if the fix is reverted. Keep the case in the affected package suite, map its advisory/finding ID to the exact test in the private remediation ledger and, when disclosure is safe, `security/security-poc-coverage.md`, and include it in the Security PoC CI gate. A duplicate of the same root cause may reuse its original case; separate findings in one report need separate cases. For deployment-script fixes, exercise the script path rather than only constructing the intended deployment in a test. Run the focused case and relevant broader tests. Check storage layout, ABI consumers, frontend, subgraph, and deployment inventory when affected.
- Record the GHSA-to-fix-to-test mapping privately. If the issue is production reachable, specify which live proxies, facets, factories, and networks still require an upgrade. A merged source fix alone does not earn the `Fixed` tag.
- Push the branch and open or update one PR against `main` only after the user approves public disclosure or production protection has been verified. Do not merge, deploy, or publish automatically.

## 5. Create and monitor bounties

- For approved Moderate cases, obtain and confirm the Optimism USDT recipient address. Recompute the amount if pool balance or an applicable cap changed; for fund loss, request fresh approval when the approved amount or exposure basis changes.
- Create proposals in **original disclosure order**, not proposal ID order. Verify no existing active, cancelled/recreated, executed, or otherwise payable proposal already covers the root cause. Check available signer slots, signer readiness, recipient, token decimals, amount, and on-chain proposal state; if a slot is full, wait rather than cancel an earlier item.
- Reply in the private advisory with the proposal link after on-chain creation. Keep board tags and history in sync with verified facts; a proposal link does not imply payout or a deployed fix.
- On each daily check, read live `getProposal(uint256)` and `calculateProposalConviction(uint256)` for the next chronological proposal. It passes only while Active and conviction is strictly greater than its current threshold. Verify the beneficiary before an execution reminder. Notify once when execution or support of the next item becomes actionable; stay quiet when nothing changed. Never execute, support, cancel, create a second payout, or infer receipt from proposal execution alone without verifying the transfer.

## Daily-run handoff

End each run with a compact private record of decisions, citations/evidence, pending approvals, fixes/tests, proposal order, and blockers. Notify the user only for a new approval, meaningful queue action, failed critical read/email, or a decision requiring judgment. Do not expose private advisory details in public documentation or notifications.

## Procedure regression cases

When changing this skill or its automation, check these outcomes without making live advisory writes:

| Case | Required outcome |
| --- | --- |
| Earlier duplicate exists only in a private advisory | Match the root cause and original timestamp; do not award it or link the private precedent publicly. |
| Dated scan labels a finding unfixed | Verify current source and deployed code before calling it unfixed or fixed. |
| Direct fund-loss report predates the published cap | Calculate the original tier reward without a retroactive cap; still seek approval before a new commitment. |
| New direct fund-loss report awaits approval | Send chat and minimal email notices; do not accept, request a wallet, or create a proposal. |
| Approved amount or material exposure assumption changes | Treat the prior approval as stale and request a new GHSA-specific approval. |
| Email delivery fails | Notify in chat; keep acceptance and bounty actions blocked until email succeeds and approval is recorded. |
| Patch remains unsafe to disclose publicly | Keep the fix branch private/local; do not push or open a public PR, merge, upgrade, or publish. |
| Valid web or API security defect is outside bounty scope | Record non-eligibility separately, propose a concrete patch and regression test in a private branch/PR, and track remediation to production. |
| A fix needs legitimate behavior to change | Tag the finding, show verified Before versus proposed After for normal and edge paths, explain affected users and alternatives, and wait for approval of the specific change. |
| A reported permanent denial of service has an upgradeable integration | Verify the live upgrade authority and a plausible bypass, then assess the bounded outage and rollout burden rather than assuming either permanent impact or no exploitability. |
| Researcher is asked for missing exploit evidence | After the private question is posted, set the shared board stage to Needs more info; a team reply alone must not infer Accepted replied. |
| Eligible report is accepted and the researcher is asked for a payout address | After the private acceptance/address request is posted and any fund-loss gate is satisfied, set Accepted replied, not Needs more info. |
