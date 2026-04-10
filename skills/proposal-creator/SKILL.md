---
name: proposal-creator
description: "Prepare Gardens proposal creation transactions in gardens-v2. Use for funding proposals, streaming proposals, signaling proposals, calldata preparation, signer readiness checks, IPFS metadata, Allo registerRecipient flows, covenant and pool description ingestion, missing-input extraction, and Foundry keystore execution review."
argument-hint: "Network, pool URL/address/name, proposal title/description, beneficiary if required, amount if funding, signer address"
user-invocable: true
---

# Proposal Creator Skill — Gardens v2

## Mission

- Prepare correct Gardens proposal creation transactions for review in this repository.
- Resolve protocol context with the repo skill library before encoding any write.
- Default to transaction preparation and reviewed payloads unless the user explicitly asks to submit the transaction.
- Carry the canonical proposal-creation rules directly in this skill so normal execution does not need ad hoc exploration of frontend components.

## Load These Repo Skills First

Use and follow these skills in this order whenever they apply:

1. `skills/query-subgraph/SKILL.md`
2. `skills/read-contracts/SKILL.md`
3. `skills/write-contract/SKILL.md`

Use them for:

- indexed resolution of community, pool, strategy, covenant, and pool metadata
- ingestion of both the community covenant and the pool description before asking for missing proposal inputs
- onchain reads for collateral, membership, signer balance, and pool configuration
- calldata encoding, transaction preparation, and Foundry-compatible execution commands

## Foundry Requirement

`cast` and `cast send` are Foundry commands.
If Foundry is not installed, install it before suggesting or attempting local execution:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Confirm the install with:

```bash
cast --version
forge --version
```

When the agent has terminal access and the user wants local execution, prefer running the install flow directly instead of only describing it.
Only fall back to command snippets when the environment does not permit local installation or the user wants preparation-only output.

## Local Keystore Setup

If a local Foundry keystore is required for proposal execution and none is available, explicitly guide the user to create or import one.
Prefer an interactive local workflow over asking for secrets in chat.

Recommended import flow for an existing signer:

```bash
cast wallet import <ACCOUNT_NAME> --interactive
```

This will prompt locally for:
- the private key
- the keystore password

Useful follow-up commands:

```bash
cast wallet list
cast wallet address --account <ACCOUNT_NAME>
```

If the user needs a brand new wallet instead of importing an existing signer, suggest one of:

```bash
cast wallet new
cast wallet new-mnemonic
```

When the agent has terminal access and the user wants interactive setup, prefer running these commands directly and letting the user complete the prompts locally.
Do not ask the user to paste raw private keys or keystore passwords into chat.

## Canonical Sources

Use these as the default trusted sources for proposal creation. Do not inspect additional frontend files unless one of these sources is missing or contradictory.

- Subgraph schema: `pkg/subgraph/src/schema.graphql`
- Network and deployment map: `pkg/contracts/config/networks.json`
- Pool type mapping reference: `apps/web/types/index.ts`
- Canonical proposal payload reference: `apps/web/components/Forms/ProposalForm.tsx`
- Hosted IPFS route reference: `apps/web/utils/ipfsUtils.ts`

Normal proposal execution should rely on this skill plus the repo skills above. Frontend exploration is a fallback, not part of the standard workflow.

## Canonical Pool Type Mapping

Use this mapping directly:

- `0 -> signaling`
- `1 -> funding`
- `2 -> streaming`

Derive the pool type from `cvstrategy.config.proposalType` and do not rediscover it from UI code.

## Required Proposal Context

Before preparing a proposal, collect or derive:

- network
- pool link in the form `/gardens/[chain]/[community address]/[pool address]`, or the chain, community address, and pool address individually
- community covenant
- pool description and metadata
- proposal title
- proposal description
- requested amount for funding pools only
- beneficiary for funding and streaming pools only
- signer wallet address, unless it can be derived from a local Foundry keystore
- keystore account name for Foundry execution, or a preference for a plug-and-play local command instead

If the user only provides a pool name, resolve the actual pool or strategy address first. Never guess.
If the user provides a Gardens URL, extract the network, community, and pool addresses from it before asking follow-up questions.
If the user does not provide a Gardens pool link, ask for either the full link or the chain, community address, and pool address individually.

## Canonical Field Requirements By Pool Type

Use these rules directly instead of inferring them from UI components.

