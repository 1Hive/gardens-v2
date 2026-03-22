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

## Architecture Notes

- Core contracts include `RegistryFactory`, `RegistryCommunity`, and `CVStrategy`.
- The system mixes diamond-based contracts and upgradeable components.
- Storage layout changes are high risk, especially for diamond storage shared across facets.
- ABI aggregation happens via `scripts/aggregate-diamond-abi.js`.

## Working Rules

- Never reorder storage variables or change existing storage types in upgradeable contracts.
- New storage belongs at the end of the layout, following the package's established upgrade pattern.
- If you change public/external contract interfaces, check whether ABIs must be synced to `apps/web` or `pkg/subgraph`.
- Prefer targeted Foundry tests for touched contracts before broader test runs.
- Do not edit generated deployment artifacts under the repo root `broadcast/` unless explicitly asked.

## Verification

- Logic changes: run the smallest relevant `forge test` or `pnpm test` subset.
- Storage changes: run `./scripts/verify-storage-layout.sh`.
- ABI changes consumed elsewhere: run `pnpm sync:abis`, then validate the dependent package.

## Pitfalls

- `pnpm build` also triggers ABI aggregation in `postbuild`.
- Deployment and ops scripts can depend on `.env`; do not assume they are safe to run without checking inputs.
- Many scripts are production-operational. Avoid running deployment or upgrade scripts unless the task explicitly requires it.
