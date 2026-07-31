# AGENTS.md

Monorepo entrypoint for coding agents working in `gardens-v2`.

## Scope

- Repo root: `/home/corantin/Documents/GitHub/gardens-v2`
- Package manager: `pnpm`
- Task runner: `turbo`
- Workspace globs from `pnpm-workspace.yaml`:
  - `apps/*`
  - `pkg/*`

## How To Use This File

- Use this root file for monorepo-wide rules and package routing.
- When work is scoped to a package, switch to that package's local `AGENTS.md` and follow it.
- If a task spans multiple packages, use the root file first, then the local guide for each touched package.

## Package Guides

- `apps/web`: see `apps/web/AGENTS.md`
- `apps/docs`: see `apps/docs/AGENTS.md`
- `pkg/contracts`: see `pkg/contracts/AGENTS.md`
- `pkg/e2e`: see `pkg/e2e/AGENTS.md`
- `pkg/eslint-config-custom`: see `pkg/eslint-config-custom/AGENTS.md`
- `pkg/services`: see `pkg/services/AGENTS.md`
- `pkg/subgraph`: see `pkg/subgraph/AGENTS.md`
- `pkg/tsconfig`: see `pkg/tsconfig/AGENTS.md`
- `pkg/ui`: see `pkg/ui/AGENTS.md`

## Monorepo Rules

- Prefer `rg` and `rg --files` for discovery.
- Expect a dirty worktree. Do not revert unrelated user changes.
- Treat generated outputs as derived unless the task explicitly targets them.
- Check package-local scripts before inventing ad hoc workflows.
- When changing contract interfaces, verify whether `pkg/subgraph` and `apps/web` also need updates.
- When changing network support, keep contracts, subgraph config, and frontend chain config aligned.

## Repo Skills

- This repo includes a local skill library under `skills/`.
- Also use relevant installed skills from `npx skills add vercel-labs/agent-skills` when they match the task domain, especially for frontend, Next.js, Vercel, browser verification, documents, spreadsheets, presentations, PDFs, or other specialized workflows not covered by the repo-local skills.
- For Gardens E2E test creation, repair, or flakiness work, consult `skills/e2e-test-maker/SKILL.md`.
- For Gardens proposal drafting or creation flows, consult `skills/proposal-creator/SKILL.md`.
- For Gardens indexed data or entity lookup tasks, consult `skills/query-subgraph/SKILL.md`.
- For Gardens on-chain read tasks, address/ABI resolution, or `cast call` usage, consult `skills/read-contracts/SKILL.md`.
- For Gardens state-changing transactions, calldata encoding, multisig payloads, or write preparation, consult `skills/write-contract/SKILL.md`.
- When multiple skills apply, prefer this order: `query-subgraph`, `read-contracts`, `write-contract`.
- Users may invoke these skills explicitly with `$e2e-test-maker`, `$query-subgraph`, `$read-contracts`, or `$write-contract`.

## Root Commands

Run from the repo root when the task spans packages:

```bash
pnpm install
pnpm build
pnpm dev
pnpm lint
pnpm test
pnpm format
```

Useful targeted commands:

```bash
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web typecheck

pnpm --filter docs build

pnpm --filter foundry build
pnpm --filter foundry test

pnpm --filter subgraph build
```

## Generated And High-Risk Paths

- `apps/web/src/generated.ts`
- `broadcast/**`
- `pkg/subgraph/generated/**`
- `pkg/subgraph/build/**`
- `pkg/subgraph/.graphclient/**`

Avoid editing vendored or cache directories unless the task explicitly targets them.

## Security Advisory Eligibility Workflow

Use this workflow when triaging a GitHub Security Advisory, bounty eligibility question, duplicate report, severity reconsideration, or "is this exploitable" security report.

1. Start from existing public guidance before evaluating the new claim:
   - `SECURITY.md`
   - `security/advisory-history.md`
   - `security/known-non-eligible-findings.md`
   - relevant security reports under `security/`
2. Compare by root cause, not only by title or PoC:
   - Treat reports as duplicates when they rely on the same underlying bug, even if the symptom, route, or reproduction is different.
   - If a report claims a bypass of an already-known issue, identify exactly what precondition or production path makes it different.
3. Ground eligibility and severity in the current production surface:
   - Confirm whether the affected code is deployed and used by current Gardens flows.
   - Separate intended design, trusted-admin actions, local/test/deprecated code, unexecuted upgrade payloads, and non-production registry paths from production-reachable vulnerabilities.
   - For severity reductions, record the concrete reason, such as no direct theft, upgrade/recovery path, trusted-role requirement, limited affected pool type, or required governance-state preconditions.
