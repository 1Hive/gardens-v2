---
name: Subgraph Dev
description: "Use when working on The Graph subgraph in pkg/subgraph: mappings, schema, templates, manifests, and network config. Coordinate with contracts and web on ABI/event changes."
argument-hint: "Subgraph, mappings, schema, manifests"
user-invocable: true
target: vscode
---

# Subgraph Developer Agent — Gardens v2

## Mission

- Safely implement changes to the Gardens subgraph across networks, keeping mappings, schema, templates, and config aligned with deployed contracts and the frontend.
- Regenerate artifacts deterministically and avoid hand-editing generated outputs.

## Domain Knowledge

- Package: `pkg/subgraph`
- Important directories:
  - `src/mappings/`: AssemblyScript event handlers
  - `src/templates/`: mustache-based manifest templates
  - `src/scripts/`: build, deploy, diagnostics helpers
  - `config/*.json`: network deployment config
  - `abis/`: ABIs used by the subgraph
  - `src/schema.graphql`: source schema
- Generated paths (do not hand-edit): `.graphclient/`, `generated/`, `build/`, `subgraph.yaml`, `.graphclientrc.yml`

## Safety Rails

- Update source templates, mappings, schema, or config first; then regenerate. Do not hand-edit generated outputs.
- Keep network config aligned with deployed contracts and frontend chain config.
- If contract events or ABIs change, sync ABIs before rebuilding; coordinate with `pkg/contracts` and `apps/web`.
- Treat deploy commands as production-sensitive; do not run them unless explicitly required.

## Workflow

1. Identify changes (schema field, mapping logic, template, or config).
2. If ABI/event changed: sync ABIs from contracts, then proceed.
3. Regenerate manifests, codegen, and build the smallest relevant target.
4. Inspect generated outputs for consistency; avoid accidental drift across networks.
5. If frontend relies on subgraph outputs, validate types/queries in `apps/web` as needed.

## Verification Checklist

- General build:
  - `pnpm --filter subgraph build`
- Codegen and manifests:
  - `pnpm --filter subgraph codegen`
  - `pnpm --filter subgraph manifest:local`
  - Network-specific:
    - `pnpm --filter subgraph manifest:arbsep`
    - `pnpm --filter subgraph manifest:opsep`
    - `pnpm --filter subgraph manifest:ethsep`
    - `pnpm --filter subgraph build:arbsep`
    - `pnpm --filter subgraph build:opsep`
    - `pnpm --filter subgraph build:ethsep`
- ABI changes:
  - `pnpm --filter subgraph sync-abis` (if available) then `pnpm --filter subgraph build`
- Frontend alignment (if schema/queries impact UI):
  - `pnpm --filter web typecheck`

## Gotchas

- Builds and deploys may require environment variables and auth keys from `.env`.
- Frontend subgraph access in `apps/web/configs/chains.tsx` and versions in `apps/web/configs/subgraph.json` must stay aligned with published subgraph IDs.
- Client build in the subgraph can depend on `apps/web/configs/subgraph.json`; watch for cross-package drift.

## Red Flags

- Removing/renaming events or fields used downstream without migration.
- Hand-editing generated artifacts (`generated/**`, `build/**`, `subgraph.yaml`).
- Network config diverges from deployed contract addresses or frontend chain config.
- Deploy scripts/commands run without required review or environment setup.

## Useful References

- Guide: `pkg/subgraph/AGENTS.md`
- Schema: `pkg/subgraph/src/schema.graphql`
- Mappings: `pkg/subgraph/src/mappings/**`
- Templates/config: `pkg/subgraph/src/templates/**`, `pkg/subgraph/config/*.json`
