# Gardens V2 E2E Patterns

## Project Map

- E2E package: `pkg/e2e`
- Playwright config: `pkg/e2e/playwright.config.ts`
- Tests: `pkg/e2e/tests/*.e2e.ts`
- Shared helpers: `pkg/e2e/tests/utils/`
- GitHub workflow: `.github/workflows/e2e.yml`
- Web app test IDs and UI behavior usually live under `apps/web/`

`pkg/e2e` uses Playwright plus Synpress. Tests run with one worker, serial project dependencies, and CI retries. The base URL is:

```ts
process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
```

Do not use `E2E_BASE_URL` for repro commands.

Useful package scripts:

```bash
pnpm --filter e2e run build-cache
pnpm --filter e2e run test
pnpm --filter e2e run test:ci
```

At the time this skill was created, the package used `@playwright/test`, `playwright-core`, `@synthetixio/synpress`, and `viem`.

## Ordered Flow

The Playwright projects form one lifecycle:

```text
00-prepare
01-join
02-stake
03-create-pool
04-approve-pool
05-edit-pool
06-create-proposal
07-activate-governance
08-allocate-proposal
09-cancel-proposal
10-execute-proposal
11-dispute-proposal
98-leave
99-archive-pool
```

When adding a scenario, place it where the protocol state naturally belongs and update project dependencies. The flow should remain self-cleaning: `00-prepare` clears stale state before a run, and final steps undo membership or archive the pool.

## Configuration And CI

`pkg/e2e/tests/utils/config.ts` reads `_CI` variables when `CI=true`:

- `E2E_RPC_URL_CI`
- `E2E_COMMUNITY_ID_CI`
- `E2E_CHAIN_ID_CI`
- `E2E_POOL_TOKEN_ADDRESS_CI`
- `E2E_GOVERNANCE_TOKEN_ADDRESS_CI`
- `E2E_SUBGRAPH_URL_CI`
- `E2E_WALLET_SEED_PHRASE_CI`

The E2E GitHub workflow runs on main pushes, PRs targeting main, and manual `workflow_dispatch`. Manual `preview_url` input is normalized so `app.gardens.fund` becomes `https://app.gardens.fund`. If no preview URL is specified, the workflow resolves a Vercel deployment for the commit and falls back to the branch alias when Vercel reports ignored builds or unaffected projects.

## Helper Inventory

Prefer existing helpers before adding new direct calls:

- `getConfig()` validates and returns chain, community, token, RPC, subgraph, and wallet configuration.
- `createE2EChain()` builds the viem chain object for the configured chain.
- `gotoE2ECommunity(page)` opens `/gardens/${chainId}/${communityId}`.
- `fetchAlloAddress(subgraphUrl, chainId)` gets the Allo address from the subgraph.
- `waitForMembershipActive()` and `waitForMembershipInactive()` poll chain state for membership.
- `leaveCommunityIfMember()` cleans wallet membership directly when needed.
- `archivePools()` queries unarchived pools and archives them through the registry community contract.
- `waitForMemberPowerActive()` waits until member power is usable by the strategy.
- `getByTestId(page, testId)` scopes to `[data-testid="..."]:visible` and returns the first visible element. Use it when desktop and mobile markup both contain the same test ID.
- `connectWallet(page, metamask)` handles wallet modal selection, account display verification, and network selection.
- `confirmTransaction({ metamask, extensionId })` confirms MetaMask notification pages robustly.
- `approveTokenAllowance(...)` handles allowance flows through MetaMask.
- `expectNoErrorToast(page)` catches UI error toasts.

## Selector Policy

Prefer stable `data-testid` selectors for app-owned UI. If a test needs to interact with or assert against an app control that does not have a stable test ID, add one in `apps/web` as part of the E2E change instead of relying on text, layout, CSS classes, or component-library internals.

Use `getByTestId(page, "...")` from `pkg/e2e/tests/utils/locators-utils.ts` for app controls so hidden mobile or desktop duplicates are automatically scoped to visible elements. Native Playwright role/text locators are still acceptable for browser-owned or wallet-extension UI where the app cannot provide test IDs.

## UI Versus RPC Boundary

Use direct RPC and subgraph queries to make state deterministic, but do not bypass the UI behavior under test.

Good RPC setup examples:

- Archive stale active or pending pools in `00-prepare`.
- Leave the community before the join flow starts.
- Mint pool tokens directly to a strategy before executing a funding proposal.
- Create a proposal only when none already exists for a later execute/dispute test.
- Allocate support or perform other prerequisite writes when that UI path is covered elsewhere.

UI actions that should stay UI actions:

- Join community.
- Stake when the stake UI is the subject.
- Create and edit pool flows.
- Create, cancel, execute, archive, or dispute proposals/pools when the goal is to cover those user-facing controls.
- MetaMask confirmation paths for the action under test.

