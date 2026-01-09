# End-to-end tests

Guide to run the Synpress/Playwright tests in this package and avoid the missing MetaMask extension error.

## Setup
- Install dependencies at repo root: `pnpm install`
- Copy `.env.sample` to `.env` and set `E2E_WALLET_SEED_PHRASE`.

## Build the MetaMask cache (required once per wallet setup change)
- From `pkg/e2e`, run: `pnpm exec synpress test/wallet-setup --force`
- This downloads MetaMask and stores a cached Chromium profile under `.cache-synpress/`, which `metaMaskFixtures` reuses during tests.

## Run tests
- From `pkg/e2e`, run: `pnpm test`
- Use `pnpm test:headed` for headed mode or `pnpm test --project chromium --ui` to debug.

## Unsupported OS warning
- The Synpress cache builder always uses Playwright's bundled Chromium.
- If the browser is missing, run `pnpm exec playwright install chromium` from repo root.
- You can still run tests with a system browser by setting `PLAYWRIGHT_BROWSER_CHANNEL=chromium` (or `chrome`) or `PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chromium`.

## Troubleshooting
- Error `[GetExtensionId] Extension with name MetaMask not found`: the cache is missing; rerun the cache build command above, then re-run tests.
- If the cache seems stale after changing wallet setup, pass `--force` (as shown) to rebuild it.
