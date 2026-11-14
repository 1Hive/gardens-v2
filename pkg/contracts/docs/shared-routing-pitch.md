# Shared upgrades for Gardens contracts

## The idea

Today, every CVStrategy and RegistryCommunity has its own proxy. Upgrading all of them means updating many contracts one by one.

We can point each proxy to a stable router. The proxy still keeps its own data and owner. When someone calls it, the router asks its RegistryFactory which implementation or facet should run. The factory becomes the shared source of truth for upgrades.

## What gets easier

- **One core upgrade per family:** After migration, one factory transaction updates the core implementation used by every strategy. Communities have a separate one-transaction upgrade.
- **Facets can move together:** One release transaction per family can change the core implementation and its complete facet list at the same time.
- **New contracts join automatically:** Newly created communities and strategies use the routers from the start.
- **Existing upgrade authority stays in place:** Router upgrades still follow the current ProxyOwner authorization.

## The trade-offs

- **The first move takes work.** Every existing community and strategy proxy must be migrated once. The one-transaction benefit applies after that migration.
- **Calls cost more gas.** The router reads the factory on each call. A local warm core-read test measured about 5,544 extra gas; real transaction costs will vary.
- **A shared mistake has a wider effect.** A bad factory release can affect every migrated instance, so releases need careful review and simulation.
- **Stored data is still individual.** If an upgrade needs to initialize or change each proxy's stored data, each proxy still needs its own migration transaction.
- **Rollback needs planning.** Reverting a core release is easier than reverting a faulty router or the initial migration. After switching to routers, the current factory does not allow a simple switch back to the old templates.

The code passed the focused tests and a Codex Security diff audit found no confirmed issue. This is not yet an on-chain rollout: live addresses, proxy inventory, deployed code, and transaction simulations still need checking before migration.
