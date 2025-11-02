# CODEX.md

Guidelines for working with code in this repository using OpenAI Codex or GPT-5 code models.

## Project Overview

**Gardens v2** is a modular governance framework enabling communities to create and manage multiple governance pools with customizable parameters and voting mechanisms.  
It implements **Conviction Voting** on top of **Allo Protocol v2**, deployed on **Gnosis Chain, Polygon, Arbitrum, Optimism, Base, and Celo**.

## Monorepo Architecture

This is a **pnpm workspace monorepo** using **Turborepo** for orchestration.

| Path             | Description                          |
| ---------------- | ------------------------------------ |
| `apps/web/`      | Next.js 14 frontend (App Router)     |
| `apps/docs/`     | Documentation site                   |
| `pkg/contracts/` | Solidity smart contracts (Foundry)   |
| `pkg/subgraph/`  | The Graph subgraph for on-chain data |
| `pkg/ui/`        | Shared UI components                 |
| `pkg/tsconfig/`  | Shared TypeScript configs            |

## Smart Contract System

### Core Contracts

1. **RegistryFactory**

   - Diamond-based factory creating `RegistryCommunity` instances
   - Handles protocol fees and configuration
   - Entry point for new governance communities

2. **RegistryCommunity**

   - Manages members, staking, voting, and pool creation
   - Integrates with Allo Registry and Safe (council governance)

3. **CVStrategy**
   - Implements Conviction Voting
   - Extends Allo’s `BaseStrategy`
   - Supports Token-weighted, Fixed, Capped, and Quadratic systems
   - Optionally integrates Superfluid for streaming payments

### Design Patterns

- UUPS proxies via OpenZeppelin
- ERC1967 minimal proxies for strategies
- Clone pattern for CollateralVault and pools
- Diamond pattern (EIP-2535) for RegistryFactory and strategy facets

### External Integrations

Allo Protocol v2 · Safe · Superfluid · The Graph

## Build & Test

### Root Commands

```bash
pnpm install        # Install deps
pnpm build          # Build all packages
pnpm dev            # Run all dev servers
pnpm lint           # Lint
pnpm format         # Format
pnpm test           # Run all tests
```

### Contracts (`pkg/contracts`)

```bash
forge build --sizes
forge test -vvv
forge test --match-path pkg/contracts/test/CVStrategyTest.t.sol -vvv
forge inspect pkg/contracts/src/CVStrategy/CVStrategy.sol storageLayout --md
forge fmt
make deploy
```

### Frontend (`apps/web`)

```bash
pnpm generate   # wagmi generate
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
```

### Subgraph (`pkg/subgraph`)

```bash
pnpm build
pnpm build:arbsep
pnpm local
pnpm deploy:prod
```

## Development Workflows

### Frontend

- Next.js 14 + App Router
- wagmi + RainbowKit
- urql for subgraph queries
- Tailwind + DaisyUI
- next-themes for dark mode

### Smart Contracts

- Foundry-based testing (`forge test`)
- Shared utilities: `CVStrategyHelpers.sol`
- Size optimization: diamond facets and temporary commented strings

### Subgraph

- Schema: `schema.graphql`
- Mappings: `pkg/subgraph/src/` (AssemblyScript)
- Network configs: `pkg/subgraph/config/` with mustache templates

## Technical Notes

### Conviction Voting

Defined in `ConvictionsUtils.sol`:

- `decay`: Conviction decrease rate
- `weight`: Growth multiplier
- `maxRatio`: Max fund % per proposal
- `minThresholdPoints`: Minimum conviction baseline

### Point Systems

- **Unlimited**: Linear 1:1
- **Fixed**: Equal votes
- **Capped**: Limited by `maxAmount`
- **Quadratic**: sqrt(tokens)

### Dispute Resolution

- Requires challenger collateral
- Arbitrator (Safe multisig) rules Approve / Reject / Timeout

## Multi-Network Deployment

- Deployments across 6+ EVM chains
- Scripts in `pkg/contracts/script/`
- Broadcast configs in `broadcast/`
- RPCs via environment variables

## Storage Layout Verification

Inspect storage layout:

```bash
forge inspect pkg/contracts/src/CVStrategy/CVStrategy.sol storageLayout --md
```

Diamond storage verification helper:

```bash
./scripts/verify-storage-layout.sh
make verify-storage
```

Rules:

1. Don’t reorder storage variables
2. Don’t change variable types
3. Append new vars before `__gap`
4. Adjust `__gap` count when adding vars
5. All facets must inherit the shared base facet storage

## Commit & CI Guidelines

- No co-authored Claude commits
- Follow Conventional Commits
- Include tests for contract changes
- Run local subgraph when testing UI

## Debugging

### Contracts

- Use `forge test -vvvv` for traces
- Verify proxies, storage slots, and initialization
- Monitor gas with `forge snapshot`

### Frontend

- Check `.env` for API keys
- Verify subgraph schema and queries
- Check RainbowKit and wagmi config

### Subgraph

- Validate ABIs and event signatures
- Use Graph Explorer for queries
- Monitor Graph Node indexing logs

## References

- Main docs: https://docs.gardens.fund
- CONTRIBUTING: `./CONTRIBUTING.md`
- SECURITY: `./SECURITY.md`
- Allo v2: https://github.com/allo-protocol/allo-v2
- Foundry Book: https://book.getfoundry.sh/
