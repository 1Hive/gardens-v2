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

## Deployment and later releases

- `DeployCoreContracts` phase 2 installs both routers and activates both factory releases for a **new** factory. It refuses to rerun phase 2 once shared routing is active. Its phase 1 factory and core implementation addresses are used directly when `all` runs in one script invocation.
- For an existing factory, `DeploySharedRoutingTargets` with `SHARED_TARGET_MODE=migration` deploys the candidate factory implementation, both routers, both cores, and CommunityPoolFacet. `task deploy-shared-routing-targets` wraps it using `NETWORK`, `RPC_URL`, and `PK_DEPLOYER_PW`. It prints the candidate addresses and does not update the active network config or upgrade the factory. Upgrade the factory through the governed flow, then use `prepare-shared-routing.mjs` to create the phased migration payloads.
- After migration, `DeploySharedRoutingTargets` with `SHARED_TARGET_MODE=release` and `SHARED_TARGET_FAMILY=strategy` or `community` deploys a new core implementation. `RefreshFacetSnapshots` can deploy changed facets. These deployment steps do not activate a release. Keep candidate addresses separate from the active config until the Safe transaction executes.
- `node scripts/prepare-shared-release.mjs --network <name> --rpc <url> --family strategy|community --expected-owner <owner> --out <file> [--implementation <new-core> --storage-reviewed] [--facet <old-address>:<new-address> ...]` reads the live complete selector set and prepares one `setStrategyRelease` or `setCommunityRelease` Safe transaction. `task prepare-shared-release` wraps the same command with `NETWORK`, `RPC_URL`, `FAMILY`, `EXPECTED_OWNER`, `OUT`, optional `NEW_IMPLEMENTATION` plus `STORAGE_REVIEWED=true`, and optional space-separated `FACET_REPLACEMENTS` environment variables. The script checks the configured proxies all use the current router. Reconcile that list with creation events before relying on the result.
- `--storage-reviewed` records an operator assertion; it does not compare layouts. Review the deployed old and candidate storage layouts, linked libraries, per-instance migration needs, and exact payload simulation before signing. If new state needs initialization, prepare one `runImplementationMigration(data)` call per affected proxy and account for the interval between release and migration.
- `scripts/verify-all-deployments.sh` selects `verify-shared-routing.mjs` for routed factories. This checks live router wiring, factory selector mappings, core and facet code presence, and the implementation slot of every configured proxy. It does not establish that `networks.json` includes every live proxy or that candidate bytecode matches a local artifact.
- After each executed migration phase or release, reconcile `config/networks.json` with the live factory: `.IMPLEMENTATIONS.CV_STRATEGY` and `.IMPLEMENTATIONS.REGISTRY_COMMUNITY` are the active cores, and `.IMPLEMENTATIONS.CV_STRATEGY_ROUTER` and `.IMPLEMENTATIONS.REGISTRY_COMMUNITY_ROUTER` are the router templates. Keep `.FACETS` aligned with the live complete cut sets. `VerifyNetworkConfigState` checks these values and requires routed implementation slots once shared routing is active.
- The old `UpgradeCVMultichain`, diamond upgrade, and individual facet replacement scripts remain for chains that have not migrated. They reject a factory or proxy using shared routing. The unused `GenerateFacetUpgradePayloads` script was removed; use `prepare-shared-release.mjs` after migration.

## Gas and deployment gates

The local warm-read benchmark in `SharedImplementationRouter.t.sol` measured a direct proxy core read at 888 gas and a routed proxy core read at 6,432 gas, a 5,544 gas increase inside the test. Cold transactions, facet calls, writes, and pool creation need separate estimates on the target chain before quoting USD costs.

Run `scripts/verify-storage-layout.sh` against the final build before submitting migration transactions. An earlier version of the checker cached facet layouts by the facet's own source hash and missed changes to inherited base storage; it falsely reported five `_reentrancyLocked` mismatches. The checker now inspects fresh compiled layouts, and all CVStrategy facets match the core at slot 136, offset 1. The generator also requires a fresh live proxy inventory and transaction simulation; it cannot establish either by itself.
