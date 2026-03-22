# AGENTS.md

Guidance for coding agents working in `pkg/subgraph`.

## Scope

- The Graph subgraph package for indexing Gardens contracts across multiple networks.
- Changes here often need coordination with `pkg/contracts` and `apps/web`.

## Important Directories

- `src/mappings/`: AssemblyScript event handlers
- `src/templates/`: mustache-based manifest templates
- `src/scripts/`: build, deploy, and diagnostics helpers
- `config/*.json`: network-specific deployment config
- `abis/`: ABIs used by the subgraph
- `src/schema.graphql`: source schema

## Generated Paths

- `.graphclient/`
- `generated/`
- `build/`
- `subgraph.yaml`
- `.graphclientrc.yml`

Do not hand-edit generated outputs unless the task explicitly targets generated artifacts.

## Commands

Run from `pkg/subgraph`:

```bash
pnpm build
pnpm codegen
pnpm manifest:local
pnpm manifest:arbsep
pnpm manifest:opsep
pnpm manifest:ethsep
pnpm build:arbsep
pnpm build:opsep
pnpm build:ethsep
pnpm local
pnpm deploy:prod
```

## Working Rules

- Update source templates, mappings, schema, or config first; then regenerate.
- Keep network config aligned with deployed contracts and frontend chain config.
- If contract events or ABIs change, sync ABIs before rebuilding.
- Deployment commands are production-sensitive. Do not run them unless the task explicitly requires it.

## Verification

- Mapping or schema changes: run the smallest relevant build, usually `pnpm build` or the network-specific build.
- ABI changes: run `pnpm sync-abis`, then `pnpm build`.
- Config-only changes: regenerate the relevant manifest and inspect the output before broader builds.

## Pitfalls

- Build and deploy flows depend on environment variables and auth keys from `.env`.
- Frontend subgraph access in `apps/web/configs/chains.tsx` must stay aligned with published subgraph IDs and versions.
- `build-client` depends on `apps/web/configs/subgraph.json`, so cross-package drift matters.
