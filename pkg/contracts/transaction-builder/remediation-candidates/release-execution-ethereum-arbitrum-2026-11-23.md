# Ethereum and Arbitrum remediation execution (2026-11-23)

Source: private advisory branch containing the PR #990 equivalent commit `3e631e5ece93fd81824b276bd8c3727726b3b26c`. Executor: `PK_DEPLOYER` at `0x00BcC26E792E393217bA895f5e85AE628FC994E9`. The user approved the exact six SHA-256-hashed payload files in `ethereum-arbitrum-release-review-2026-11-23.md`. Preflight rechecked all six hashes, chain IDs, deployed candidate code, direct ownership, old active releases, and escrow inventories. Every transaction below used its approved file calldata in order; each receipt succeeded and its expected live effect was read before the next transaction.

| Order | Chain | Effect | Transaction hash |
| --- | --- | --- | --- |
| 1 | Ethereum | Strategy release | `0xe96598d2eef5dcd1603f6433690637aecaf85a5283ee5d377678273ee6da0339` |
| 2 | Ethereum | Community release | `0xc91ac3655b0b4bc20535e2cc07b503846beb791de7c8d6c6e15fcecf8e556c47` |
| 3 | Ethereum | Escrow factory template | `0x8b4e0c456a5d7b353eec0c07321a46bde4cbb08b1c7509d8227c19dfca3dc4e5` |
| 4 | Arbitrum One | Strategy release | `0xa00494779602159564dca13f44e2a42b70b4aab8ee745c4fb8c1319518331df9` |
| 5 | Arbitrum One | Community release | `0xeb6bfd5c6a3e9e7f7baa39ef518c595c2f49c23a46f0254bd197935ff4702030` |
| 6 | Arbitrum One | Escrow factory template | `0x44d45689ec9f61b71afc9c85aa725eb4385c328ecd551c6005f134b8ff3ba9c2` |
| 7 | Arbitrum One | Existing escrow implementation | `0x52bca580687b9b5541edddcc925932d9858109912bd5e7d7ef322ea1207a20cc` |

The machine-readable receipt, target, order, and source-file hash record is `execution-ethereum-arbitrum-2026-11-23.jsonl` (7/7 successful receipts). `config/networks.json` was reconciled only after execution: the live strategy and community cores, eight changed strategy facets, chain-local `CV_UTIL_LIB`, and escrow implementation were promoted on Ethereum and Arbitrum; their promoted `CANDIDATES` entries were cleared. The other eight networks' active implementation records were already present. A read-only comparison against live factory cores, all eight facet addresses, library code, and escrow templates passed on all ten networks. `verify-shared-routing.mjs` passed on all ten networks, including every configured strategy and community proxy. `verify-all-deployments.sh --scope state` passed for Ethereum and Arbitrum.

## Upgrade access handoff assessment

At assessment time, `upgradeAccess()` still resolved to the deployer on all ten ProxyOwners. Their factory and escrow-factory ownership chains resolve through the configured ProxyOwner. All 944 configured strategy/community proxies and all 37 enumerated existing escrows resolved through their chain's ProxyOwner to the deployer. The current upgrade wallet had at least twice the estimated native gas for `renounceUpgradeAccess()` on each chain. On seven mainnets, `mainOwner()` resolved to governance Safe `0x9a17De1f0caD0c592F656410997E4B685d339029`, whose threshold was 3 on each checked chain. On three testnets, `mainOwner()` resolved to `0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD`, matching the available `PK_TESTNET_OWNER` keystore. These checks support renouncing the temporary `upgradeAccess` grant chain by chain after a final fresh read. They do not support calling `renounceOwnership()`, which would remove the underlying owner and disable owner-only recovery. No renounce transaction was sent as part of this release.
