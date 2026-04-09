# IPFS JSON Structures

Source of truth for this file: the frontend implementation in `apps/web`.

Use this reference when a Gardens write requires an IPFS CID, metadata pointer, or `ipfsHash`.
The frontend currently uploads JSON with `ipfsJsonUpload(...)` in six places.

Hosted upload endpoint:
- In production, the frontend route resolves to `https://app.gardens.fund/api/ipfs`.
- In the app source, uploads are made to the relative route `/api/ipfs`.

## Shared Metadata Wrapper

When a write expects a `Metadata` struct onchain, the frontend uses:

```json
{
  "protocol": 1,
  "pointer": "<IPFS_CID>"
}
```

`protocol: 1` means IPFS in this codebase.

## 1. Community Creation Covenant

Frontend source:
- `apps/web/components/Forms/CommunityForm.tsx`

Upload JSON:

```json
{
  "covenant": "<markdown or plain text covenant>"
}
```

Write target:
- `RegistryFactory.createRegistry(params)`

How the CID is used:
- The uploaded CID is passed as `params.covenantIpfsHash`.
- The frontend does **not** currently use the `params._metadata.pointer` field for this flow.
- Instead it passes:

```json
{
  "protocol": 1,
  "pointer": ""
}
```

Important distinction:
- For community creation, the covenant CID lives in `covenantIpfsHash`, not in `Metadata.pointer`.

## 2. Community Edit Covenant

Frontend source:
- `apps/web/components/EditCommunityModal.tsx`

Upload JSON:

```json
{
  "covenant": "<markdown or plain text covenant>"
}
```

Write target:
- `RegistryCommunity.setCommunityParams(CommunityParams)`

How the CID is used:
- The uploaded CID is assigned to `covenantIpfsHash`.
- Upload only happens when the covenant text changed.

## 3. Pool Creation Metadata

Frontend source:
- `apps/web/components/Forms/PoolForm.tsx`

Upload JSON:

```json
{
  "title": "<pool title>",
  "description": "<pool description>"
}
```

Write target:
- `RegistryCommunity.createPool(address _token, CVStrategyInitializeParamsV0_3 _params, Metadata _metadata)`

How the CID is used:
- The uploaded CID becomes:

```json
{
  "protocol": 1,
  "pointer": "<IPFS_CID>"
}
```

Notes:
- This is the canonical pool metadata shape used by the frontend.
- `apps/web/hooks/useIpfsFetch.ts` also treats pool metadata as `title` plus `description`.

## 4. Proposal Creation Metadata

Frontend source:
- `apps/web/components/Forms/ProposalForm.tsx`

Upload JSON:

```json
{
  "title": "<proposal title>",
  "description": "<proposal description>"
}
```

Write target:
- `Allo.registerRecipient(uint256 _poolId, bytes _data)`

How the CID is used:
- The proposal calldata encodes `CreateProposal`, whose `metadata` field is:

```json
{
  "protocol": 1,
  "pointer": "<IPFS_CID>"
}
```

Notes:
- The write is not a direct `CVStrategy.registerRecipient(...)` call from the frontend.
- The frontend calls Allo, which forwards the encoded proposal payload to the strategy.

## 5. Proposal Edit Metadata

Frontend source:
- `apps/web/components/Forms/EditProposalForm.tsx`

Upload JSON:

```json
{
  "title": "<proposal title>",
  "description": "<proposal description>"
}
```

Write target:
- `CVStrategy.editProposal(uint256 proposalId, Metadata metadata, address beneficiary, uint256 requestedAmount)`

How the CID is used:
- The uploaded CID becomes:

```json
{
  "protocol": 1,
  "pointer": "<IPFS_CID>"
}
```

Notes:
- Upload only happens when the proposal metadata changed.
- If the title and description are unchanged, the frontend reuses the existing `proposal.metadataHash`.

## 6. Proposal Dispute Reason

Frontend source:
- `apps/web/components/DisputeModal.tsx`

Upload JSON:

```json
{
  "reason": "<human-readable dispute reason>"
}
```

Write target:
- `CVStrategy.disputeProposal(...)`

How the CID is used:
- The uploaded CID is passed as the dispute reason hash string argument.
- This flow uses a raw CID string, not a `Metadata` struct.

## Read Shapes Used By The Frontend

Frontend metadata readers currently expect these JSON shapes:

Proposal and pool metadata:

```json
{
  "title": "<string>",
  "description": "<string>"
}
```

Community covenant:

```json
{
  "covenant": "<string>"
}
```

Dispute reason:

```json
{
  "reason": "<string>"
}
```
