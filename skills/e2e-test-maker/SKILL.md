---
name: e2e-test-maker
description: Create, repair, and review Gardens V2 Playwright/Synpress E2E tests in pkg/e2e. Use when adding E2E scenarios, stabilizing flaky E2E CI, deciding UI-vs-RPC setup boundaries, adding Playwright projects, using MetaMask helpers, or updating the E2E GitHub Actions workflow.
---

# Gardens E2E Test Maker

## When To Use

Use this skill for Gardens V2 end-to-end work in `pkg/e2e`, especially:

- Adding or repairing Playwright/Synpress tests.
- Debugging E2E CI flakiness, retries, Vercel preview selection, or `PLAYWRIGHT_BASE_URL` issues.
- Deciding which parts of a flow should be prepared with RPC/subgraph and which parts must be exercised through the UI.
- Adding a new test project to `pkg/e2e/playwright.config.ts`.
- Working with MetaMask confirmation, visible-only locators, token minting/funding, pool archive cleanup, or proposal lifecycle tests.

If the task is primarily GitHub Actions failure triage, also use the GitHub `gh-fix-ci` skill. If the task requires live Gardens data or contract state, combine this skill with `query-subgraph`, `read-contracts`, or `write-contract` as appropriate.

## Workflow

1. Read `references/e2e-patterns.md` before changing tests. It contains the current project layout, helper inventory, CI behavior, and scenario patterns.
2. Inspect the relevant current source files with `rg`, `sed`, and package-local scripts. Prefer existing helpers in `pkg/e2e/tests/utils/` before adding new ones.
3. Use the UI for the behavior under test. Use RPC/subgraph only to make prerequisite state deterministic or to verify final state.
4. Keep Playwright projects serial and dependency ordered. If adding a scenario, wire it into `pkg/e2e/playwright.config.ts` in the intended lifecycle position.
5. Validate narrowly first with the target project, then run the dependent flow when credentials and network access are available.

## Validation Commands

From `pkg/e2e`:

```bash
CI=true PLAYWRIGHT_BASE_URL="https://preview.example" pnpm exec playwright test tests/<test>.e2e.ts --project=<project-name>
```

For local UI:

```bash
PLAYWRIGHT_BASE_URL="http://localhost:3000" pnpm exec playwright test tests/<test>.e2e.ts --project=<project-name>
```

Use `PLAYWRIGHT_BASE_URL`; `E2E_BASE_URL` is not read by the Playwright config.
