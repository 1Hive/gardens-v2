# Test Coverage Audit: Gardens v2

**Date:** 2026-02-13
**Branch:** feature/nft-voting-power

---

## Executive Summary

| Area | Test Files | Coverage | Risk |
|------|-----------|----------|------|
| Smart Contracts | 43 files, 648 tests | Moderate | Medium-High |
| Frontend | **0 files** | **None** | **Critical** |
| Subgraph | **0 files** | **None** | **Critical** |
| E2E / Integration | **0 files** | **None** | **Critical** |

---

## 1. Smart Contracts — Good Foundation, Significant Gaps

### Strengths

- 43 test files with 648 test functions
- Strong integration test in `CVStrategyTest.t.sol` (3,903 lines, 79 tests covering full proposal lifecycle)
- Good mock infrastructure (`SafeSetup.sol`, `CVStrategyHelpers.sol`)
- Coverage reporting via Codecov

### Critical Gaps

| Issue | Details |
|-------|---------|
| **Zero fuzz/invariant tests** | Foundry config has `fuzz.runs = 256` but no fuzz tests exist. Core conviction math is never fuzz-tested. |
| **CVPauseFacet** — 0 tests | No dedicated test file at all |
| **CommunityPauseFacet** — 0 tests | No dedicated test file at all |
| **CommunityPoolFacet** — 4 tests | Severely undertested for critical pool management |
| **CVAdminFacet** — 7 tests, 1 revert | Admin operations need far more negative testing |
| **CVStreamingFacet** — 23 tests, 1 revert | Streaming edge cases almost entirely untested |
| **CVStrategyStreamingEscrow** — 2 tests | Escrow lifecycle barely covered |
| **ConvictionsUtils.sol** — 0 direct tests | Core voting math only tested indirectly through integration tests |
| **PowerManagementUtils.sol** — 0 direct tests | Power calculation logic only tested indirectly |

### Revert Testing Distribution

Revert testing is inconsistent across the codebase:

#### High Quality (Comprehensive Revert Testing)

| File | Tests | Revert Checks |
|------|-------|---------------|
| CVStrategyTest.t.sol | 79 | 76 |
| CVStrategy.t.sol | 29 | 33 |
| CVAllocationFacet.t.sol | 20 | 14 |
| CVProposalFacet.t.sol | 15 | 12 |
| BaseStrategyUpgradeable.t.sol | 13 | 16 |

#### Low Quality (Insufficient Revert Testing)

| File | Tests | Revert Checks |
|------|-------|---------------|
| CVAdminFacet.t.sol | 7 | 1 |
| CVStreamingFacet.t.sol | 23 | 1 |
| CVSyncPowerFacet.t.sol | 13 | 2 |
| CommunityPoolFacet.t.sol | 4 | 1 |
| CVStrategyStreamingEscrow.t.sol | 2 | 1 |

### Diamond Pattern Coverage

#### CVStrategy Diamond (5 facets + base)

```
Main: CVStrategy.sol
├─ CVAdminFacet.sol        (7 tests)  ⚠️
├─ CVAllocationFacet.sol   (20 tests) ✓
├─ CVDisputeFacet.sol      (13 tests) ✓
├─ CVPowerFacet.sol        (10 tests) ⚠️
├─ CVProposalFacet.sol     (15 tests) ✓
├─ CVStreamingFacet.sol    (23 tests) ⚠️
├─ CVSyncPowerFacet.sol    (13 tests) ⚠️
├─ CVPauseFacet.sol        (NO TESTS) ✗✗✗
└─ CVStrategyBaseFacet.sol (12 tests) ✓
```

#### RegistryCommunity Diamond (5 facets + base)

```
Main: RegistryCommunity.sol
├─ CommunityAdminFacet.sol    (12 tests) ✓
├─ CommunityMemberFacet.sol   (10 tests) ✓
├─ CommunityPoolFacet.sol     (4 tests)  ⚠️⚠️⚠️
├─ CommunityPowerFacet.sol    (12 tests) ✓
├─ CommunityStrategyFacet.sol (10 tests) ✓
├─ CommunityPauseFacet.sol    (NO TESTS) ✗✗✗
└─ CommunityBaseFacet.sol     (8 tests)  ⚠️
```

