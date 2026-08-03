export type ThresholdAdjustment = {
  direction: "up" | "down";
  stableThresholdPct: number;
};

const THRESHOLD_DISPLAY_FACTOR = 100;

export function getThresholdAdjustment(
  thresholdPct: number | undefined,
  stableThresholdPct: number | undefined,
): ThresholdAdjustment | undefined {
  if (
    thresholdPct == null ||
    stableThresholdPct == null ||
    !Number.isFinite(thresholdPct) ||
    !Number.isFinite(stableThresholdPct)
  ) {
    return undefined;
  }

  const displayedThreshold = Math.round(
    thresholdPct * THRESHOLD_DISPLAY_FACTOR,
  );
  const displayedStableThreshold = Math.round(
    stableThresholdPct * THRESHOLD_DISPLAY_FACTOR,
  );

  if (displayedThreshold === displayedStableThreshold) {
    return undefined;
  }

  return {
    direction: displayedStableThreshold > displayedThreshold ? "up" : "down",
    stableThresholdPct,
  };
}

export function formatThresholdAdjustmentTooltip(
  adjustment: ThresholdAdjustment,
): string {
  if (adjustment.direction === "up") {
    return `Activated pool voting power increased, raising the target threshold to ${adjustment.stableThresholdPct} VP.`;
  }

  return `Activated pool voting power decreased, so the threshold is gradually falling toward its ${adjustment.stableThresholdPct} VP target without falling faster than conviction.`;
}
