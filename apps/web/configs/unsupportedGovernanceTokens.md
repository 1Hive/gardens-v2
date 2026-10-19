# Unsupported Governance Tokens

`unsupportedGovernanceTokens.ts` is a curated frontend blocklist keyed by chain ID
and contract address. It is not a compatibility allowlist or an on-chain restriction.
Unknown tokens remain subject to the compatibility notice in community creation.

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
