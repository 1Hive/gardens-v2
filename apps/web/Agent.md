# Agent.md

This file provides guidance to coding agents when working with code in this repository.

## Project Overview

Gardens v2 is a modular governance framework that enables communities to create and manage multiple governance pools with customizable parameters and voting mechanisms. The project implements Conviction Voting on top of Allo Protocol v2, deployed across 6+ networks including Gnosis Chain, Polygon, Arbitrum, Optimism, Base, and Celo.

## Monorepo Architecture

This is a pnpm workspace monorepo with Turbo for build orchestration:

- **`apps/web/`**: Next.js 14 frontend application with App Router
- **`apps/docs/`**: Documentation site
- **`pkg/contracts/`**: Solidity smart contracts (Foundry)
- **`pkg/subgraph/`**: The Graph subgraph for indexing on-chain data
- **`pkg/ui/`**: Shared UI components
- **`pkg/tsconfig/`**: Shared TypeScript configurations

## Core Smart Contract Architecture

The contract system follows a factory pattern with upgradeable proxies:

### Contract Hierarchy

1. **RegistryFactory** (`pkg/contracts/src/RegistryFactory/`)

   - Diamond-based factory that creates RegistryCommunity instances
   - Manages protocol-level settings and fees
   - Entry point for creating new governance communities

2. **RegistryCommunity** (`pkg/contracts/src/RegistryCommunity/RegistryCommunity.sol`)

   - Represents a governance community
   - Manages member registration, staking, and voting power
   - Creates and manages multiple CVStrategy pools
   - Integrates with Allo Registry for profile management
   - Uses Safe (Gnosis Safe) for council governance

3. **CVStrategy** (`pkg/contracts/src/CVStrategy/CVStrategy.sol`)
   - Implements Conviction Voting algorithm
   - Extends Allo Protocol v2's BaseStrategy
   - Manages proposals, voting, and fund distribution
   - Supports multiple point systems: Token-weighted, Fixed, Capped, Quadratic
   - Handles dispute resolution via arbitrators
   - Optional Superfluid integration for streaming payments

### Key Patterns

- **UUPS Upgradeable**: Contracts use OpenZeppelin's UUPS proxy pattern
- **ERC1967 Proxies**: Strategy instances are deployed as minimal proxies
- **Clone Pattern**: Used for CollateralVault and strategy deployment
- **Diamond Pattern**: RegistryFactory uses EIP-2535 Diamond Standard

### External Dependencies

- **Allo Protocol v2**: Core allocation protocol
- **Safe**: Multi-sig wallet for council governance
- **Superfluid**: Token streaming for funding pools
- **The Graph**: Off-chain indexing via subgraph

## Build & Test Commands

### Monorepo Commands (from root)

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run development servers (parallel)
pnpm dev

# Lint all packages
pnpm lint

# Format code
pnpm format

# Run tests across workspace
pnpm test
```

### Smart Contract Commands (pkg/contracts)

```bash
# Build contracts with size reporting
pnpm build
# or directly:
forge build --sizes

# Run all tests with verbose output
pnpm test
# or:
forge test -vvv

# Run specific test file
forge test --match-path pkg/contracts/test/CVStrategyTest.t.sol -vvv

# Run specific test function
forge test --match-test testProposalCreation -vvv

# Inspect contract storage layout
forge inspect pkg/contracts/src/CVStrategy/CVStrategy.sol storageLayout --md

# Format Solidity files
forge fmt

# Deploy (uses Makefile in pkg/contracts/)
make deploy
```

### Frontend Commands (apps/web)

```bash
cd apps/web

# Generate contract ABIs and TypeScript bindings
pnpm generate
# This runs: wagmi generate

# Development server
pnpm dev

# Build production
pnpm build

# Type checking
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix
```

### Subgraph Commands (pkg/subgraph)

```bash
cd pkg/subgraph

# Build for local development
pnpm build
# This runs: pnpm manifest:local && graph codegen && graph build

# Build for specific networks
pnpm build:arbsep    # Arbitrum Sepolia
pnpm build:opsep     # Optimism Sepolia
pnpm build:ethsep    # Ethereum Sepolia

# Deploy to local Graph Node
pnpm local

# Deploy to production networks
pnpm deploy:arbitrum
pnpm deploy:optimism
pnpm deploy:matic
pnpm deploy:gnosis
pnpm deploy:base
pnpm deploy:celo

