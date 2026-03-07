---
name: read-contracts
description: Retrieve Gardens V2 on-chain state by reading deployed contracts with known ABIs and chain-specific addresses. Use this skill when an external agent needs to look up Gardens contract addresses, choose the correct ABI, inspect read-only contract state, or answer protocol questions directly from contract calls instead of writing code.
---

# Read Contracts

## Overview

Use this skill to map a Gardens V2 network to the correct deployed contract addresses and read contract state with the matching ABI.
Optimize for direct command execution such as `cast call`, RPC reads, or other ABI-driven tools.

## Address Source

Use this canonical deployment map for network names, chain ids, singleton addresses, proxy addresses, and implementation addresses:

`https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/config/networks.json`

Read it as follows:

- `networks[].name` and `networks[].chainId` identify the network.
- `ENVS` contains singleton deployments such as `REGISTRY`, `ALLO_PROXY`, `ARBITRATOR`, `PASSPORT_SCORER`, and `GOOD_DOLLAR_SYBIL`.
- `PROXIES.REGISTRY_FACTORY` is the registry factory proxy.
- `PROXIES.REGISTRY_COMMUNITIES` contains deployed community contract addresses.
- `PROXIES.CV_STRATEGIES` contains deployed pool strategy contract addresses.
- `IMPLEMENTATIONS` contains implementation addresses when the task specifically needs the logic contract rather than the proxy.

## Public RPCs

Use these public RPCs as default read-only endpoints when no private RPC is provided:

- Arbitrum Sepolia (`421614`): `https://sepolia-rollup.arbitrum.io/rpc`
- Optimism Sepolia (`11155420`): `https://sepolia.optimism.io`
- Arbitrum (`42161`): `https://arb1.arbitrum.io/rpc`
- Optimism (`10`): `https://mainnet.optimism.io`
- Polygon (`137`): `https://polygon-rpc.com`
- Gnosis (`100`): `https://rpc.gnosischain.com`
- Base (`8453`): `https://mainnet.base.org`
- Celo (`42220`): `https://forno.celo.org`

These are public defaults derived from the local `viem` chain definitions used by the frontend.

## ABI Sources

Use these raw artifact files as the ABI source for direct reads.
For proxy reads, use the proxy address from `networks.json` with the ABI below.

- Registry factory proxy ABI:
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/out/RegistryFactory.sol/RegistryFactory.json`
- Registry community proxy ABI (aggregated diamond ABI):
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/out/DiamondAggregated/RegistryCommunity.json`
- CV strategy proxy ABI (aggregated diamond ABI):
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/out/DiamondAggregated/CVStrategy.json`
- Registry ABI:
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/out/Registry.sol/Registry.json`
- Allo proxy ABI:
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/out/Allo.sol/Allo.json`
- Collateral vault ABI:
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/out/CollateralVault.sol/CollateralVault.json`
- Passport scorer ABI:
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/out/PassportScorer.sol/PassportScorer.json`
- Safe arbitrator ABI:
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/out/SafeArbitrator.sol/SafeArbitrator.json`
- GoodDollar sybil ABI:
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/out/GoodDollarSybil.sol/GoodDollarSybil.json`

## Workflow

1. Identify the target network.
2. Find the target address in `networks.json`.
3. Select the ABI that matches the contract type.
4. Use a read-only command to call the contract.
5. Return only the relevant decoded values.

If the contract address is not yet known and the user only has a Community title or Pool title, use the `query-subgraph` skill first to resolve the entity.
The relevant subgraph entity ids are usually the contract addresses, so title lookup is often the fastest route to the on-chain address.

## Contract Selection Rules

- Use `PROXIES.REGISTRY_FACTORY` with the `RegistryFactory` ABI for registry factory reads.
- Use entries in `PROXIES.REGISTRY_COMMUNITIES` with the aggregated `RegistryCommunity` ABI for community-level reads.
- Use entries in `PROXIES.CV_STRATEGIES` with the aggregated `CVStrategy` ABI for pool or proposal strategy reads.
- Use `ENVS.PASSPORT_SCORER` with the `PassportScorer` ABI for passport score reads.
- Use `ENVS.ARBITRATOR` with the `SafeArbitrator` ABI for dispute and arbitrator reads.
- Use `ENVS.GOOD_DOLLAR_SYBIL` with the `GoodDollarSybil` ABI for sybil-related reads.
- Use `ENVS.REGISTRY` with the `Registry` ABI for registry reads.
- Use `ENVS.ALLO_PROXY` with the `Allo` ABI for Allo reads.
- Use `IMPLEMENTATIONS.COLLATERAL_VAULT` with the `CollateralVault` ABI only when the task explicitly targets the implementation. For live pool state, the strategy or community proxy is usually the correct entry point.

## Command Patterns

Use commands that external agents can run directly.

### `cast call`

Use when the function signature is known.

```bash
cast call 0x... "name()(string)" --rpc-url <RPC_URL>
```

Examples:

- Read a community or strategy name:
  `cast call 0x... "name()(string)" --rpc-url <RPC_URL>`
- Read an owner:
  `cast call 0x... "owner()(address)" --rpc-url <RPC_URL>`
- Read a registry address from a factory or proxy:
  `cast call 0x... "registry()(address)" --rpc-url <RPC_URL>`

### ABI-aware RPC tools

If the tool accepts an ABI JSON file, pass the raw ABI above or a locally downloaded copy of that artifact and call the desired read-only method.

## Validation

- Confirm the network before trusting the address.
- Confirm that the address came from the correct section of `networks.json`.
- For proxies, prefer the proxy address, not the implementation address, unless the task explicitly asks for implementation storage or code.
- If a call reverts or returns unexpected empty data, verify that the ABI matches the address type.
