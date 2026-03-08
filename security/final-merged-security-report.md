# Final Merged Security Report

Date: 2026-03-08
Branch: `streaming-pool`

## Sources Merged
- `scv-scan.md` (root, processed set)
- `security/scv-scan.md` (new report)
- `pkg/contracts/test/SecurityPoC.t.sol` (active PoC gate)
- `security/pkg/contracts/test/SecurityPoC.t.sol` (new PoC source, now synced/reversed)

## Deduplication Outcome
- Duplicate findings across both reports were merged by finding ID and root cause.
- Net-new unique finding from `security/scv-scan.md`: `M-7` (push-payment DoS in collateral withdrawal/dispute resolution).
- `P-3` PoC is **not** a new finding ID; it is additional coverage for existing `M-4` (unbounded loops / gas DoS class).

## Final Unique Vulnerability Set (No Duplicates)
- High: `H-1`, `H-2`, `H-3` (3)
- Medium: `M-1`, `M-2`, `M-3`, `M-4`, `M-5`, `M-6`, `M-7` (7)
- Low: `L-1`, `L-2` (2)
- Informational: `I-1`, `I-2` (2)
- Total unique findings: **14**

## PoC Merge and Inversion Status
- Merged PoC file: `pkg/contracts/test/SecurityPoC.t.sol`
- Added merged coverage:
  - `PoC_M7_PushPaymentChallengerDoS`
  - `PoC_M4b_VoterStakedProposalsDoS` (M-4 extra path coverage)
- Inversion rule enforced: tests now assert secure behavior and fail when exploitability remains.
- Synced the same reversed PoC into `security/pkg/contracts/test/SecurityPoC.t.sol`.

## Validation Results
Command:
```bash
forge test --match-path pkg/contracts/test/SecurityPoC.t.sol -vv
```

Result:
- Total: 15 tests
- Passed: 14
- Failed: 1
- Failing test:
  - `PoC_M7_PushPaymentChallengerDoS::test_M7_ETHRejectorMustNotLockDisputeResolution`
  - Failure: `TransferFailed()`

## Interpretation
- Previously processed findings remain non-exploitable under the merged PoC gate.
- `M-7` remains exploitable and is now correctly surfaced as a failing security gate.
- No duplicate vulnerability IDs remain in the merged report set.
