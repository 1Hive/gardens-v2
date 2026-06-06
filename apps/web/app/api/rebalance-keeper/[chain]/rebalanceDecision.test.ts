import { describe, expect, it } from "vitest";
import {
  ACTIVE_STATUS,
  DISPUTED_STATUS,
  RebalanceDecisionInput,
  evaluateRebalanceDecision,
  isSignificantRateChange,
  safeEvaluateRebalanceDecision,
} from "./rebalanceDecision";

const baseInput = (
  overrides: Partial<RebalanceDecisionInput> = {},
): RebalanceDecisionInput => ({
  isStrategyEnabled: true,
  proposalCount: 1,
  poolAmount: 1_000_000n,
  totalPointsActivated: 1_000n,
  decay: 9_000_000n,
  threshold: 100n,
  streamingRatePerSecond: 1_000n,
  superTokenBalance: 10_000n,
  currentTotalFlowRate: 0n,
  hasStreamingConfig: true,
  thresholdBps: 50n,
  proposals: [
    {
      status: ACTIVE_STATUS,
      conviction: 500n,
      currentUnits: 0n,
      currentFlowRate: 0n,
      hasEscrow: true,
    },
  ],
  ...overrides,
});

describe("rebalance decision", () => {
  it("runs when a proposal creates a significant stream rate change", () => {
    expect(evaluateRebalanceDecision(baseInput())).toEqual({
      shouldRun: true,
      reason: "significant_rate_change_50bps",
    });
  });

  it("skips when max conviction already streams the full monthly budget", () => {
    expect(
      evaluateRebalanceDecision(
        baseInput({
          currentTotalFlowRate: 1_000n,
          proposals: [
            {
              status: ACTIVE_STATUS,
              conviction: 15_000n,
              currentUnits: 1_000n,
              currentFlowRate: 1_000n,
              hasEscrow: true,
            },
          ],
        }),
      ),
    ).toEqual({
      shouldRun: false,
      reason: "insignificant_rate_change_50bps",
    });
  });

  it("skips proposal allocation drift below the configured rate threshold", () => {
    expect(
      evaluateRebalanceDecision(
        baseInput({
          currentTotalFlowRate: 100n,
          streamingRatePerSecond: 1_000n,
          proposals: [
            {
              status: ACTIVE_STATUS,
              conviction: 500n,
              currentUnits: 50n,
              currentFlowRate: 50n,
              hasEscrow: true,
            },
            {
              status: DISPUTED_STATUS,
              conviction: 500n,
              currentUnits: 50n,
              currentFlowRate: 50n,
              hasEscrow: true,
            },
          ],
        }),
      ),
    ).toEqual({
      shouldRun: false,
      reason: "insignificant_rate_change_50bps",
    });
  });

  it("runs when proposal allocation drift exceeds the rate threshold", () => {
    expect(
      evaluateRebalanceDecision(
        baseInput({
          currentTotalFlowRate: 100n,
          proposals: [
            {
              status: ACTIVE_STATUS,
              conviction: 600n,
              currentUnits: 50n,
              currentFlowRate: 50n,
              hasEscrow: true,
            },
            {
              status: ACTIVE_STATUS,
              conviction: 400n,
              currentUnits: 50n,
              currentFlowRate: 50n,
              hasEscrow: true,
            },
          ],
        }),
      ),
    ).toEqual({
      shouldRun: true,
      reason: "significant_rate_change_50bps",
    });
  });

  it("skips when all active proposals are below threshold and flow is already stopped", () => {
    expect(
      evaluateRebalanceDecision(
        baseInput({
          proposals: [
            {
              status: ACTIVE_STATUS,
              conviction: 100n,
              currentUnits: 0n,
              currentFlowRate: 0n,
              hasEscrow: true,
            },
          ],
        }),
      ),
    ).toEqual({
      shouldRun: false,
      reason: "all_proposals_below_threshold",
    });
  });

  it("skips empty pools with no active flow", () => {
    expect(
      evaluateRebalanceDecision(
        baseInput({
          poolAmount: 0n,
          currentTotalFlowRate: 0n,
        }),
      ),
    ).toEqual({
      shouldRun: false,
      reason: "pool_empty_zero_flow",
    });
  });

  it("skips when there are no proposals and no active flow", () => {
    expect(
      evaluateRebalanceDecision(
        baseInput({
          proposalCount: 0,
          proposals: [],
        }),
      ),
    ).toEqual({
      shouldRun: false,
      reason: "no_proposals",
    });
  });

  it("runs when an escrow outflow is closed while the GDA member flow is active", () => {
    expect(
      evaluateRebalanceDecision(
        baseInput({
          currentTotalFlowRate: 1_000n,
          proposals: [
            {
              status: ACTIVE_STATUS,
              conviction: 15_000n,
              currentUnits: 1_000n,
              currentFlowRate: 1_000n,
              currentOutflowRate: 0n,
              escrowDisputed: false,
              hasEscrow: true,
            },
          ],
        }),
      ),
    ).toEqual({
      shouldRun: true,
      reason: "escrow_outflow_drift_50bps",
    });
  });

  it("runs when a disputed escrow still has an outgoing beneficiary flow", () => {
    expect(
      evaluateRebalanceDecision(
        baseInput({
          currentTotalFlowRate: 1_000n,
          proposals: [
            {
              status: DISPUTED_STATUS,
              conviction: 15_000n,
              currentUnits: 1_000n,
              currentFlowRate: 1_000n,
              currentOutflowRate: 1_000n,
              escrowDisputed: true,
              hasEscrow: true,
            },
          ],
        }),
      ),
    ).toEqual({
      shouldRun: true,
      reason: "escrow_outflow_drift_50bps",
    });
  });

  it("runs to stop flow when there are no proposals but flow is still active", () => {
    expect(
      evaluateRebalanceDecision(
        baseInput({
          proposalCount: 0,
          currentTotalFlowRate: 1n,
          proposals: [],
        }),
      ),
    ).toEqual({
      shouldRun: true,
      reason: "no_proposals_stop_flow",
    });
  });

  it("runs to clear units from inactive proposals", () => {
    expect(
      evaluateRebalanceDecision(
        baseInput({
          currentTotalFlowRate: 0n,
          proposals: [
            {
              status: 4,
              conviction: 500n,
              currentUnits: 10n,
              currentFlowRate: 0n,
              hasEscrow: true,
            },
          ],
        }),
      ),
    ).toEqual({
      shouldRun: true,
      reason: "inactive_proposal_units_need_clear",
    });
  });

  it("falls back to rebalancing when the decision algorithm throws", () => {
    const errors: unknown[] = [];

    expect(
      safeEvaluateRebalanceDecision(
        {
          ...baseInput(),
          proposals: null,
        } as unknown as RebalanceDecisionInput,
        (error) => errors.push(error),
      ),
    ).toEqual({
      shouldRun: true,
      reason: "decision_failed_safe_rebalance",
      error: "Cannot read properties of null (reading 'filter')",
    });
    expect(errors).toHaveLength(1);
  });
});

describe("rate significance threshold", () => {
  it("treats 50 bps as the default materiality boundary", () => {
    expect(
      isSignificantRateChange({
        current: 10_000n,
        target: 10_050n,
        thresholdBps: 50n,
      }),
    ).toBe(false);
    expect(
      isSignificantRateChange({
        current: 10_000n,
        target: 10_051n,
        thresholdBps: 50n,
      }),
    ).toBe(true);
  });
});
