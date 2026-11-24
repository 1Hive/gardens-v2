# ProxyOwner upgrade-access renunciation — 2026-11-23

The deployer `0x00BcC26E792E393217bA895f5e85AE628FC994E9` called `renounceUpgradeAccess()` (`0x43083c8a`, zero value) on each configured chain's live `ENVS.PROXY_OWNER`. These are ten independent, successful on-chain transactions. The underlying `mainOwner()` remains the governance Safe on seven production networks and `pkGarden` on three testnets.

| Network (chain ID) | ProxyOwner | Transaction | Block | Effective owner after |
| --- | --- | --- | ---: | --- |
| Ethereum Sepolia (11155111) | `0xcd57ff46329333816530110fb8160242a650573c` | `0x6c846af8f4dc5411a630492bdd12fe30a5d02c878e059e1e6a706c63d7cf6662` | 12200269 | `pkGarden` |
| Arbitrum Sepolia (421614) | `0x333837ec0D4F3D9b3dF0216996a148B46ce3541b` | `0xf2ed1861dddbb6bd65493b626f53c898f5800fc86871f25369510952c6e61fc4` | 332180653 | `pkGarden` |
| Optimism Sepolia (11155420) | `0x08Df82f74D1f56F650E98da2dd4240F1A31711bc` | `0xcbb30839848c1a921cf17c442b7596d8f7abd6ea03ec6f2ae77c062ba16c93d4` | 51845847 | `pkGarden` |
| Arbitrum One (42161) | `0x5Bbeb8eBa98dDB8fD0D91965748D23Ca5C8bbad6` | `0x724023cd17b04eb2c0f1de8f2d9b55ddb304d71a0bcfb2e1d96db6fe6cab2e49` | 527014786 | governance Safe |
| Optimism (10) | `0x129f253F78E33A0312EF8E59fae7699Ef6e8Dbef` | `0x75d0bc573d9c2efeeeef8d5c208afbe3ccd34d56e83efc3f95cb777efe5f2acb` | 159947750 | governance Safe |
| Polygon (137) | `0x7d0E4223f987FbedE709842BfD273f7cea393f24` | `0xe68cad0d060fca7240a9fdf4eea488331618f91c747cfb1adcfb9cc304fea73e` | 97859231 | governance Safe |
| Gnosis (100) | `0x91ab7A20cC3AeE799dF908fa1B2571fE8e07394A` | `0x8ecd5c42855d79ca664e4a06309e9aacc236f536853e4818ac3029af9355adda` | 49438996 | governance Safe |
| Base (8453) | `0x99ebef5e196a9e8e39d92b18663c9236661607b1` | `0xa05c013b09c6ab2eee3ea0722c5d8d7a6202b6bd6021a4f66be3f8f533a84d28` | 61519738 | governance Safe |
| Celo (42220) | `0x99EBeF5E196a9e8e39d92B18663C9236661607b1` | `0xea3e50ed02688aa47299b8dfc0c734453e208204f5283a1792f1ecc323fe91e1` | 83593569 | governance Safe |
| Ethereum (1) | `0x0e676bcfab3286c18d1fcedaaddb632e16a2ebcb` | `0x3d971663cb666d6581e7a36934900332bc2e7237b67c32d711faa8d0bb76b829` | 26482609 | governance Safe |

The governance Safe is `0x9a17De1f0caD0c592F656410997E4B685d339029` (threshold 3 on each production network). `pkGarden` is `0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD`. Before execution, each RPC chain ID, ProxyOwner code and upgrade grant, permanent owner, factory owner, and gas estimate matched the intended chain; all ten fork rehearsals cleared the grant and returned the factory and configured community/strategy fleets to the expected owner. Fresh creation and pool logs showed no additions before broadcast, and the routed verifier passed on all ten chains.

After execution, each successful receipt was checked for the expected sender, ProxyOwner target, and calldata. Live `upgradeAccess()` was zero and `owner()` and `mainOwner()` matched the permanent owner on all ten ProxyOwners. Multicall checked effective `owner()` and `proxyOwner()` for 1,043 contracts: the 957 then-configured community and strategy proxies, ten factories, 37 existing escrows, and configured owner-controlled singletons. One Ethereum Sepolia strategy (`0x2CCB1e76B0fEb5af5c8Ae708CC77F9c27ab07aBC`) was created after those reads; its router slot and owner link were checked directly, and event-backed proxy sync added it to `networks.json`, bringing the saved fleet to 224 communities and 734 strategies. The routed verifier passed again for all 313 Ethereum Sepolia strategies. A final creation/pool event check found no additional proxies through Ethereum Sepolia block 12200303, Arbitrum Sepolia 332182301, Optimism Sepolia 51846045, Arbitrum One 527016052, Optimism 159947927, Polygon 97859442, Gnosis 49439056, Base 61521290, Celo 83593875, and Ethereum 26482632.

The first Arbitrum One legacy-fee send was rejected before mining when the base fee rose; the successful transaction above used the current fee mode. The Celo historical-inventory limitation remains as documented in `proxy-routing-audit-2026-11-23.md`: completeness there is based on indexed Graph Studio data, factory nonce, and recent RPC events rather than a direct full-history RPC scan.
