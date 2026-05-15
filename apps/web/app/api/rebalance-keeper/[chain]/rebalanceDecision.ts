export const ACTIVE_STATUS = 1;
export const DISPUTED_STATUS = 5;
export const CONVICTION_D = 10_000_000n;
export const UINT128_MAX = (1n << 128n) - 1n;
export const DEFAULT_SIGNIFICANT_RATE_CHANGE_BPS = 50n;

export type RebalanceDecisionInput = {
  isStrategyEnabled: boolean;
  proposalCount: number;
  poolAmount: bigint;
  totalPointsActivated: bigint;
  decay: bigint;
  threshold: bigint;
  streamingRatePerSecond: bigint;
  superTokenBalance: bigint;
  currentTotalFlowRate: bigint;
  hasStreamingConfig: boolean;
  thresholdBps?: bigint;
  proposals: Array<{
    status: number;
    conviction: bigint;
    currentUnits: bigint;
    currentFlowRate: bigint;
    hasEscrow: boolean;
  }>;
};

export type RebalanceDecision = {
  shouldRun: boolean;
  reason: string;
  error?: string;
};

const absDiff = (a: bigint, b: bigint) => (a > b ? a - b : b - a);

export const isSignificantRateChange = ({
  current,
  target,
  thresholdBps,
}: {
  current: bigint;
  target: bigint;
  thresholdBps: bigint;
}) => {
  if (current === target) return false;
  const diff = absDiff(current, target);
  if (current === 0n || target === 0n) return diff > 0n;

  const reference = current > target ? current : target;
  const threshold = (reference * thresholdBps) / 10_000n;
  return diff > (threshold > 0n ? threshold : 1n);
};

export function evaluateRebalanceDecision({
  isStrategyEnabled,
  proposalCount,
  poolAmount,
  totalPointsActivated,
  decay,
  threshold,
  streamingRatePerSecond,
  superTokenBalance,
  currentTotalFlowRate,
  hasStreamingConfig,
  thresholdBps = DEFAULT_SIGNIFICANT_RATE_CHANGE_BPS,
  proposals,
}: RebalanceDecisionInput): RebalanceDecision {
  if (!hasStreamingConfig) {
    return { shouldRun: false, reason: "streaming_not_configured" };
  }

  if (!isStrategyEnabled) {
    return currentTotalFlowRate === 0n ?
        { shouldRun: false, reason: "strategy_disabled_zero_flow" }
      : { shouldRun: true, reason: "strategy_disabled_stop_flow" };
  }

  if (proposalCount === 0) {
    return currentTotalFlowRate === 0n ?
        { shouldRun: false, reason: "no_proposals" }
      : { shouldRun: true, reason: "no_proposals_stop_flow" };
  }

  if (poolAmount === 0n && currentTotalFlowRate === 0n) {
    return { shouldRun: false, reason: "pool_empty_zero_flow" };
  }

  const maxConviction =
    decay >= CONVICTION_D ? 0n : (
      (totalPointsActivated * CONVICTION_D) / (CONVICTION_D - decay)
    );

  let totalEligibleConviction = 0n;
  let activeOrDisputedWithEscrow = 0;
  let nonActiveUnitsNeedClearing = false;

  const activeProposals = proposals.filter((proposal) => {
    if (!proposal.hasEscrow) return false;
    const isActiveOrDisputed =
      proposal.status === ACTIVE_STATUS || proposal.status === DISPUTED_STATUS;
    if (!isActiveOrDisputed) {
      if (proposal.currentUnits !== 0n) {
        nonActiveUnitsNeedClearing = true;
      }
      return false;
    }

    activeOrDisputedWithEscrow += 1;
    if (proposal.conviction > threshold) {
      totalEligibleConviction += proposal.conviction;
    }
    return true;
  });

  if (nonActiveUnitsNeedClearing) {
    return { shouldRun: true, reason: "inactive_proposal_units_need_clear" };
  }

  const canStartStream =
    superTokenBalance > 0n &&
    streamingRatePerSecond > 0n &&
    maxConviction > 0n &&
    totalEligibleConviction > 0n;

  const clampedConviction =
    totalEligibleConviction > maxConviction ? maxConviction : (
      totalEligibleConviction
    );
  const targetTotalFlowRate =
    canStartStream ?
      (streamingRatePerSecond * clampedConviction) / maxConviction
    : 0n;
  const streamingUnitBudget =
    targetTotalFlowRate > UINT128_MAX ? UINT128_MAX : targetTotalFlowRate;

  let targetTotalUnits = 0n;
  const targetUnitsByIndex = activeProposals.map((proposal) => {
    let units = 0n;
    if (proposal.conviction > threshold) {
      if (canStartStream) {
        units =
          (proposal.conviction * streamingUnitBudget) / totalEligibleConviction;
        if (units === 0n) units = 1n;
      } else {
        units = proposal.conviction / CONVICTION_D;
      }
    }
    if (units > UINT128_MAX) units = UINT128_MAX;
    targetTotalUnits += units;
    return units;
  });

  const hasSignificantPoolRateChange = isSignificantRateChange({
    current: currentTotalFlowRate,
    target: targetTotalFlowRate,
    thresholdBps,
  });

  const hasSignificantProposalRateChange = activeProposals.some(
    (proposal, index) => {
      const targetUnits = targetUnitsByIndex[index] ?? 0n;
      const targetFlowRate =
        targetTotalUnits > 0n ?
          (targetTotalFlowRate * targetUnits) / targetTotalUnits
        : 0n;
      return isSignificantRateChange({
        current: proposal.currentFlowRate,
        target: targetFlowRate,
        thresholdBps,
      });
    },
  );

  if (hasSignificantPoolRateChange || hasSignificantProposalRateChange) {
    return {
      shouldRun: true,
      reason: `significant_rate_change_${thresholdBps}bps`,
    };
  }

  for (let i = 0; i < activeProposals.length; i++) {
    const targetUnits = targetUnitsByIndex[i] ?? 0n;
    if (targetUnits === 0n && activeProposals[i]?.currentUnits !== 0n) {
      return { shouldRun: true, reason: "proposal_units_need_zeroing" };
    }
  }

  if (activeOrDisputedWithEscrow === 0) {
    return { shouldRun: false, reason: "no_active_or_disputed_proposals" };
  }

  if (totalEligibleConviction === 0n && currentTotalFlowRate === 0n) {
    return { shouldRun: false, reason: "all_proposals_below_threshold" };
  }

  return {
    shouldRun: false,
    reason: `insignificant_rate_change_${thresholdBps}bps`,
  };
}

export function safeEvaluateRebalanceDecision(
  input: RebalanceDecisionInput,
  onError?: (error: unknown) => void,
): RebalanceDecision {
  try {
    return evaluateRebalanceDecision(input);
  } catch (error) {
    onError?.(error);
    return {
      shouldRun: true,
      reason: "decision_failed_safe_rebalance",
      error: error instanceof Error ? error.message : "unknown_error",
    };
  }
}
