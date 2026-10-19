# Unsupported Governance Tokens

`unsupportedGovernanceTokens.ts` is a curated frontend blocklist keyed by chain ID
and contract address. It is not a compatibility allowlist or an on-chain restriction.
Unknown tokens remain subject to the compatibility notice in community creation.

The expanded snapshot includes stETH, rUSDY, three legacy sOHM deployments, six
USDM deployments on supported networks, 150 Aave V3 aTokens, and 12,615 Circles
demurrage wrappers on Gnosis, in addition to RIBA, AMPL, and STA.

Increasing balances can leave yield outside Gardens' recorded stakes; decreasing
balances can underfund withdrawals. These are compatibility exclusions, not claims
that every listed token currently causes withdrawal insolvency. USDM's issuer
disabled rewards during wind-down; it is retained as an unsupported rebasing design.
Legacy sOHM entries likewise do not assert that rewards are still being issued.

## Snapshot Sources

Reviewed on 2026-10-19:

- [Weird ERC20](https://github.com/d-xo/weird-erc20/tree/781c8f039c106eb2d5c6071046b0dbb2f72c9870)
  identifies AMPL rebasing and STA transfer fees. Official project references in
  each entry establish the specific Ethereum addresses.
- [GoPlus API documentation](https://github.com/GoPlusLabs/OpenAPI/blob/main/SecurityAPI.md)
  describes address-based lookups, not an enumerable list of all incompatible tokens.
  The STA query recorded in the list returned `code=1`, `token_symbol=STA`, and
  `transfer_tax=0.01`. Missing entries or empty tax fields mean unknown.
- The verified RIBA contract on Celo implements demurrage through `balanceOf`,
  `decayBy`, and the shared demurrage multiplier.
- Aave V3 primary markets use the pinned address-book revision recorded in
  `unsupportedGovernanceTokenSnapshot.json`. Only `_A_TOKEN` constants are included;
  static wrappers and debt tokens are excluded. Additional Aave market deployments
  are not implied to be covered.
- Circles uses `CrcV2.ERC20WrapperDeployed` from its official RPC with
  `circlesType=0` (Demurrage), through block 48,838,250. The snapshot includes all
  matching indexed deployments through that block. `circlesType=1` (Inflation)
  wrappers are excluded. New deployments require a refresh.
- stETH, rUSDY, sOHM, and USDM entries link their official mechanics and deployment
  documentation in the TypeScript list. Origin tokens are not blanket-blocked:
  contracts default to non-rebasing unless opted in.

Do not import all Weird ERC20 examples: missing return values, upgradeability,
blocklists, and unusual approval rules alone do not establish incompatible staking
accounting. PAXG is not included from its historical fee example because Paxos now
advertises zero on-chain transfer fees:
https://www.paxos.com/pax-gold

## Maintenance

Add only confirmed addresses on their actual chains, with a specific incompatibility
reason and public evidence. Recheck mutable token behavior before adding or removing
an entry. Keep addresses lowercase and update the review date when refreshing the
snapshot. Run the adjacent unit tests after changes. No API is called at runtime.

To rebuild the Aave and Circles snapshot, run from `apps/web`:

```sh
node scripts/refresh-unsupported-tokens.mjs
pnpm exec prettier --write configs/unsupportedGovernanceTokenSnapshot.json
pnpm exec vitest run configs/unsupportedGovernanceTokens.test.ts
```

Review the address-book revision, chain coverage, Circles block/count, and diff
before committing. The refresh script rejects API errors and pagination failures;
it does not automatically discover new token families.
