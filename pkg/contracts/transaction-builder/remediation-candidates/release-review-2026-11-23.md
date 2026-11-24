# Advisory remediation release review — 2026-11-23

Source: private PR #1 at `79daf0c06008c6a4d387b97e25b6f0038cb67307`. PR #990 source commit `5178b89e05437919312a913f29227229a3069686` is included as the identical three-file change in private commit `3e631e5ece93fd81824b276bd8c3727726b3b26c`.

Executor: direct `PK_DEPLOYER` address `0x00BcC26E792E393217bA895f5e85AE628FC994E9`; all transaction values are zero. Within each chain, execute strategy, community, then escrow files in the order shown. Each file lists its internal transaction order.

| Chain | File | Transactions | SHA-256 |
| --- | --- | ---: | --- |
| ethsepolia | `ethsepolia-strategy-release.json` | 1 | `c0bbf9363c7fc1339b93d57834c1a0e2077e630f120e082e624a6db65659c57e` |
| ethsepolia | `ethsepolia-community-release.json` | 1 | `902768e4fd90212c011ad3aef2585badb6b8b139adcd933be0e6f914e611c7cc` |
| ethsepolia | `ethsepolia-escrow-release.json` | 20 | `0d18207c46cc01eab5cfb5c059e35a83de84422b0881c00acef67d22fde03a36` |
| arbsepolia | `arbsepolia-strategy-release.json` | 1 | `4bfe90888e9e47d0f088dc3b8265f1423a43a42dd1c86e1be39b19d5900ca8e3` |
| arbsepolia | `arbsepolia-community-release.json` | 1 | `d503f4f14561437aee463c082a8b2521d78297722e824e486b62d61ff37cc9e3` |
| opsepolia | `opsepolia-strategy-release.json` | 1 | `7c782cfe7f98fc207a9c531f6f92bf0d40cea3dfbc877a53e22385c0740b9518` |
| opsepolia | `opsepolia-community-release.json` | 1 | `bfc1eb075cd1e2570b5b9793e2bfc434f91b8f69431f39f92c49e18e3dd8d3ad` |
| opsepolia | `opsepolia-escrow-release.json` | 1 | `cef3ff86b31e4fb47521f2445dfb617574d2884e9216ad7655e73c0f909673d4` |
| optimism | `optimism-strategy-release.json` | 1 | `c3016b638723a65ef88bac6270a6c18a5288ca7039520d2fcc94769fe6cec47d` |
| optimism | `optimism-community-release.json` | 1 | `83f25df26018fd207b0f9057648e71ed0e4e3c7d1cbb47abd290bf0ed0423ff5` |
| optimism | `optimism-escrow-release.json` | 7 | `a1ecca3a3fe13e614ba2e2a0a2eabee86e427bb64829b3fe38ab9da46fa8458e` |
| polygon | `polygon-strategy-release.json` | 1 | `64f59a51a484c46d0b3640bff006fc1c3cab7689e76053567909a76204180258` |
| polygon | `polygon-community-release.json` | 1 | `ae06768f2b891b8b52528b76e5281a06e45c4ddbd45c3dc1ff60a645ac48ae60` |
| polygon | `polygon-escrow-release.json` | 1 | `277cbcd84b6823b027825e3302ec865a690262224a4a103184214c33c84fd889` |
| gnosis | `gnosis-strategy-release.json` | 1 | `52fb20b3891d4a126e0d5c56822e7cf081973459811d5b752052473988e78eac` |
| gnosis | `gnosis-community-release.json` | 1 | `e7ae260f623dfd100bfb352fc5c0e050c753fe5b71f40dc3233bfcc0c48278f6` |
| gnosis | `gnosis-escrow-release.json` | 1 | `cdd1f285584c32a5b1666785ca43c3ca8350021ee2e926ffbcefd0b12be1bf68` |
| base | `base-strategy-release.json` | 1 | `dfb03125e22005659993d0f10efcc86c13c4795b20b030583db8fac34205178a` |
| base | `base-community-release.json` | 1 | `9ee33192883af1159352ba10acd1e3c2c98cd9e9b886dcf096a2f72eeed91bf9` |
| base | `base-escrow-release.json` | 3 | `df7e594c11e9965103b53c640883ffee0a3b2cd144eb11966d7d25936a555a45` |
| celo | `celo-strategy-release.json` | 1 | `72acd45c7e3859a510529eff760df0d6c132bbf61b143dc5e82a10fd5ae83255` |
| celo | `celo-community-release.json` | 1 | `239280d91c7edc62d4b02b55bf7ae34cfac670f0b13a3edc9b40d1cfcdca2e1a` |
| celo | `celo-escrow-release.json` | 19 | `0ce0ec2b35d8a7a18642ea339d471e74624393adc40bb9dd0a8d7cdd79567c3a` |

**Total:** 68 direct-owner transactions in 23 files on eight chains.

Verification: full non-fork Foundry suite and advisory coverage gate passed; storage alignment passed; 95 deployed candidate runtime hashes match the saved manifests; all eight ordered releases passed fork rehearsal with candidate core, selector, representative proxy state, and every escrow check. Live RPC reads confirmed chain IDs and direct upgrade ownership on all eight chains before this report.

The user approved these exact 68 transactions and 23 file hashes. All 68 direct-owner transactions were sent in the listed order on 2026-11-23 and have successful on-chain receipts. `execution-2026-11-23.jsonl` records each transaction hash, block, target, and approved file hash. A separate post-execution check re-read every receipt and transaction, confirmed the exact calldata, signer, and consecutive chain-local nonces, and verified the active cores, new dispute selectors, escrow templates, and every escrow instance against the Alchemy RPCs from the Gardens contracts `.env`. The repository config/state verifier and routed proxy verifier passed on all eight chains. `config/networks.json` now contains the activated implementation, facet, library, escrow, and factory cut digest values; promoted candidate entries are cleared.

Ethereum and Arbitrum have configured live deployments but no remediation candidates or release files in this PR; they need a separate preparation and rehearsal before upgrade. Web deployment is also outside these contract transactions.
