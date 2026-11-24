# Ethereum and Arbitrum remediation release review (2026-11-23)

Source: private advisory branch at `f9e1bb938397f714c15ece552a6182c982642117`, including the PR #990 equivalent commit `3e631e5ece93fd81824b276bd8c3727726b3b26c`. Executor on both chains: direct `PK_DEPLOYER`, `0x00BcC26E792E393217bA895f5e85AE628FC994E9`. These files are ordered direct-owner transaction data, not Safe proposals. The earlier approval of 68 transactions on eight other chains does **not** cover this release.

| Order | Chain (ID) | Exact file | Transactions | SHA-256 |
| --- | --- | --- | ---: | --- |
| 1 | Ethereum (1) | `ethereum-strategy-release.json` | 1 | `6903c604fcbc52c2028f4f51d8ac425b6e8c8cb4a9c7e19454d394180b123cf9` |
| 2 | Ethereum (1) | `ethereum-community-release.json` | 1 | `74e23e9ffe18a68c92d4aff670f3636d31efdc0a87348ee20a56606dfda70769` |
| 3 | Ethereum (1) | `ethereum-escrow-release.json` | 1 | `6ed13f6a002210ba1fbf276854e8cdde40d7590aaf153e10b9a5aff93c0771f2` |
| 1 | Arbitrum One (42161) | `arbitrum-strategy-release.json` | 1 | `a0abdc8acdf1e188e0ad7f0822d5dedac9f7e237f71ba1b2d650b46495929f84` |
| 2 | Arbitrum One (42161) | `arbitrum-community-release.json` | 1 | `896a452e3edae8a4319fdc27330d4d4a18128c4d2692ea26ff5fc4f94eae4445` |
| 3–4 | Arbitrum One (42161) | `arbitrum-escrow-release.json` | 2 | `6728c823b4400a8705d0a9e228d47cdcec20a77d155dbbdb68bea07b0b70bb7b` |

## Effects and targets

- Ethereum factory `0x7D26c5B083B85B848645fcBd18Fe01168989333b`: `setStrategyRelease` activates core `0x8539c4400205615F8506F4eDaA36C74835c6fA80` and eight candidate facets in nine complete cuts with 49 unique selectors, including `0x0e8daf2f` and `0xf4a95471`; `setCommunityRelease` activates core `0x8a18370A31EB1D10886b22cca8760506216E2bEe` with seven complete cuts and 51 selectors. Escrow factory `0x87ad877E190a18fA4Da4F4CaBFd5C137353f5f57` switches its template to `0x3F0a53ae8A49bF44626D92249Dd5B9ce28efe722`. It has zero existing escrows.
- Arbitrum factory `0xc1c2E092b7DbC8413E1aC02e92C161b0BDA783f6`: `setStrategyRelease` activates core `0xA099934Ff1AE8491C4A0BF10FF982e1e00919426` and eight candidate facets in nine complete cuts with 49 unique selectors, including the two new dispute selectors; `setCommunityRelease` activates core `0x2EFF74F6797eC3Baee5FedDf6b833BE9CeAccec6` with seven complete cuts and 51 selectors. Escrow factory `0xbe52a852eAF824cd221AA55c3Ee054f6c8c712Df` switches its template to `0x56b0ce5666F8560e6Ca51ba6A14AcB5435a189A6`, then existing escrow `0x482a77F998C8821714A9DED77805CA552f61EFef` executes `upgradeTo` for that candidate. Its storage is the current layout, so no legacy reinitializer is needed.

## Proof and live baseline

All 24 inactive candidate creations have success receipts, compiled-runtime matches, and chain-local linked-library checks in `ethereum.json` and `arbitrum.json`. The full nonfork Foundry suite, advisory PoC coverage check, and storage alignment check passed on this source. The old-to-new source diff does not change positional storage declarations in the strategy, community, or escrow contracts; newly used named storage remains at fixed independent slots. Both exact file sequences passed disposable fork rehearsals: candidate core and selector routing, representative strategy and community state and ownership, router slots, escrow template and existing-instance identity were checked.

Immediately before this review, live RPC reads still showed the old active strategy cores, 3 Ethereum strategy and 3 community proxies, 66 Arbitrum strategy and 54 community proxies, zero Ethereum escrows, and one Arbitrum escrow. The shared-routing verifier passed against every configured proxy on both chains. `ProxyOwner.upgradeAccess()`, ProxyOwner `owner()`, factory `owner()`, escrow-factory `owner()`, and Arbitrum escrow `owner()` all resolved to the direct executor. Recheck ownership, escrow inventory, and these file hashes immediately before broadcasting. Activate only after the explicit approval of these seven transactions, then reconcile the address book from confirmed receipts.