---

## 2. Frontend — Zero Coverage

### Infrastructure

- **No test framework** configured (no Jest, Vitest, or Playwright)
- **No test scripts** in `package.json`
- **No test files** anywhere in `apps/web/`
- **CI test step is commented out** in `.github/workflows/ci.yaml`
- Turbo pipeline only matches `test/**/*.t.sol` — frontend tests would be ignored even if they existed

### Critical Untested Areas

#### Hooks (32 files, ~2,650 LOC)

All custom hooks have zero tests. Highest-risk hooks:

- `useContractWriteWithConfirmations.ts` — critical transaction handling
- `useConvictionRead.ts` — conviction voting calculations
- `useSubgraphQuery.ts` / `useSubgraphQueryMultiChain.ts` — data fetching layer
- `useSuperfluidStream.ts` / `useSuperfluidToken.ts` — streaming pool integration
- `useHandleAllowance.tsx` — token approval handling
- `useHandleRegistration.tsx` — member registration flow
- `useOwnerOfNFT.ts` — NFT ownership checks

#### Components (79 files)

All components untested, including critical governance UI:

- `ActivatePoints.tsx` — voting power activation
- `DisputeModal.tsx` — dispute handling UI
- `ProposalCard.tsx` / `Proposals.tsx` — proposal display
- `ProposalsModalSupport.tsx` — voting/support modal
- `RegisterMember.tsx` — member registration flow
- `PoolGovernance.tsx` — pool governance UI
- `SuperfluidLeaderboard.tsx` — streaming leaderboard

#### Utility Functions (22 files)

- `convictionFormulas.ts` — client-side conviction voting calculations with no validation
- `numbers.ts` — numeric operations and formatting
- `web3.ts` — web3 integration utilities
- `gitcoin-passport.ts` — sybil protection integration

#### API Routes (12 directories)

- `/api/ably-auth/` — real-time service auth
- `/api/passport/` — Gitcoin Passport integration
- `/api/passport-oracle/` — passport scoring oracle
- `/api/good-dollar/` — GoodDollar integration
- `/api/ipfs/` — IPFS operations
- `/api/superfluid-points/` — streaming rewards
- `/api/superfluid-stack/` — stack interactions

#### Pages (13+ routes)

All page routes untested, including community creation, pool details, proposal creation/details, and admin panel.

---

## 3. Subgraph — Zero Coverage

### Infrastructure

- **No Matchstick** or any test framework installed
- No `test` script in `package.json`
- No test directories or test files anywhere in `pkg/subgraph/`

### Mapping Files

| File | Lines | Handlers | Risk Level |
|------|-------|----------|------------|
| `cv-strategy.ts` | 1,013 | 22 | CRITICAL |
| `registry-community.ts` | 824 | 28 | CRITICAL |
| `registry-factory.ts` | 168 | 7 | MEDIUM |
| `passport-scorer.ts` | 125 | 6 | LOW |
| `proposal-metadata.ts` | 109 | 3 | LOW |
| `good-dollar-sybil.ts` | 92 | 4 | LOW |
| `collateral-vault.ts` | 85 | 3 | LOW |
| `pool-metadata.ts` | 45 | 1 | LOW |
| `covenant.ts` | 30 | 1 | LOW |
| **TOTAL** | **2,491** | **72** | **CRITICAL** |

### Potential Bugs Identified

1. **`passport-scorer.ts:54`** — `handleUserRemoved` uses `event.address` instead of `event.params.user` when creating a `PassportUser` entity
2. **`collateral-vault.ts`** — `handleCollateralWithdrawn` creates a new deposit entity instead of loading the existing one, then subtracts from an uninitialized amount
3. **`cv-strategy.ts:256-328`** — `handlePointsDeactivated` has 6 levels of nested entity loading with no validation of intermediate null states

### Critical Untested Handlers

- `handleProposalCreated` — conviction calculation, metadata linking
- `handleSupportAdded` — stake delta calculations, member-strategy tracking
- `handlePointsDeactivated` — nested entity updates
- `handleDisputeRuled` — three ruling outcome paths
- `handleInitialized` (registry-community) — multi-entity initialization

---

## 4. CI/CD Gaps

