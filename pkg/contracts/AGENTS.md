# AGENTS.md

Guidance for coding agents working in `pkg/contracts`.

## Scope

- Foundry package for Gardens protocol contracts.
- This package is security-sensitive and upgrade-sensitive.
- Changes here can require coordinated updates in `apps/web` and `pkg/subgraph`.

## Important Directories

- `src/`: Solidity contracts
- `test/`: Foundry tests
- `script/`: deployment and upgrade scripts
- `scripts/`: ABI aggregation, verification, and operational scripts
- `config/`: network config

## Commands

Run from `pkg/contracts` unless stated otherwise:

```bash
pnpm build
pnpm test
pnpm test:force
pnpm lint
pnpm format
pnpm coverage
pnpm sync:abis
```

Useful direct commands:

```bash
forge build --sizes --root ../.. pkg/contracts/src
forge test -vvv
./scripts/verify-storage-layout.sh
task -l
```

Safe submission helpers already in this package:

```bash
python scripts/submit_safe_payloads.py --help
task submit-safe-payloads-arbitrum
task submit-safe-payloads-optimism
```

## Architecture Notes

- Core contracts include `RegistryFactory`, `RegistryCommunity`, and `CVStrategy`.
- The system mixes diamond-based contracts and upgradeable components.
- Storage layout changes are high risk, especially for diamond storage shared across facets.
- ABI aggregation happens via `scripts/aggregate-diamond-abi.js`.

## Working Rules

- Never reorder storage variables or change existing storage types in upgradeable contracts.
- New storage belongs at the end of the layout, following the package's established upgrade pattern.
- For on-chain reads, first resolve the target network entry in `config/networks.json`, then select the contract address from the matching section (`ENVS`, `PROXIES`, or `IMPLEMENTATIONS`) before running `cast call`.
- After a facet refresh flow, treat `config/networks.json` as the source of truth for the latest implementation and facet addresses; do not fall back to stale payload snapshots or hand-copied addresses.
- If you change public/external contract interfaces, check whether ABIs must be synced to `apps/web` or `pkg/subgraph`.
- Prefer targeted Foundry tests for touched contracts before broader test runs.
- Do not edit generated deployment artifacts under the repo root `broadcast/` unless explicitly asked.
- For Safe submissions, use `scripts/submit_safe_payloads.py` or the `task submit-safe-payloads-*` wrappers instead of hand-rolled HTTP requests.

## Default Upgrade Flow

For mainnet upgrade operations, default to this sequence unless the user explicitly asks for something else:

1. Determine what must be upgraded.
2. Generate per-chain Safe payloads.
3. Submit those payloads with `PK_TESTNET_OWNER` through the chain's ProxyOwner-resolved Safe using `scripts/submit_safe_payloads.py`.

Operational details for step 1:

- Distinguish future-pool template updates from live pool upgrades. `RegistryFactory.setStrategyFacets(...)` only updates future pools; existing strategies may still require `upgradeTo(...)` and `diamondCut(...)`.
- When base facet or shared storage logic changes, assume all strategy facets may need to be refreshed unless verified otherwise.
- Use `test/helpers/StrategyDiamondConfigurator.sol` and the upgrade scripts under `script/` as the canonical selector and facet-cut source.
- Treat linked Solidity libraries as chain-local runtime dependencies. `CVStrategy`, `CVAllocationFacet`, `CVProposalFacet`, and `CVStreamingFacet` can contain hardcoded `ConvictionsUtils` addresses in their deployed bytecode; before preparing or approving an implementation/facet payload, extract the artifact `deployedBytecode.linkReferences`, read the linked address from the deployed bytecode on the target chain, and confirm `cast code <linked-library>` is non-empty.
- Do not assume a library address that is valid on one chain exists on another. For `ConvictionsUtils`, keep `IMPLEMENTATIONS.CV_UTIL_LIB` in `config/networks.json` aligned with the chain-local linked library and verify that every configured `CV_STRATEGY` implementation links to it.

Operational details for step 2:

- Generate one Safe Transaction Builder payload per chain. Safe imports should stay split by chain instead of one aggregate JSON blob.
- Prefer payloads under `transaction-builder/` and keep the chain name aligned with the Safe service key (`mainnet`, `arbitrum`, `optimism`, `polygon`, `gnosis`, `base`, `celo`).

Operational details for step 3:

- The submitter keystore is `~/.foundry/keystores/PK_TESTNET_OWNER` unless the user says otherwise.
- Resolve the actual Safe owner from the chain's ProxyOwner contract. Do not assume `ENVS.PROXY_OWNER` itself implements the Safe interface; call `mainOwner()` when needed and submit to that Safe address.
- Verify the signer is a Safe owner before submission.
- Prefer `--payload-file` plus `--service-chain` when submitting explicit per-chain payloads.
- If a pending nonce already exists, use the script's `--force`, `--skip-pending`, or `--start-nonce` flags rather than rebuilding the Safe hash manually.

