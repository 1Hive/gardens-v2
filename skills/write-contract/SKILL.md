---
name: write-contract
description: Prepare Gardens V2 state-changing contract transactions. Use this skill when the task involves encoding calldata, selecting the correct deployed Gardens contract and ABI, building multisig payloads, or preparing a write transaction for manual execution or broadcast.
---

# Write Contract

## Overview

Use this skill to prepare state-changing contract interactions for Gardens V2.
Optimize for calldata generation, transaction assembly, and safe review, not direct automatic execution.

## Foundry Requirement

`cast` and `cast send` are Foundry commands.
If Foundry is not installed, install it before suggesting `cast`-based workflows:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Confirm the install with:

```bash
cast --version
forge --version
```

## Safety First

- Treat this skill as transaction preparation by default.
- Do not broadcast automatically unless the user explicitly asks for it and the execution context is trusted.
- Prefer returning calldata, target address, chain id, value, and a clear summary of the intended effect.
- If a function requires an IPFS metadata pointer or `ipfsHash`, prepare the metadata payload first, upload it to IPFS, and only then encode the write using the resulting hash or pointer.
- In the hosted Gardens app, the frontend IPFS upload route is `https://app.gardens.fund/api/ipfs`. Inside the app code this appears as the relative route `/api/ipfs`.

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

## Workflow

1. Identify the target network and the desired state-changing action.
2. Resolve the contract address from `networks.json`.
3. Select the matching ABI for the proxy or singleton contract.
4. If the function expects offchain metadata, prepare the metadata JSON first and upload it to IPFS to obtain the required hash or pointer.
5. Encode the function call and arguments.
6. Return the final transaction fields: `to`, `data`, `value`, `chainId`, and a human-readable summary.
7. If the user requests, prepare a `cast send` command with appropriate flags for manual review and execution.

For the exact frontend-backed IPFS JSON payloads used by Gardens writes, see `references/ipfs-json-structures.md`.

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

## Proposal Creation Requirements

When preparing a proposal creation write for Gardens, ingest both:
- the community covenant
- the pool description and metadata

Use the `query-subgraph` skill to retrieve this context before encoding the transaction.

If the user gives a pool name instead of a pool address:
- use the `query-subgraph` skill first to resolve the pool or strategy address
- do not guess the target address

Before preparing a proposal creation transaction, collect or derive all of the following:

- Network
- Pool address, or pool name that can be resolved to the pool address through `query-subgraph`
- Proposal title
- Requested amount for funding pools only (check pool token for symbol and decimals with `read-contracts` if not provided)
- Beneficiary for funding and streaming pools
- Proposal description

Before suggesting broadcast:
- make sure the signer wallet has enough native token to cover the required proposal collateral deposit
- use the `read-contracts` skill to retrieve the chain-specific requirement and relevant onchain configuration
- if needed, also verify the wallet's native balance on the target chain before finalizing the transaction plan

## Proposal Creation Gating Checks

Before preparing or broadcasting a proposal creation transaction, confirm both of the following:

- Collateral deposit requirement
  Fetch the required proposal collateral from the target chain using the `read-contracts` skill instead of assuming a fixed amount.
- Community membership
  Confirm that the signer wallet is a member of the target community and therefore eligible to create the proposal.

For proposal creation metadata and dispute-reason JSON shapes, see `references/ipfs-json-structures.md`.

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

### `cast send` with a Foundry keystore

Prefer keystore-backed signing over passing a raw private key on the command line.
Use either a named Foundry account or a direct keystore path.
Prefer prompting for the password locally at runtime or using `--password-file` rather than pasting the password into chat.

Named account example:

```bash
cast send 0x... "setSomething(address,uint256)" 0x... 123 \
  --rpc-url <RPC_URL> \
  --account <ACCOUNT_NAME>
```

Keystore path example:

```bash
cast send 0x... "setSomething(address,uint256)" 0x... 123 \
  --rpc-url <RPC_URL> \
  --keystore <KEYSTORE_PATH>
```

Non-interactive password file example:

```bash
cast send 0x... "setSomething(address,uint256)" 0x... 123 \
  --rpc-url <RPC_URL> \
  --keystore <KEYSTORE_PATH> \
  --password-file <PASSWORD_FILE>
```

## Validation

- Confirm the network and target address before encoding.
- Confirm the ABI matches the target contract type.
- Re-read relevant state first for sensitive operations.
- For proxies, use the proxy address unless the task explicitly targets the implementation.