| Issue | File | Details |
|-------|------|---------|
| Test step commented out | `.github/workflows/ci.yaml` | `# - name: Build and Test` |
| Wrong branch trigger | `.github/workflows/ci.yaml` | Triggers on `master` but main branch is `main` |
| Coverage only for contracts | `.github/workflows/coverage.yml` | Only triggers on `pkg/contracts/**` changes |
| No pre-commit hooks | — | No `.husky/` or lint-staged configuration |
| No frontend test gate | `turbo.json` | Test inputs only match `test/**/*.t.sol` |
| No subgraph test gate | — | No test scripts or CI steps for subgraph |

---

## 5. Recommendations for Agent Files (CLAUDE.md / Agent.md)

The following section should be added to both `CLAUDE.md` and `Agent.md` to enforce testing standards for all contributors (human and AI).

### Proposed New Section: Testing Standards

```markdown
## Testing Standards

### General Testing Philosophy

- **Every code change MUST include corresponding tests.** No PR should be merged
  without tests for new or modified functionality.
- **Test the unhappy path first.** For every function, write revert/error tests
  before success tests. Security-critical code (voting, staking, fund distribution)
  requires at minimum equal numbers of positive and negative test cases.
- **Test at the right level.** Unit test pure logic (math, utilities, state
  transitions). Integration test workflows that cross contract/component boundaries.
  Don't rely solely on integration tests to cover unit-level logic.

### Smart Contract Testing (pkg/contracts)

#### Required Test Types

1. **Unit Tests** — Every public/external function in every facet must have
   dedicated tests including:
   - Happy path with expected state changes verified
   - All revert conditions (access control, invalid params, edge cases)
   - Boundary values (zero, max uint, empty arrays)

2. **Fuzz Tests** — Required for any function involving:
   - Mathematical calculations (conviction, decay, thresholds, power)
   - Token amounts or balances
   - Time-dependent logic
   - Use forge's built-in fuzzer. Minimum 256 runs (configured in foundry.toml).

3. **Invariant Tests** — Required for core protocol invariants:
   - Total staked >= sum of individual stakes
   - Conviction monotonically increases while support is held
   - No double-voting per proposal per member
   - Pool funds never exceed available balance after distribution

#### Test File Naming & Organization

- One test file per facet: `<FacetName>.t.sol`
- Test functions follow: `test_<functionName>_<scenario>` for success,
  `testRevert_<functionName>_<scenario>` for reverts
- Fuzz tests: `testFuzz_<functionName>_<property>`
- Invariant tests: `invariant_<propertyName>`
- Shared helpers go in `test/shared/`

#### Minimum Coverage Requirements

- New facets: 80%+ line coverage before merge
- Changes to existing facets: coverage must not decrease
- ConvictionsUtils.sol and PowerManagementUtils.sol: 90%+ (critical math)
- Run coverage with: `cd pkg/contracts && pnpm coverage`

#### Diamond Pattern Testing

- When adding a new facet, create a corresponding test file
- Verify storage layout before committing: `./scripts/verify-storage-layout.sh`
- Test that facet functions are accessible through the diamond proxy
- Test that facet selectors don't collide

### Frontend Testing (apps/web)

#### Framework

- Use Vitest + React Testing Library for unit/component tests
- Use Playwright for E2E tests (when set up)

#### What to Test

1. **Hooks** — All custom hooks must have unit tests, especially:
   - `useConvictionRead` — conviction calculation correctness
   - `useContractWriteWithConfirmations` — transaction state machine
   - `useSubgraphQuery` / `useSubgraphQueryMultiChain` — query construction,
     error handling
   - Any hook with conditional logic or state management

2. **Utility Functions** — All pure functions in `utils/` must have unit tests:
   - `convictionFormulas.ts` — must match contract-side calculations
   - `numbers.ts` — formatting, parsing, edge cases
   - `web3.ts` — address validation, chain helpers

3. **Components** — Test user-facing behavior, not implementation:
   - Proposal creation form validation
   - Voting/support modal state transitions
   - Error states and loading states

4. **API Routes** — Test request validation, error responses, and auth checks

### Subgraph Testing (pkg/subgraph)

#### Framework

- Use Matchstick (`@matchstick-as/testing`) for AssemblyScript unit tests

#### What to Test

1. **Event handlers** — Every handler in `src/` must have at least one test:
   - Entity creation with correct field values
   - Entity updates preserve existing data
   - Entity relationships are correctly linked

2. **Critical handlers requiring thorough testing:**
   - `handleProposalCreated` — conviction calculation, metadata linking
   - `handleSupportAdded` — stake delta calculations, member-strategy tracking
   - `handlePointsDeactivated` — nested entity updates (6 levels of loading)
   - `handleDisputeRuled` — three ruling outcome paths
   - `handleInitialized` (registry-community) — multi-entity initialization

3. **Edge cases:**
   - Entity not found (null checks)
   - Contract call reverts (`.reverted` branches)
   - Zero/empty values

### CI/CD Test Requirements

- All test suites must pass before merge
- Coverage reports uploaded to Codecov
- Storage layout verification runs on contract changes
- Frontend lint + typecheck + tests gate PRs
- Subgraph build + tests gate PRs

### When Writing Tests with AI Agents

- **Always run tests after writing them**: `forge test -vvv --match-path <file>`
  for contracts
- **Check coverage delta**: ensure new code is covered, not just that tests pass
- **Don't write trivial tests**: testing getters/setters with no logic adds noise.
  Focus on behavior and invariants.
- **Match existing test patterns**: read the nearest existing test file before
  writing new tests to match conventions
- **For contract changes**: run the full test suite, not just new tests, to catch
  regressions
```