- Funding pool:
  - requires `title`, `description`, `requested amount`, `beneficiary`, and `signer`
  - `requestedAmount` is user-supplied and must be encoded with the pool token decimals
- Streaming pool:
  - requires `title`, `description`, `beneficiary`, and `signer`
  - `requestedAmount` is encoded as `0`
- Signaling pool:
  - requires `title`, `description`, and `signer`
  - `requestedAmount` is encoded as `0`
  - `beneficiaryAddress` is encoded as the zero address

## Missing Input Resolution

Before asking the user for more information:

- if the pool was not already specified or derivable from the user's request, stop and ask for either the full Gardens pool link or the chain, community address, and pool address individually
- ingest both the community covenant and the pool description from indexed or onchain sources
- use those sources and the pool-type mapping in this skill to determine which proposal fields are actually required
- extract any context already present in the user's message, such as a Gardens URL, pool address, network, beneficiary, or execution preference
- if the user wants execution through Foundry, first confirm Foundry is installed and a usable local keystore exists; if either is missing, help the user establish it before continuing
- if the user wants execution through Foundry, try to infer the signer from a local Foundry keystore before asking for a signer address
- if a keystore account alias is already known or strongly implied by local instructions, try that account first before asking for a keystore account name
- if the user prefers not to use a keystore, offer a plug-and-play local command that includes the RPC URL and placeholders for the remaining secrets
- ask only for the remaining missing fields, never for values already provided or derived
- when information is missing, present a short list of exactly what is still needed and why it is needed

The minimum follow-up should be shaped by pool type:

- funding pool: ask for title, description, requested amount, beneficiary, and signer only if any of them are still missing
- streaming pool: ask for title, description, beneficiary, and signer only if any of them are still missing
- signaling pool: ask for title, description, and signer only if any of them are still missing

## Canonical Indexed Reads

Resolve proposal context from the subgraph first. The standard fields needed for proposal creation are:

- `cvstrategy.id`
- `cvstrategy.poolId`
- `cvstrategy.token`
- `cvstrategy.metadataHash`
- `cvstrategy.metadata { title description }`
- `cvstrategy.config { proposalType decay maxRatio weight minThresholdPoints }`
- `cvstrategy.stream { superfluidToken maxFlowRate }` when relevant
- `cvstrategy.registryCommunity { id communityName covenantIpfsHash covenant { text } members(where:{isRegistered:true}) { memberAddress } }`
- `arbitrableConfigs(where: { strategy: $strategyId }) { submitterCollateralAmount challengerCollateralAmount }`
- `allos(first: 1) { id chainId tokenNative }`

If the indexed metadata object is absent but `metadataHash` exists, resolve the metadata through IPFS instead of searching the frontend.

## Safety Rails

- Do not guess pool addresses, strategy addresses, collateral values, or metadata.
- Do not ask the user for community covenant or pool description if those can be resolved from the repo skills.
- Do not skip membership or signer balance checks.
- Do not encode writes before proposal metadata is prepared when metadata is required.
- Do not broadcast unless the user explicitly asks to submit and all gating checks pass.
- Do not ask the user to paste raw private keys.
- If the runtime environment does not have Foundry or a local keystore available, help the user install Foundry or create/import a keystore first when interactive local setup is possible. Only fall back to a local command template when the environment cannot support that setup.
- Prefer reviewed transaction payloads before execution, but submit the transaction when the user explicitly requests execution and prerequisites are satisfied.
- For proposal creation, use the repo skills and the canonical rules in this skill before inventing a new workflow.
- If signer information is missing, inspect local Foundry keystores before asking the user for a signer address.
- For Foundry signing, ask for the keystore account name when execution is explicitly requested and it is not already known. Then use `--account <KEYSTORE_NAME>` and allow interactive terminal password entry. If a named account is unavailable, fall back to an explicit local `--keystore` path. If non-interactive signing is needed, use a local `--password-file` path supplied on the machine.

## Proposal Creation Path

For frontend-compatible Gardens proposal creation, the write path is:

- `Allo.registerRecipient(poolId, data)`

The encoded proposal payload must represent the canonical frontend-compatible tuple below. Do not assume proposal creation is a direct call to the strategy contract.

## Canonical Payload Encoding

Encode `data` as a single tuple with this shape:

