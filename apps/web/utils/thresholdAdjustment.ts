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