### Proposed Update: Git Commit Guidelines

Strengthen the existing section:

```markdown
## Git Commit Guidelines

- Follow conventional commits for clear change history
- **Contract changes MUST include test updates** — PRs without tests will be rejected
- **Frontend changes should include tests** for any new hooks, utils, or complex components
- **Subgraph mapping changes should include Matchstick tests**
- Frontend changes should be tested against local subgraph if possible
```

---

## 6. Priority Actions

These are the infrastructure changes needed to make the testing guidelines enforceable:

### Immediate (Blocking)

1. **Uncomment the test step** in `.github/workflows/ci.yaml` and fix the branch trigger from `master` to `main`
2. **Create contract tests** for `CVPauseFacet` and `CommunityPauseFacet` — zero coverage on pause functionality is a safety risk
3. **Add direct unit tests for `ConvictionsUtils.sol`** — core voting math must not rely solely on integration tests
4. **Add fuzz tests** for conviction math — highest-value single testing improvement

### High Priority

5. **Add Vitest + React Testing Library** to `apps/web/` and create the first tests for `utils/convictionFormulas.ts`
6. **Add Matchstick** to `pkg/subgraph/` and create first tests for `handleProposalCreated`
7. **Expand `CommunityPoolFacet` tests** from 4 to 20+ with revert scenarios
8. **Expand `CVAdminFacet` tests** from 7 to 20+ with comprehensive revert testing
9. **Add pre-commit hooks** (husky + lint-staged) to catch issues before they reach CI

### Medium Priority

10. **Update `turbo.json`** test task inputs to include `**/*.test.ts` and `**/*.test.tsx`
11. **Expand `CVStreamingFacet` revert testing** from 1 to 10+ revert checks
12. **Add invariant test suites** for core protocol properties
13. **Fix identified subgraph bugs** in `passport-scorer.ts` and `collateral-vault.ts`
14. **Set up Playwright** for critical E2E flows (community creation, voting, fund allocation)

---

## 7. Overall Quality Metrics

| Metric | Score | Notes |
|--------|-------|-------|
| Contract Test Count | 7/10 | 648 tests is substantial |
| Contract Revert Testing | 5/10 | Inconsistent across facets |
| Contract Fuzz/Invariant | 0/10 | None exist despite config |
| Contract Mocking Quality | 9/10 | Excellent mock infrastructure |
| Contract Integration Tests | 8/10 | CVStrategyTest is strong |
| Frontend Testing | 0/10 | Nothing exists |
| Subgraph Testing | 0/10 | Nothing exists |
| CI/CD Test Gates | 2/10 | Commented out, wrong branch |
| Test Documentation | 3/10 | Minimal guidance in agent files |
| **Overall** | **3.4/10** | **Critical gaps across the stack** |
