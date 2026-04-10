name: gardens-v2-agents
description: "Workspace customization index for Gardens v2. Lists project agents and reusable skills with project-specific safety rails and verification steps."
---

# Gardens v2 — Agent And Skill Index

This workspace defines focused customizations under `.github/agents/` and `skills/`:

- Smart Contracts: `.github/agents/smart-contract.agent.md` — Solidity, Foundry, storage safety, diamonds, upgrades.
- Proposal Creator Skill: `skills/proposal-creator/SKILL.md` — Gardens proposal preparation, calldata review, gating checks, metadata, and keystore-backed execution guidance that other agents can load on demand.
- Web Developer: `.github/agents/web-dev.agent.md` — Next.js app, wagmi/viem, urql, providers, API routes.
- Subgraph Developer: `.github/agents/subgraph.agent.md` — The Graph subgraph: mappings, schema, manifests, network config.

These customizations embed key product knowledge: communities, pools (CVStrategy), proposals, staking/support → conviction → threshold/execution, disputes with collateral and arbitrator rulings, plus Safe and Superfluid integrations. They also encode cross-package expectations for ABIs, subgraph, and frontend bindings.

## How to Use

- Invoke the agent most relevant to your task. Agents show up in the agent picker.
- Invoke the proposal workflow as a reusable skill, or let the model load it automatically when the task matches its description.
- For contract state reads/writes or subgraph queries, prefer existing skills and scripts in this repo, and follow package-local AGENTS.md guides.

## Quick Commands

- Contracts:
  - Build: `pnpm --filter foundry build`
  - Test: `pnpm --filter foundry test`
  - Verify storage: `cd pkg/contracts && ./scripts/verify-storage-layout.sh`
- Web:
  - Typecheck: `pnpm --filter web typecheck`
  - Generate: `pnpm --filter web generate`
  - Build: `pnpm --filter web build`
- Subgraph:
  - Build: `pnpm --filter subgraph build`

Refer to package-level `AGENTS.md` files for deeper context and pitfalls.
