---
name: write-contract
description: Prepare Gardens V2 contract write transactions, calldata, and multisig-ready payloads using the correct deployed addresses and ABIs. Use this skill when an external agent needs to encode a state-changing call, select the correct Gardens contract target, or assemble a transaction for manual execution without writing application code.
---

# Write Contract

## Overview

Use this skill to prepare state-changing contract interactions for Gardens V2.
Optimize for calldata generation, transaction assembly, and safe review, not direct automatic execution.

## Safety First

- Treat this skill as transaction preparation by default.
- Do not broadcast automatically unless the user explicitly asks for it and the execution context is trusted.
- Prefer returning calldata, target address, chain id, value, and a clear summary of the intended effect.
- For governance, upgrade, or role-sensitive actions, prefer multisig or prebuilt payload workflows over raw direct sends.

## Address Source

Use this canonical deployment map for network names, chain ids, singleton addresses, proxy addresses, and implementation addresses:

`https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/config/networks.json`

Use the same mapping rules as `read-contracts`:

- `ENVS` for singleton deployed contracts.
- `PROXIES.REGISTRY_FACTORY` for the registry factory proxy.
- `PROXIES.REGISTRY_COMMUNITIES` for community proxies.
- `PROXIES.CV_STRATEGIES` for strategy proxies.
- `IMPLEMENTATIONS` only when the task explicitly targets implementation contracts.

## Public RPCs

Use these public RPCs when a read/simulate/estimate step is needed and no private RPC is provided:

- Arbitrum Sepolia (`421614`): `https://sepolia-rollup.arbitrum.io/rpc`
- Optimism Sepolia (`11155420`): `https://sepolia.optimism.io`
- Arbitrum (`42161`): `https://arb1.arbitrum.io/rpc`
- Optimism (`10`): `https://mainnet.optimism.io`
- Polygon (`137`): `https://polygon-rpc.com`
- Gnosis (`100`): `https://rpc.gnosischain.com`
- Base (`8453`): `https://mainnet.base.org`
- Celo (`42220`): `https://forno.celo.org`

## ABI Sources

Use these raw artifact files as the ABI source for write encoding.
For proxy writes, use the proxy address from `networks.json` with the matching proxy ABI.

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
- Passport scorer ABI:
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/out/PassportScorer.sol/PassportScorer.json`
- Safe arbitrator ABI:
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/out/SafeArbitrator.sol/SafeArbitrator.json`
- GoodDollar sybil ABI:
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/out/GoodDollarSybil.sol/GoodDollarSybil.json`

## Prebuilt Payload References

Use these for known governance or upgrade flows instead of rebuilding calldata from scratch when the task matches them:

- Transaction builder folder:
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/transaction-builder/`
- Network payload examples:
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/transaction-builder/arbitrum-payload.json`
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/transaction-builder/optimism-payload.json`
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/transaction-builder/polygon-payload.json`
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/transaction-builder/gnosis-payload.json`
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/transaction-builder/base-payload.json`
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/transaction-builder/celo-payload.json`
  `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/contracts/transaction-builder/opsepolia-diamond-upgrade-payload.json`

## Workflow

1. Identify the target network and the desired state-changing action.
2. Resolve the contract address from `networks.json`.
3. Select the matching ABI for the proxy or singleton contract.
4. Encode the function call and arguments.
5. If the action is sensitive, package it as a multisig-friendly payload.
6. Return the final transaction fields: `to`, `data`, `value`, `chainId`, and a human-readable summary.

If the contract address is not yet known and the user only has a Community title or Pool title, use the `query-subgraph` skill first to resolve the entity.
The relevant subgraph entity ids are usually the contract addresses.

Use the `read-contracts` skill first when the task needs confirmation of the current on-chain state before preparing a write.

## Contract Selection Rules

- Use `PROXIES.REGISTRY_FACTORY` with the `RegistryFactory` ABI for registry factory writes.
- Use entries in `PROXIES.REGISTRY_COMMUNITIES` with the aggregated `RegistryCommunity` ABI for community administration, membership, pool, or strategy-related writes.
- Use entries in `PROXIES.CV_STRATEGIES` with the aggregated `CVStrategy` ABI for pool and proposal lifecycle writes.
- Use `ENVS.PASSPORT_SCORER` with the `PassportScorer` ABI for scorer administration writes.
- Use `ENVS.ARBITRATOR` with the `SafeArbitrator` ABI for dispute-related writes.
- Use `ENVS.GOOD_DOLLAR_SYBIL` with the `GoodDollarSybil` ABI for sybil-related writes.
- Use `ENVS.REGISTRY` with the `Registry` ABI for registry writes.
- Use `ENVS.ALLO_PROXY` with the `Allo` ABI for Allo writes.

## Command Patterns

Use direct encoding tools and return the encoded result rather than broadcasting by default.

### `cast calldata`

Use when the function signature and arguments are known.

```bash
cast calldata "setSomething(address,uint256)" 0x... 123
```

### `cast send` (only when explicitly requested)

Use only after confirming the network, target address, arguments, signer, and expected effect.

```bash
cast send 0x... "setSomething(address,uint256)" 0x... 123 --rpc-url <RPC_URL> --private-key <KEY>
```

### Multisig payload shape

Prefer returning a payload shaped like:

```json
{
  "chainId": 8453,
  "to": "0x...",
  "value": "0",
  "data": "0x...",
  "operation": 0,
  "summary": "What this write does in plain English"
}
```

## Validation

- Confirm the network and target address before encoding.
- Confirm the ABI matches the target contract type.
- Re-read relevant state first for sensitive operations.
- For proxies, use the proxy address unless the task explicitly targets the implementation.
- If an existing transaction-builder payload already matches the request, prefer that audited shape over inventing a new one.
