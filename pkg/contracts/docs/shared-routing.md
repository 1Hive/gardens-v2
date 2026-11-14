# Shared strategy and community routing

Each CVStrategy and RegistryCommunity remains an ERC1967 proxy with its own state and owner. After migration, its implementation slot points to a family router. The router reads the core implementation and selector-to-facet mapping from the same RegistryFactory used to create new instances. Router UUPS upgrades retain `ProxyOwnableUpgrader` owner authorization.

## Release calls

- `setStrategyImplementation(newCore)` is one owner transaction for a core-only strategy release. `setCommunityImplementation(newCore)` does the same for communities.
- `setStrategyRelease(completeCuts, newCore)` is one owner transaction for a strategy release changing core and/or facets. `setCommunityRelease` is the community equivalent. These replace the complete selector set atomically; include every selector that should remain callable.
- `setStrategyFacets` and `setCommunityFacets` still replace the complete facet set and sync routing in one call. Once shared routing is active, the split `clear*FacetCuts` and `upsert*FacetCut` methods revert, because intermediate transactions would expose incomplete routing.
- A change that adds or changes per-instance state also needs an explicit, separately authorized `runImplementationMigration(data)` call on every affected proxy. A factory write cannot initialize individual proxy storage.

New routed strategies execute the factory's configured `strategyInit` and `strategyInitCalldata` during proxy construction, after the core's `init` state setup. The router's factory must match the creating community's factory. Existing strategies do not rerun this initializer when they migrate to a router.

The factory validates code-bearing implementation and facet targets, duplicate/reserved selectors, and that routed templates point back to this factory. Its owner controls shared releases. Existing proxy owners control migration and router UUPS upgrades. Owner permissions must be checked on the actual chain before preparing a release.

## Initial migration

1. Build and audit the new RegistryFactory implementation, both routers, current CVStrategy and RegistryCommunity core implementations, and the new CommunityPoolFacet. Verify storage layouts and run the contract suite. Upgrade the factory proxy using its existing governed owner flow. Do not change its templates yet.
2. Deploy the two routers with the factory proxy address in each constructor. Deploy the core implementations and CommunityPoolFacet. Check code hashes, UUPS UUIDs, owner resolution, and the routers' `routingFactory()` values.
3. Run `node scripts/prepare-shared-routing.mjs --help`, then invoke it with the target network, RPC, expected effective owner, deployed addresses, and an output directory. It reads the live factory and configured proxy list, rejects missing code and mismatched owners/factories, and writes phased Safe Transaction Builder JSON. It does not submit transactions. Reconcile the proxy list in `config/networks.json` with live indexed creation events before using the payloads; a missing proxy would remain on local routing.
4. Simulate and execute phase 01, which activates both shared releases and replaces CommunityPoolFacet. Migrate every existing community to its router in phase 02. Check implementation slots and a representative state and facet call after each batch.
5. Execute phase 03 to switch factory templates to routers. New communities and strategies now use shared routing. Migrate existing strategies in phase 04 and check implementation slots, ownership, state, pause behavior, and representative facet calls after each batch.

The ordering matters: old communities must receive the new CommunityPoolFacet before the strategy template switches. The old pool creation facet tries to make a local `diamondCut`, which a router intentionally rejects.

Current `UpgradeCVMultichain` and split facet upgrade scripts describe the older per-instance release flow. Use the shared release calls for routed instances, and do not run a legacy script that upgrades instances away from the routers.

## Gas and deployment gates

The local warm-read benchmark in `SharedImplementationRouter.t.sol` measured a direct proxy core read at 888 gas and a routed proxy core read at 6,432 gas, a 5,544 gas increase inside the test. Cold transactions, facet calls, writes, and pool creation need separate estimates on the target chain before quoting USD costs.

Run `scripts/verify-storage-layout.sh` against the final build before submitting migration transactions. An earlier version of the checker cached facet layouts by the facet's own source hash and missed changes to inherited base storage; it falsely reported five `_reentrancyLocked` mismatches. The checker now inspects fresh compiled layouts, and all CVStrategy facets match the core at slot 136, offset 1. The generator also requires a fresh live proxy inventory and transaction simulation; it cannot establish either by itself.