Useful pre-submit checks:

```bash
cast call <proxyOwner> 'mainOwner()(address)' --rpc-url <rpc>
cast call <safe> 'getOwners()(address[])' --rpc-url <rpc>
cast call <safe> 'nonce()(uint256)' --rpc-url <rpc>
cast wallet address --account PK_TESTNET_OWNER
python scripts/submit_safe_payloads.py \
	--safe <resolved-safe> \
	--keystore ~/.foundry/keystores/PK_TESTNET_OWNER \
	--service-chain <chain> \
	--payload-file transaction-builder/<payload>.json
```

## Wallet Rotation And ProxyOwner Grant Flow

When rotating the deployer wallet that will receive `ProxyOwner.grantUpgradeAccess(...)`, use this order unless the user explicitly asks for a different sequence:

1. Generate or rotate the wallet with `task change-wallet` when `ENVS.SENDER` should move to the new address, or `task generate-wallet` when only the keypair is needed.
2. Back up the current `~/.foundry/keystores/PK_DEPLOYER` before importing the new key into the same keystore name.
3. Import the new wallet into `PK_DEPLOYER` and verify it with `cast wallet address --account PK_DEPLOYER --password "$PK_DEPLOYER_PW"`.
4. Fund the new wallet with `task transfer-gas-all` or a narrower `transfer-gas-*` task. Treat skipped chains as real blockers for later renounce calls; the granted wallet needs native gas on each chain where it must send transactions.
5. Grant testnet upgrade access on-chain with `task grant-upgrade-access-testnets`.
6. Dry-run mainnet Safe submissions with `task submit-safe-payloads-grant-upgrade-access-all-chains-dry`.
7. Submit mainnet Safe proposals with `task submit-safe-payloads-grant-upgrade-access-all-chains`.
8. Verify current state with `task verify-upgrade-access`.

Operational notes:

- `task verify-upgrade-access` checks live `upgradeAccess()` on-chain. After step 7 it should pass on testnets, but it will continue to fail on mainnets until the queued Safe transactions are executed.
- `task submit-safe-payloads-grant-upgrade-access-all-chains` must normalize both the `grantUpgradeAccess` recipient and the ProxyOwner `to` address from `config/networks.json`; do not trust stale `transaction-builder/*-proxy-owner-upgrade-and-grant-payload.json` targets.
- The current Taskfile only has renounce wrappers for testnets: `task renounce-proxy-owner-upgrade-access-testnets` and the per-chain `ethsep`, `arbsep`, `opsep` tasks.
- There are no mainnet renounce Taskfile wrappers at the moment. Use `script/RenounceProxyOwnerUpgradeAccess.s.sol:RenounceProxyOwnerUpgradeAccess` directly only after the Safe grant has executed and the new wallet has enough native gas on the target chain.
- Keep the old `PK_DEPLOYER` keystore backup until funding, grant verification, and any required renounce calls are complete.

## Verification

- Logic changes: run the smallest relevant `forge test` or `pnpm test` subset.
- Storage changes: run `./scripts/verify-storage-layout.sh`.
- ABI changes consumed elsewhere: run `pnpm sync:abis`, then validate the dependent package.
- For strategy upgrade verification, include linked-library checks. At minimum, run the `strategies` scope in `scripts/verify-all-deployments.sh` for the affected chain or manually verify that `CVStrategy`'s linked `ConvictionsUtils` address has bytecode and matches `IMPLEMENTATIONS.CV_UTIL_LIB`.

## Pitfalls

- `pnpm build` also triggers ABI aggregation in `postbuild`.
- Deployment and ops scripts can depend on `.env`; do not assume they are safe to run without checking inputs.
- Many scripts are production-operational. Avoid running deployment or upgrade scripts unless the task explicitly requires it.
- Safe service submissions can fail for superficial reasons like non-checksummed addresses or shell-escaped calldata. Using `scripts/submit_safe_payloads.py` avoids those failure modes and handles nonce selection, MultiSend wrapping, EIP-712 hashing, and Safe app links.
- `ProxyOwner.owner()` can differ from the governance Safe while `upgradeAccess` is active. For governance routing, resolve the Safe with `mainOwner()` instead of assuming `owner()` or `ENVS.PROXY_OWNER` is the Safe.
- An implementation can pass proxy and template checks while still reverting if it is linked to an address with no code on the target chain. This is especially easy to miss for `ConvictionsUtils` because the proxy stores only the implementation address; the library address is embedded in implementation/facet bytecode, not storage.
