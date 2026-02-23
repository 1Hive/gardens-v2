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
