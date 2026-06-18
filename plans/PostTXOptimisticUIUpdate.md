# Optimistic Proposal UI While Indexing

## Summary

Extend pending-indexed transactions with proposal-specific optimistic metadata and apply it through an opt-in `useSubgraphQuery` overlay layer. All proposal-related UI should use the shared proposal projector so status, creation, and support/allocation updates appear consistently while the subgraph is behind. The subgraph remains canonical once the indexed block passes the tx block.

## Key Changes

- Extend `publishAfterIndexed(receipt, payload, options?)` in `/home/corantin/Documents/GitHub/gardens-v2/apps/web/contexts/pubsub.context.tsx` with optional persisted optimistic metadata.
- Add typed optimistic kinds:
  - `proposal-created`: strategy id, proposal number, metadata IPFS hash, beneficiary, requested amount, proposal type.
  - `proposal-allocation`: strategy id, allocator, submitted target support values/deltas as decimal strings.
  - `proposal-status`: strategy id, proposal number/id, target status such as `cancelled`, `disputed`, or `executed`.
- Add an optional `optimistic` config to `useSubgraphQuery`:
  - `scope`: matches current-chain pending records by topic/container/id.
  - `apply`: receives fetched subgraph data plus pending optimistic records and returns patched UI data.
- Implement a shared proposal optimistic projector and apply it to every proposal-related query surface, including pool proposal lists, proposal detail pages, proposal modal/card variants, supporter/allocation data, and proposal action/status displays.
- Do not persist proposal title or description in localStorage. Persist only `metadataHash`; proposal UI loads title/description through the existing IPFS metadata fetch path.

## Behavior

- `useSubgraphQuery` still fetches the subgraph normally. It does not answer full queries from localStorage.
- If matching pending tx records exist and their tx block is not indexed yet, the hook overlays optimistic proposal data onto the fetched result.
- Once the latest indexed block passes the tx block, the pending record is cleared, the silent publish/refetch runs, and canonical subgraph data replaces the optimistic overlay.
- Components using independent onchain proposal status reads keep treating onchain as stronger truth; the optimistic overlay fills the gap before onchain/subgraph data reflects the tx.

## Allocation Safety

- Allocation optimistic data updates display baselines, but new allocation txs must not rely only on patched subgraph data.
- Before every allocation submit, keep the exact voting-power refetch from `votingPowerRegistry.getMemberPowerInStrategy(wallet, strategy)`.
- If any pending allocation exists for the same wallet and strategy, read exact proposal voter stakes from `getProposalVoterStake(proposalNumber, wallet)` for involved proposals before encoding the next delta.
- If those onchain stake reads fail while a pending allocation exists, block submit and show an error instead of sending a likely-reverting tx.
- Serialize allocation values as decimal strings in storage and convert to `bigint` only at hook/component boundaries.

## Test Plan

- Add tests for pending record normalization/persistence with optional optimistic metadata and backward compatibility for old records.
- Add projector tests for proposal creation, status overlays, allocation overlays, nested proposal lists, and missing/nonmatching records.
- Add allocation submit tests proving a second allocation computes deltas from mocked `getProposalVoterStake`, not stale subgraph data.
- Add coverage that all proposal-related `useSubgraphQuery` callsites opt into the proposal projector where they display proposal status/data.
- Run from `/home/corantin/Documents/GitHub/gardens-v2/apps/web`:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test:unit` if new unit tests are added.

## Assumptions

- V1 covers all proposal-related UI, but not community/pool optimistic placeholders.
- Optimistic state starts only after a tx receipt is confirmed.
- The local `dev` branch should be synced before implementation; it was observed `behind 2` during planning.