# Deploy all production networks
pnpm deploy:prod
```

## Development Workflows

### Frontend Development

- Next.js 14 with App Router pattern (`apps/web/app/(app)/`)
- State management via React Context (`apps/web/contexts/`)
- wagmi for Ethereum interactions
- RainbowKit for wallet connections
- urql for GraphQL queries to subgraph
- Tailwind CSS + DaisyUI for styling
- Dark mode support via next-themes

### Smart Contract Development

**Prerequisites**: Install Foundry:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

**Testing Pattern**:

- Main test files in `pkg/contracts/test/`
- Helper utilities in `pkg/contracts/test/shared/`
- Use `CVStrategyHelpers.sol` for common test setup
- Tests use Foundry's standard library and console logging

**Contract Size Optimization**:

- CVStrategy contracts are near the 24KB limit
- Many error messages are commented out with `@todo take commented when contract size fixed with diamond`
- Consider Diamond pattern for future size reduction

### Subgraph Development

- Schema defined in `pkg/subgraph/schema.graphql`
- AssemblyScript mappings in `pkg/subgraph/src/`
- Multi-network config in `pkg/subgraph/config/`
- Use mustache templating for network-specific manifests

## Key Technical Considerations

### Conviction Voting Implementation

The CV algorithm (`pkg/contracts/src/CVStrategy/ConvictionsUtils.sol`) calculates voting power that grows over time as tokens remain staked on a proposal. Key parameters:

- **decay**: Rate at which conviction decreases when support is removed
- **weight**: Multiplier for conviction growth
- **maxRatio**: Maximum % of pool funds a single proposal can request
- **minThresholdPoints**: Minimum conviction required regardless of pool size

### Point Systems

Four voting weight mechanisms in `PointSystem` enum:

- **Unlimited**: 1 token = 1 vote (no cap)
- **Fixed**: Equal voting power for all members
- **Capped**: 1 token = 1 vote up to `maxAmount`
- **Quadratic**: Voting weight = sqrt(tokens)

### Dispute Resolution

- Proposals can be disputed by community members
- Requires challenger collateral
- Arbitrator (typically a Safe multisig) rules on disputes
- Three ruling options: Approve (1), Reject (2), Default (timeout)

### Multi-Network Deployment

- Contracts deployed to 6+ EVM chains
- Deployment scripts in `pkg/contracts/script/`
- Network-specific configs in broadcast directory
- RPC URLs configured via environment variables

### Storage Layout

To inspect contract storage (important for upgrades):

```bash
forge inspect pkg/contracts/src/CVStrategy/CVStrategy.sol storageLayout --md
```

#### Diamond Pattern Storage Verification

Both `CVStrategy` and `RegistryCommunity` use the diamond pattern (EIP-2535), where facets execute via delegatecall in the main contract's storage context. **Critical requirement**: All facets MUST have identical storage layout to the main contract.

The verification script automatically discovers diamond contracts and their facets:

```bash
# From pkg/contracts directory

# Verify all contracts (automatically discovers CVStrategy & RegistryCommunity)
./scripts/verify-storage-layout.sh

# Skip build if contracts already compiled (faster)
./scripts/verify-storage-layout.sh --skip-build

# Verify specific directory only
./scripts/verify-storage-layout.sh --path src/CVStrategy

# Show detailed differences if mismatches found
./scripts/verify-storage-layout.sh --verbose

# Use Makefile targets
make verify-storage        # With build (recommended for deployments)
make verify-storage-quick  # Skip build (faster if already compiled)
```

**Auto-Discovery Features:**

- Finds main contracts by detecting `fallback()` functions
- Discovers all `*Facet.sol` files in `facets/` subdirectories
- Skips `src/diamonds` directory (generic diamond utilities)
- Skips standard diamond facets (DiamondCutFacet, DiamondLoupeFacet, OwnershipFacet)

**Architecture**:

- **CVStrategy**: Main contract with 5 facets (CVAdminFacet, CVAllocationFacet, CVDisputeFacet, CVPowerFacet, CVProposalFacet)

  - All facets inherit from `CVStrategyBaseFacet` which defines the shared storage layout
  - Eliminates ~220 lines of duplicated storage declarations

- **RegistryCommunity**: Main contract with 5 facets (CommunityAdminFacet, CommunityMemberFacet, CommunityPoolFacet, CommunityPowerFacet, CommunityStrategyFacet)
  - All facets inherit from `CommunityBaseFacet` which defines the shared storage layout
  - Eliminates ~185 lines of duplicated storage declarations

**When to verify**:

- **Before deployments**: Use `make verify-storage` as prerequisite in deployment targets
- After adding new storage variables to base contracts
- Before deploying upgrades
- When creating new facets
- In CI/CD pipeline before merging facet changes

**Integrating with deployments**:
Add `verify-storage` as a prerequisite to deployment targets in Makefile:

```makefile
# For production deployments (always build + verify)
deploy-my-contract: verify-storage
	-forge script script/DeployMyContract.s.sol ...

# For local testing (quick verification)
deploy-local: verify-storage-quick
	-forge script script/DeployLocal.s.sol ...
```

This ensures storage alignment is verified (and contracts are built) before any deployment proceeds.

**Storage safety rules**:

1. Never reorder existing storage variables
2. Never change variable types
3. Always append new variables at the end (before `__gap`)
4. Decrease `__gap` size when adding variables to maintain total slot count
5. All facets must inherit from the BaseFacet contract

## Git Commit Guidelines

- Never include co-authored AI assistant commits (as per global config)
- Follow conventional commits for clear change history
- Contract changes should include test updates
- Frontend changes should be tested against local subgraph if possible

## Common Debugging Tips

### Contracts

- Use `forge test -vvvv` for detailed trace output
- Check storage slots for upgrade compatibility
- Verify proxy initialization in deployment scripts
- Monitor gas usage with `forge snapshot`

### Frontend

- Check `.env` for required API keys (Alchemy, Pinata, etc.)
- Verify subgraph queries match deployed schema version
- Use Next.js dev tools for API route debugging
- Check RainbowKit config for wallet connection issues

### Subgraph

- Verify contract ABIs match deployed versions
- Check event signatures in mappings
- Use Graph Explorer for query testing
- Monitor indexing status in Graph Node logs

## Additional Resources

- Main docs: https://docs.gardens.fund
- Contributing guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Security policy: [SECURITY.md](./SECURITY.md)
- Allo Protocol v2: https://github.com/allo-protocol/allo-v2
- Foundry Book: https://book.getfoundry.sh/
