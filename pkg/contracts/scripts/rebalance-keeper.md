# Rebalance Keeper Runbook

This keeper calls `rebalance()` on streaming CV strategies while avoiding obvious revert cases.

Script: `pkg/contracts/scripts/rebalance-keeper.sh`

## What it checks before sending

1. Candidate strategy discovery from subgraph:
   - `isEnabled = true`
   - `archived = false`
   - `config.proposalType == 2` (Streaming)
   - has at least one proposal with status `1` (Active) or `5` (Disputed)
2. `proposalType() == 2` onchain sanity check
3. `rebalanceCooldown()` / `lastRebalanceAt()` (skip if still in cooldown)
4. `eth_call` simulation of `rebalance()` from keeper address (skip on revert)

## Required env vars

- `RPC_URL`
- `KEEPER_PRIVATE_KEY`
- Either:
  - `SUBGRAPH_URL` (auto-discovery), or
  - `STRATEGIES` (manual comma-separated override)

## Optional env vars

- `DRY_RUN=1` (simulate only)
- `MIN_SECONDS_LEFT=3` (small cooldown buffer)
- `SUBGRAPH_PAGE_SIZE=500`
- `GAS_PRICE_GWEI=...`
- `PRIORITY_GAS_GWEI=...`
- `LEGACY_TX=1`

## Local test

```bash
RPC_URL=https://mainnet.base.org \
KEEPER_PRIVATE_KEY=0x... \
SUBGRAPH_URL=https://your-subgraph-endpoint \
DRY_RUN=1 \
bash pkg/contracts/scripts/rebalance-keeper.sh
```

## Cron example

Every minute:

```cron
* * * * * cd /path/to/gardens-v2 && \
  RPC_URL=https://mainnet.base.org \
  KEEPER_PRIVATE_KEY=0x... \
  SUBGRAPH_URL=https://your-subgraph-endpoint \
  MIN_SECONDS_LEFT=5 \
  bash pkg/contracts/scripts/rebalance-keeper.sh >> /var/log/gardens-rebalance-keeper.log 2>&1
```

## Suggested production hardening

1. Keep `DRY_RUN=1` in staging for a day and inspect skipped reasons.
2. Add alerting when a strategy has not been rebalanced for N minutes.
3. Run at least 2 keeper instances with different infra providers.
4. Rotate keeper keys and keep low hot-wallet balances.
