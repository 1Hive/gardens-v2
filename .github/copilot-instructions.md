# Copilot Code Reviewer Instructions — Gardens v2

This document guides automated and AI-assisted **code review** for the Gardens v2 monorepo.
Focus on **correctness, upgrade safety, protocol invariants, and cross-package consistency**.

---

## 1. Project Context (High-Level)

Gardens v2 is a modular governance framework implementing **Conviction Voting** on top of **Allo Protocol v2**, deployed across multiple EVM chains (Gnosis, Polygon, Arbitrum, Optimism, Base, Celo).

Core components:

* **Solidity contracts** (`pkg/contracts`) using:

  * UUPS / ERC1967 proxies
  * EIP-2535 Diamond pattern
  * EIP-1167 minimal clones
* **Subgraph** (`pkg/subgraph`) for indexing
* **Next.js frontend** (`apps/web`)
* **Shared UI & TS configs** (`pkg/ui`, `pkg/tsconfig`)

---

## 2. Review Priorities (Order of Importance)

1. **Storage safety & upgradeability**
2. **Diamond pattern correctness**
3. **Protocol invariants (CV logic, staking, allocation, disputes)**
4. **Security & access control**
5. **Cross-package consistency (contracts ↔ subgraph ↔ frontend)**
6. **Gas / size constraints**
7. **Test coverage & regressions**

---

## 3. Smart Contract–Specific Rules

### 3.1 Upgrade & Storage Safety (CRITICAL)

For any change touching storage or facets:

* ❌ Never reorder existing storage variables
* ❌ Never change types of existing variables
* ✅ Only append new variables at the end (before `__gap`)
* ✅ Decrease `__gap` when adding variables
* ✅ All facets **must** inherit from the correct `*BaseFacet`
* ✅ Main diamond + all facets **must** have identical storage layout

If a PR:

* Adds/removes storage variables
* Modifies BaseFacet
* Adds a new facet
* Touches CVStrategy or RegistryCommunity storage

→ **Require storage layout verification** via `verify-storage-layout.sh`.

Flag if missing.

---

### 3.2 Diamond Pattern Invariants

* Facets must:

  * Share storage via BaseFacet
  * Not declare independent storage
* No logic should assume constructor state (diamonds use delegatecall)
* Check:

  * Function selectors collisions
  * Missing facet registration
  * Incorrect inheritance from BaseFacet
* Ensure:

  * No state shadowing
  * No duplicated storage declarations

---

### 3.3 Proxy / UUPS Rules

* Initializers:

  * Must be protected (`initializer` / `reinitializer`)
  * Must not be callable twice
* `_authorizeUpgrade`:

  * Must have strict access control
* No constructors for state
* Check for:

  * Uninitialized implementations
  * Missing initializer calls in deploy scripts
  * Unsafe upgrade paths

---

### 3.4 Conviction Voting Logic (Protocol Invariants)

When reviewing changes in:

* `CVStrategy`
* `ConvictionsUtils`
* Allocation / staking / proposal logic

Check for:

* Conviction growth/decay math correctness
* No overflow/underflow or precision loss
* Threshold logic consistency:

  * `minThresholdPoints`
  * `maxRatio`
  * `weight`, `decay`
* Proposal lifecycle correctness:

  * Creation → staking → execution → dispute → resolution
* No way to:

  * Double-spend voting power
  * Bypass thresholds
  * Execute twice
  * Skip dispute window (if applicable)

---

### 3.5 Dispute Resolution

* Challenger collateral must be enforced
* Ruling outcomes:

  * Approve (1)
  * Reject (2)
  * Default (timeout)
* Check:

  * Correct state transitions
  * No stuck proposals
  * No bypass of arbitrator authority
  * Proper refund / slashing paths

---

### 3.6 Access Control & Roles

Verify for any sensitive function:

* Only intended roles can:

  * Upgrade
  * Allocate funds
  * Change parameters
  * Resolve disputes
  * Create pools / strategies
* Safe (Gnosis Safe) integration:

  * No assumptions about `msg.sender` being EOA
* No missing modifiers on:

  * Admin setters
  * Upgrade hooks
  * Critical state transitions

---

### 3.7 Gas & Size Constraints

* CVStrategy is near **24KB limit**
* Watch for:

  * New revert strings
  * Large inline logic
  * Duplicate code across facets
* Prefer:

  * Libraries
  * Shared base logic
  * Facet split instead of bloating one facet

---

## 4. Tests (Required Expectations)

For contract PRs:

* New logic → **new tests**
* Storage changes → **storage verification + tests**
* Bug fix → **regression test**
* Check:

  * Tests cover revert paths
  * Tests cover edge cases (0 stake, max cap, threshold edges, disputes)

Flag PRs that:

* Change logic without test updates
* Reduce coverage of critical paths

---

## 5. Subgraph Review Rules

When contracts change:

* Events:

  * Are they still emitted?
  * Signature or params changed?
* Subgraph:

  * Mappings updated?
  * Schema still consistent?
* Check:

  * No silent break of indexing
  * No missing handler for new events
  * No removed fields without migration plan

---

## 6. Frontend Consistency Checks

When ABI / contract interfaces change:

* `pnpm generate` output likely impacted
* Check:

  * wagmi bindings still match
  * UI still queries valid fields
  * No hardcoded assumptions broken (e.g., enum values, struct shapes)

---

## 7. Deployment & Scripts

If PR touches:

* `pkg/contracts/script/`
* Makefile
* Deployment flow

Check:

* Initializers called
* Proxies wired correctly
* No chain-specific config accidentally broken
* No private keys / secrets introduced
* No skipping of `verify-storage` for prod deploys

---

## 8. Red Flags (Always Call Out)

* Storage variable reorder or type change
* Facet declaring its own storage
* Missing upgrade authorization checks
* Logic relying on constructor state
* Changing CV math without tests
* Removing events used by subgraph
* Contract size increase near limit without justification
* "Quick fix" in protocol-critical paths without tests

---

## 9. Review Tone & Output Expectations (for Copilot)

* Be **strict** on:

  * Storage safety
  * Upgradeability
  * Protocol invariants
* Be **explicit** about:

  * What invariant is at risk
  * What could break in production
  * What test or check is missing
* Prefer:

  * Concrete, actionable review comments
  * Pointing to exact files / patterns
  * Suggesting verification steps (e.g., storage script, specific tests)

---

## 10. Key Files & Areas of Interest

* `pkg/contracts/src/CVStrategy/**`
* `pkg/contracts/src/RegistryCommunity/**`
* `pkg/contracts/src/**/facets/**`
* `pkg/contracts/src/**/BaseFacet.sol`
* `pkg/contracts/scripts/verify-storage-layout.sh`
* `pkg/subgraph/schema.graphql`
* `pkg/subgraph/src/**`
* `apps/web` 
