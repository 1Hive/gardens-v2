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
- For Gardens E2E test creation, repair, or flakiness work, consult `skills/e2e-test-maker/SKILL.md`.
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

## Validation Guidance

- Prefer package-local verification from the package guide.
- For cross-package work, validate each touched package separately instead of relying on a single root command.
- Be explicit in handoff about skipped checks caused by missing env, RPC access, or third-party credentials.
