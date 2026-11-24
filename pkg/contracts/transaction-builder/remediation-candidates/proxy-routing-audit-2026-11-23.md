# Shared-router proxy inventory audit (2026-11-23)

Purpose: check every Gardens V2 community and strategy proxy before renouncing the deployer's temporary `ProxyOwner.upgradeAccess`. This is a read-only routing audit; no renounce call was sent.

A routed proxy stores its family router in the ERC1967 implementation slot. That router identifies the chain's RegistryFactory and family; the factory holds the active core and facet routes. `scripts/verify-shared-routing.mjs` checked the live router/factory relation, code and UUPS compatibility, complete selector routing, and every configured proxy slot on all ten chains. The factory's live templates were checked as the router for each family. The final inventory contains 224 communities and 733 strategies, totaling 957 proxies.

| Chain | Communities | Strategies | Inventory checked through block | Source |
| --- | ---: | ---: | ---: | --- |
| Ethereum Sepolia | 2 | 312 | 12200179 | Full creation and pool logs via Alchemy RPC |
| Arbitrum Sepolia | 12 | 30 | 332176557 | Full creation and pool logs via Alchemy RPC |
| Optimism Sepolia | 4 | 8 | 51845266 | Full creation and pool logs via Alchemy RPC |
| Arbitrum One | 54 | 66 | 527010633 | Full creation and pool logs via Alchemy RPC |
| Optimism | 38 | 85 | 159947147 | Full creation and pool logs via Alchemy RPC |
| Polygon | 8 | 21 | 97858403 | Full creation and pool logs via Alchemy RPC |
| Gnosis | 23 | 79 | 49438765 | Full logs via Gnosis public RPC; Alchemy RPC head and factory nonce |
| Base | 42 | 32 | 61513492 | Full creation and pool logs via Alchemy RPC |
| Celo | 38 | 97 | 83592316 | Graph Studio 0.4.2 indexed inventory, factory nonce and recent Alchemy RPC logs |
| Ethereum | 3 | 3 | 26482502 | Full creation and pool logs via Alchemy RPC |

On Ethereum Sepolia, the event inventory initially found eight unlisted strategies. A ninth was created during the audit. All nine are already wired to the strategy router, and the event-backed `task sync-proxies` added them to `config/networks.json`. On Celo, the indexed inventory found two unlisted communities and their two strategies. All four are already wired to their family routers, and `task sync-proxies` added them. The native sync updated the corresponding inventory hashes. The other eight chain inventories matched the address book. The factory `nonce()` matched the community creation count on every chain. A final recent Alchemy RPC event scan found no new `CommunityCreated` or `PoolCreated` events after each inventory snapshot. All 957 configured proxies also linked to their chain's ProxyOwner and resolved effective ownership to the deployer at audit time.

Celo's Alchemy RPC limits `eth_getLogs` to 10,000 blocks and the available Etherscan and Blockscout API tiers could not supply full historical logs. Its historical completeness therefore rests on the current Graph Studio indexed set, corroborated by the live factory nonce and recent direct RPC logs. No direct full-history Celo RPC proof was obtained. Repeat an inventory freshness check immediately before any renounce transaction, because new proxies can be created after these block snapshots.