For an execute proposal test, RPC can ensure an executable proposal exists and fund the pool, but execution itself should click the visible UI execute button and confirm through MetaMask.

## Token Funding Pattern

When a proposal execution needs pool funds:

1. Prefer minting directly to the strategy or pool address if minting is open:

```ts
await walletClient.writeContract({
  address: poolToken,
  abi: erc20MintableAbi,
  functionName: "mint",
  args: [strategyAddress, amount],
});
```

2. Wait for the receipt and assert success.
3. Verify the strategy/pool token balance with a viem read.
4. Use wallet transfer only as a fallback when direct mint is not available, and fail with a clear balance message if the wallet is underfunded.

This avoids tests stalling because the E2E wallet has insufficient token balance.

## Waiting And Flakiness Rules

- Prefer `expect.poll` around chain, subgraph, and UI readiness.
- Typical intervals are `[1000, 2000, 3000, 5000]`; long protocol waits often use `180000` ms.
- Always wait for transaction receipts with confirmations and assert `receipt.status === "success"`.
- If UI readiness lags behind RPC state, wait for hydration or reload once intentionally; avoid aggressive reload loops.
- Never force-click a disabled button to pass a test.
- If a page is blank or stuck, inspect trace network activity and client errors before adding more waits.
- Use visible-only locators for duplicated desktop/mobile elements.

## Scenario Patterns

### Prepare Cleanup

`00-prepare.e2e.ts` should make the run deterministic. It can use RPC/subgraph to:

- Archive active, pending, or otherwise unarchived pools discovered from the subgraph.
- Leave the community if the E2E wallet is already a member.
- Clear other state that would block the lifecycle from starting.

### Archive Pool

The final archive test should mirror user behavior:

1. Query the latest enabled and unarchived strategy from the subgraph.
2. Navigate to `/gardens/${chainId}/${communityId}/${poolId}`.
3. Connect wallet.
4. Click visible `data-testid="btn-archive"`.
5. Confirm MetaMask.
6. Assert no error toast.
7. Poll the subgraph until `archived === true`.

### Execute Proposal

The execute test should:

1. Select an existing active proposal, or create one directly only if none exists.
2. Fund the strategy/pool directly through RPC if needed.
3. Allocate enough support through RPC to cross the threshold.
4. Poll on-chain proposal state until conviction exceeds threshold.
5. Navigate to the proposal page.
6. Connect wallet if the UI action requires it.
7. Wait for visible `btn-execute-proposal` to become enabled.
8. Click the button, confirm MetaMask, and poll on-chain proposal status until executed.

If the first attempt fails because the execute button stays disabled while on-chain state is executable, investigate UI hydration and data refetch behavior.

### Dispute Proposal

A dispute proposal test should follow the same principle as execute:

1. Pick a latest enabled funding pool.
2. Ensure an active proposal exists, reusing one when possible and creating through RPC only when none exists.
3. Prepare dispute prerequisites with RPC if needed: membership, collateral, token approval, or other protocol requirements.
4. Open the proposal detail page.
5. Use stable visible test IDs for the dispute controls, for example `btn-dispute-proposal`, modal controls, and confirm buttons.
6. Click the UI dispute path and confirm MetaMask.
7. Poll on-chain or subgraph state until the proposal is disputed.
8. Assert the UI displays the disputed state and no error toast.

Do not execute the dispute itself through RPC if the purpose is to test the UI path.

## Debugging Workflow

1. Reproduce against the exact URL Playwright uses:

```bash
cd pkg/e2e
CI=true PLAYWRIGHT_BASE_URL="https://gardens-v2-git-e2e-1hive.vercel.app" pnpm exec playwright test tests/08-allocate-proposal.e2e.ts --project=08-allocate-proposal
```

2. Inspect Playwright traces, screenshots, and videos. For UI failures, open a browser or ask the user what they see instead of blind-fixing.
3. Compare the last pushed GitHub Actions run with local repro. CI may fail earlier than a targeted local command if dependencies set up state differently.
4. Check Sepolia ETH balance before wallet-confirmation-heavy tests. MetaMask can remain stuck in confirmation flows when the wallet lacks gas.
5. Watch for subgraph rate limits. If the subgraph is overloaded, stop repeated repros and clean up local changes before pushing.

## Source Exploration Checklist

Before implementing a new E2E test:

- Read the nearest existing test with the same lifecycle shape.
- Search `apps/web` for the relevant `data-testid`.
- Add missing app-owned `data-testid` hooks needed by the test before falling back to less stable selectors.
- Search contract ABIs and generated types for required RPC reads/writes.
- Check whether the state is indexed in the subgraph or must be read on-chain.
- Verify whether a mobile duplicate exists and use `getByTestId` for visible scoping.
- Avoid CSS, layout, translated text, and component-library selectors for app-owned controls when a `data-testid` can be added.
- Keep any new helper generic enough for the next lifecycle test, but do not introduce a broad abstraction for one call site.
