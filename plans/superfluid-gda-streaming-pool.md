# ADR-007: Superfluid GDA–based Streaming Pool with Conviction Rebalancing

## Status

Accepted

## Context

Gardens requires a new pool type that can:

- Continuously distribute a **monthly budget** of a single token
- Allocate funds to **proposals proportionally to on-chain conviction**
- Adjust allocations as conviction grows over time
- Support **proposal disputes** that temporarily hold funds and conditionally release or return them
- Avoid trusted off-chain actors and per-block updates

The solution must be safe, scalable, and compatible with long-lived DAO governance.

## Decision

We will implement the Streaming Pool using **Superfluid General Distribution Agreement (GDA) pools**, with the following design:

1. **Distribution Model**

   - Use a Superfluid **GDA pool** per StreamingPool
   - Stream the total monthly budget into the GDA pool as a continuous flow
   - Proposal shares are represented as **member units**, proportional to conviction

2. **Conviction → Units**

   - Conviction is read **on-chain**
   - Units are updated **discretely** via a rebalance function
   - Units are normalized to a fixed cap:
     ```
     units_i = conviction_i * UNIT_CAP / sum(conviction_active)
     ```
   - This keeps units bounded and purely relative

3. **Rebalancing**

   - `rebalance()` is **permissionless**
   - A keeper/cron is used only for liveness
   - Current operational assumption: a cron-triggered rebalance runs every **5 minutes**
   - The contract enforces:
     - `minUpdateDelay` (time gate)
     - minimum change thresholds (bps / absolute)
     - batching (`maxPerTx`)
   - No per-block or off-chain calculation

4. **Proposal Membership**

   - Each active proposal corresponds to a **GDA member**
   - The member address is a **DisputeEscrow contract**, not the final beneficiary
   - When a proposal ends, its units are set to zero

5. **Dispute Handling**

   - GDA does not support “pause but accrue”
   - Instead, funds accrue in a **DisputeEscrow**
     - Normal: escrow auto-forwards funds to beneficiary
     - Disputed: escrow holds funds
     - Resolved:
       - upheld → transfer accumulated funds to beneficiary
       - rejected → return accumulated funds to pool treasury

6. **Auto-Connect**

   - EOAs cannot be auto-connected to GDA pools
   - Escrow contracts **auto-connect themselves** to the GDA pool on deployment
   - This ensures uninterrupted streaming and accumulation

7. **Permissions**
   - Rebalance: permissionless
   - Proposal activation / deactivation: governance only
   - Budget changes: governance only
   - Dispute resolution: governance / resolver only
   - Emergency pause supported

## Alternatives Considered

### Constant Flow Agreement (CFA) per proposal

- Pros: true per-recipient streams
- Cons:
  - One stream per proposal (scales poorly)
  - Harder to implement dispute accumulation
  - More operational risk

### Instant Distribution Agreement (IDA)

- Pros: simpler accounting
- Cons:
  - Not continuous streaming
  - Requires manual distribution calls

### Off-chain allocation computation

- Pros: fewer on-chain loops
- Cons:
  - Requires trusted service
  - Breaks DAO credibility
  - Harder to audit

### Pausing units and tracking “debt”

- Pros: no escrow contracts
- Cons:
  - Custom debt accounting
  - More complex and error-prone than escrow

## Consequences

### Positive

- Continuous, predictable streaming UX
- Fully on-chain, permissionless correctness
- Clean dispute accumulation semantics
- Bounded and auditable state transitions
- Minimal Superfluid surface area

### Tradeoffs

- Requires periodic rebalance calls (keeper/cron)
- Discrete updates approximate continuous conviction growth
- Requires deploying escrow contracts per proposal

### Follow-ups

- Tune `minUpdateDelay`, thresholds, and batch size
- Standardize DisputeEscrow implementation
- Add monitoring for rebalance liveness

## Meeting Follow-Ups From 2026-03-04 Core Sync

These are transcript-derived suggestions specifically relevant to the streaming pool feature and current web implementation.

### UX and Visual Design

- Replace the current streaming animation / illustration with a clearer metaphor for value flowing over time.
- Keep the visual treatment aligned with the rest of the Gardens UI rather than using a placeholder-style graphic.
- Review Flow State UI patterns as inspiration for cleaner stream information cards.

### Pool and Proposal UI

- Right-align the `Join` button / primary membership CTA.
- Show the user's current balance inside the streaming modal, not only as an insufficient-balance warning.
- Fix the step text / rendering for steps `1`, `2`, and `3` in the modal flow.
- Reduce information overload on the proposal details page, especially the right-side information cluster.
- Preserve useful recipient-facing information such as `available to unwrap`, but remove debug/internal escrow details from production views.
- Restrict `unwrap / claim funds` actions to the proposal owner; non-owners should see status or explanatory text instead of the action.

### Terminology and States

- Prefer `threshold` as the user-facing term for the conviction requirement.
- Make it explicit in the UI that if threshold is not met, the stream does not begin.
- Split proposal/pool stream states more clearly than `active`, for example:
  - `streaming`
  - `active but not streaming`

### Rebalance / Sync UX

- Keep the `sync stream` / `rebalance` action out of the primary UX by default unless there is a clear user need.
- If a manual sync action remains available, position it as an exception/liveness control rather than a normal user task.
- Because rebalance is expected to run from cron every 5 minutes, proposals that have crossed threshold but are waiting for the next rebalance should be presented as `about to stream`, not as manually pending execution.

### Routing and Integrations

- Evaluate changing pool URLs from pool ID-based bootstrapping to contract-address-based bootstrapping.
- Main rationale:
  - faster page bootstrapping
  - fewer lookup queries
  - easier external integration, especially for Flow State-style forwarding
- Validate with external integrators before locking this in.

### Production Readiness

- Address the known security issues before production rollout.
- Secure the required Superfluid deployment key / super app credentials before launch.

## Latest UX Decisions

These decisions supersede older wording where there is a conflict.

### Streaming Status Language

- For streaming proposals, avoid user-facing references to `executed` except in developer/internal contexts.
- Keep `executed` as the internal enum / contract-facing state if needed, but do not surface it as the primary UX label.
- Preferred user-facing status labels:
  - `streaming` when the proposal has active flow
  - `about to stream` when the proposal has crossed threshold and is waiting for the next scheduled rebalance
  - `active, not streaming` when the proposal is active but below threshold
  - `disputed`, `cancelled`, and `rejected` remain unchanged

### Streaming Copy Rules

- Replace `Ready to be executed` with `About to stream` for streaming proposals.
- Replace `Executed` timeline/milestone language with `Started streaming` for streaming proposals.
- Replace funding-style `pass/execute` messaging with streaming-specific wording where appropriate:
  - `This proposal is active. Once it reaches the threshold, it will start streaming automatically unless successfully disputed.`
- Prefer `Before streaming starts` over `Before stream start`.

### Current Web App Direction

- The web app already uses contract-address-based pool routing, so URL work should be treated as validation / cleanup rather than a net-new routing model.
- Streaming status copy in the web app should continue to diverge from funding-pool terminology even if both share the same underlying proposal status enum.