```text
(
  uint256 poolId,
  address beneficiaryAddress,
  uint256 requestedAmount,
  address requestedTokenAddress,
  (
    uint256 pointer,
    string ipfsHash
  ) metadata
)
```

Use these canonical encoding rules:

- `poolId`: the Allo pool id from `cvstrategy.poolId`
- `beneficiaryAddress`:
  - funding: user-provided beneficiary
  - streaming: user-provided beneficiary
  - signaling: `0x0000000000000000000000000000000000000000`
- `requestedAmount`:
  - funding: user amount encoded with the pool token decimals
  - streaming: `0`
  - signaling: `0`
- `requestedTokenAddress`: `cvstrategy.token`
- `metadata.pointer`: `1`
- `metadata.ipfsHash`: the proposal metadata CID

Then call:

```text
Allo.registerRecipient(poolId, data)
```

Use `submitterCollateralAmount` from `arbitrableConfigs` as `msg.value` when present.

## Workflow

1. Resolve the target network, community, pool, strategy, covenant, and pool metadata using the repo skills.
2. Ingest both the community covenant and the pool description, then extract all proposal-relevant context already available from the user request and the resolved pool data.
3. Determine pool type from `cvstrategy.config.proposalType` using the canonical mapping in this skill.
4. If signer information is still missing, inspect local Foundry keystore accounts and derive the signer when possible before asking for it.
5. If any required proposal input is still missing, stop and ask only for those unresolved fields.
6. Read live chain state to confirm collateral requirements, signer native balance, and signer membership eligibility.
7. Prepare the proposal metadata JSON and IPFS CID if metadata is required.
8. Encode the proposal write through `Allo.registerRecipient(poolId, data)` using the canonical tuple in this skill.
9. If the user asked for preparation only, return a reviewed payload with target address, chain id, calldata, ETH value, signer prerequisites, and a short explanation.
10. If the user explicitly asked to submit, execute the transaction with keystore-backed signing after the checks pass and return the transaction hash and a short execution summary.
11. If any required input or gating check is missing, stop, report what was resolved, and state exactly what remains missing.

## Gating Checks

Before preparing or broadcasting a proposal creation transaction, confirm all of the following:

- the signer is a registered member of the target community
- the signer has enough native token for `submitterCollateralAmount` plus gas
- the target Allo pool id resolves to the expected strategy address
- the proposal is not an accidental duplicate when the user intends to replace a recently cancelled proposal

## IPFS Metadata Rules

When metadata is required, prepare JSON in this shape before encoding the write:

```json
{
  "title": "<proposal title>",
  "description": "<proposal description>"
}
```

Then encode the CID in the onchain metadata tuple as:

```json
{
  "pointer": 1,
  "ipfsHash": "<IPFS_CID>"
}
```

Prefer the repo's existing IPFS workflow and references under `skills/write-contract/references/ipfs-json-structures.md`.

## Output Format

Return the result in a review-friendly format containing:

- target contract address
- chain id
- function name
- calldata or encoded args
- ETH value required for collateral
- signer prerequisites
- short explanation of what the transaction does

If the transaction is submitted, also return:

- transaction hash
- signer used
- short execution status summary

When the action is sensitive, prefer this payload shape:

```json
{
  "chainId": 0,
  "to": "0x...",
  "value": "0",
  "data": "0x...",
  "operation": 0,
  "summary": "Create a Gardens proposal"
}
```

## Execution Notes

- Produce and run `cast send` when the user explicitly asks to execute.
- Prefer `cast calldata` for encoding and dry-run review.
- When execution is requested, confirm that Foundry is installed and the required local keystore exists before finalizing the execution plan. If either is missing and the environment allows it, run the interactive setup flow directly.
- When execution is requested, prefer keystore-backed signing with `--account <KEYSTORE_NAME>` and try to derive the signer from a local keystore before asking for a signer address. Let the user enter the keystore password interactively in the terminal.
- If interactive entry is not practical, fall back to a local `--keystore` path plus a local `--password-file` path.
- If the current environment does not have Foundry or a keystore available, do not ask for secrets in chat and do not attempt execution there. Instead, return a plug-and-play local command template such as `cast send <TO> --data <DATA> --value <VALUE> --rpc-url <RPC_URL> --private-key <PRIVATE_KEY>` and tell the user to append the private key locally on their own machine.
- Keep password handling local to the machine and outside versioned agent files.
- After submission, report the exact transaction hash and the chain it was sent on.
