# Test Coverage And Quality Audit Report

Date: 2026-02-13  
Repository: /Users/afo/Code/greenpill/gardens

## Scope

This audit reviewed testing and coverage posture across:

- `pkg/contracts` (Foundry)
- `apps/web` (Next.js frontend)
- `pkg/subgraph` (The Graph mappings)
- CI and coverage policy (`.github/workflows`, `codecov.yml`, `turbo.json`)
- Agent guidance files (`Agent.md`, `CLAUDE.md`, `apps/web/Agent.md`)

## Executive Summary

- Contracts have a strong base: all suites pass and source-level line/function coverage is high.
- The main risk is test strategy imbalance: branch coverage is materially lower in critical governance flows.
- Frontend and subgraph currently have no automated tests or CI test gates.
- Current agent guidance is too generic for enforcing test quality from the start.

## Measured Results

### Contract test execution

- `pnpm --dir pkg/contracts test`: 695/695 passing.
- Coverage run (local, excluding fork-only test file): 682/682 passing.

### Contract coverage (`pkg/contracts/lcov.audit.info`)

- Source line coverage: 94.11% (2285/2428)
- Source branch coverage: 74.40% (369/496)
- Source function coverage: 99.07% (426/430)

### Coverage hotspots (branch)

- `pkg/contracts/src/RegistryCommunity/RegistryCommunity.sol`: 35.29%
- `pkg/contracts/src/CVStrategy/CVStrategy.sol`: 53.12%
- `pkg/contracts/src/CVStrategy/PowerManagementUtils.sol`: 55.00%
- `pkg/contracts/src/RegistryCommunity/facets/CommunityAdminFacet.sol`: 56.52%

## Key Findings

### P0: Frontend has no automated test system

- No `test` script in `apps/web/package.json`.
- No `*.test.*` or `*.spec.*` files under `apps/web`.

### P0: Subgraph has no automated test system

- No `test` script in `pkg/subgraph/package.json`.
- No `*.test.*` or `*.spec.*` files under `pkg/subgraph/src`.

### P0: CI does not run tests on pull requests

- In `.github/workflows/ci.yaml`, lint runs, while test execution is commented out.

### P1: Turbo test pipeline is Solidity-specific

- `turbo.json` test inputs currently target `test/**/*.t.sol`, which excludes frontend/subgraph test patterns.

### P1: Coverage policy has no explicit minimum bar

- `codecov.yml` uses `target: auto` and regression thresholds, but no explicit minimum coverage floor by component.

### P1: Contract branch coverage needs targeted improvement

- High overall line/function coverage masks branch deficits in core governance modules.

### P2: Property and invariant testing is underused

- `foundry.toml` has fuzz configured.
- Only 4 fuzz tests are present (all in `RegistryTest.t.sol`).
- Invariant section is currently commented out.

### P2: Known test debt remains in core suite

- `CVStrategyTest.t.sol` still includes TODO/commented sections indicating missing or deferred assertions.

## Agent File Update Targets

Update all three guidance files:

- `Agent.md`
- `CLAUDE.md`
- `apps/web/Agent.md`

Recommended additions:

1. A mandatory test plan for each behavior change (happy path, failure path, edge path).
2. Contract-specific quality gates (branch-focused expectations for touched files, revert-path coverage, fuzz/invariant requirements for arithmetic/state logic).
3. Frontend/subgraph policy that behavior changes require tests and CI execution, not only lint/typecheck/build.
4. Clear command matrix with current reality (contracts tested; frontend/subgraph currently untested) and required next steps.
5. Stronger wording from "should include test updates" to "must include test updates for behavior changes."

## Recommended Next Actions

1. Add frontend test harness (Vitest + React Testing Library).
2. Add subgraph mapping tests (Matchstick).
3. Re-enable CI test stage in `.github/workflows/ci.yaml`.
4. Expand Turbo test inputs to include JS/TS test patterns.
5. Add explicit coverage thresholds by package/module in `codecov.yml`.
6. Apply a unified "Testing Standards" section to all agent guidance files listed above.