4. Update the advisory ledger whenever a decision changes or a new advisory is acknowledged:
   - Add or edit the matching row in `security/advisory-history.md`.
   - Include advisory id, decision, severity, status, affected component, root cause, and duplicate guidance.
   - Include bounty proposal links or fixed commit references when they are known and public.
   - Do not publish private exploit details that should remain confined to a private advisory.
5. Keep public researcher guidance aligned:
   - If the decision creates a reusable non-eligible, intended-design, out-of-scope, or duplicate category, update `security/known-non-eligible-findings.md`.
   - If the bounty process or discovery path changes, update `SECURITY.md`.
6. Before finishing, verify documentation consistency:
   - `rg -n "<advisory-id>|<root-cause-keyword>" SECURITY.md security/advisory-history.md security/known-non-eligible-findings.md security`
   - `git diff --check`
   - Report any advisory decision that was intentionally not added to public docs because it is still private or unresolved.

## Web Dependency Audit Workflow

Use this workflow when `.github/workflows/web-audit.yml` or `pnpm --dir apps/web audit:check` reports high or critical advisories.

1. Reproduce the exact failing revision.
   - Read the Actions run and job metadata to confirm the failing step, branch, and head SHA.
   - Work from the current `origin/main` commit when the failure is on `main`; do not diagnose from an unrelated feature branch whose lockfile happens to pass.
   - If `main` is already checked out in another worktree, use that clean worktree or create a temporary worktree from `origin/main`. Do not disturb another task's checkout.
2. Run the repository audit commands with advisory-registry network access:

   ```bash
   pnpm --dir apps/web audit:check
   pnpm --dir apps/web audit:resolve
   ```

   - `audit:check` is the CI-equivalent gate.
   - `audit:resolve` is for triage, but its interactive writer may reject the repository's version-1 `apps/web/audit-resolve.json` schema. If it fails with `Invalid audit-resolve file`, preserve the existing schema and add decisions directly rather than replacing or downgrading the file.
3. Inspect every high or critical finding before changing dependencies:
   - Use `pnpm --filter web why <package>` to enumerate runtime, build-time, and dev-only paths.
   - Search `apps/web` for direct imports, interceptors, parsers, image processing, user-controlled inputs, and relevant Next.js configuration.
   - Treat a path as reachable when untrusted input can reach the vulnerable behavior. For example, review `next.config.js` image host rules before declaring a `sharp` finding unreachable.
4. Choose the smallest justified resolution:
   - Upgrade or override reachable runtime packages to the first fixed compatible release.
   - Snooze only a path that is not exploitable in the deployed app. Record a concrete reachability reason and a time-bounded expiry, normally about one month.
   - Add one decision per advisory ID and exact dependency path emitted by the checker; a package can require several entries.
   - Never use a snooze to hide a runtime package that remains vulnerable in the installed pnpm tree.
5. Keep npm audit modeling and the real pnpm install aligned:
   - `apps/web/scripts/audit-resolver.mjs` builds a sanitized npm manifest and carries `apps/web/package.json`'s `overrides` into it.
   - Runtime enforcement comes from root `package.json` under `pnpm.overrides`.
   - When fixing an overridden transitive dependency, update both the existing `apps/web/package.json` `overrides` object and the corresponding root `pnpm.overrides` entry. Do not add a second `overrides` key to either JSON object.
   - Regenerate `pnpm-lock.yaml` with pnpm 9 and verify `pnpm --filter web why <package>` resolves the intended fixed versions.
6. Validate before publishing:

   ```bash
   pnpm install --frozen-lockfile
   pnpm --dir apps/web audit:check
   pnpm --dir apps/web generate
   pnpm --dir apps/web typecheck
   git diff --check
   ```

   - Run `generate` before `typecheck` in a fresh worktree because `apps/web/src/generated.ts` is derived and may be absent.
   - Do not commit `apps/web/src/generated.ts` unless the task intentionally changes generated contract bindings.
   - Review the lockfile diff and stage only the audit decision, manifest, and lockfile changes required by the remediation.
7. Before a direct push to `main`, fetch `origin/main` again and confirm the branch has not advanced. After pushing, verify the new `Web Audit` Actions run is attached to the pushed commit and report whether it passed or is still running.

## Validation Guidance

- Prefer package-local verification from the package guide.
- For cross-package work, validate each touched package separately instead of relying on a single root command.
- Be explicit in handoff about skipped checks caused by missing env, RPC access, or third-party credentials.
