import { describe, expect, it } from "vitest";
import {
  formatThresholdAdjustmentTooltip,
  getThresholdAdjustment,
} from "./thresholdAdjustment";

describe("getThresholdAdjustment", () => {
  it("returns a downward adjustment when the threshold is settling lower", () => {
    expect(getThresholdAdjustment(28.42, 18.95)).toEqual({
      direction: "down",
      stableThresholdPct: 18.95,
    });
  });

  it("returns an upward adjustment when the threshold is settling higher", () => {
    expect(getThresholdAdjustment(18.95, 28.42)).toEqual({
      direction: "up",
      stableThresholdPct: 28.42,
    });
  });

  it("hides differences that round to the same displayed value", () => {
    expect(getThresholdAdjustment(28.421, 28.424)).toBeUndefined();
  });

  it("hides the adjustment when the stable threshold is unavailable", () => {
    expect(getThresholdAdjustment(28.42, undefined)).toBeUndefined();
  });

  it("explains the target without replacing the live threshold", () => {
    expect(
      formatThresholdAdjustmentTooltip({
        direction: "down",
        stableThresholdPct: 18.95,
      }),
    ).toBe(
      "Activated pool voting power decreased, so the threshold is gradually falling toward its 18.95 VP target without falling faster than conviction.",
    );

    expect(
      formatThresholdAdjustmentTooltip({
        direction: "up",
        stableThresholdPct: 28.42,
      }),
    ).toBe(
      "Activated pool voting power increased, raising the target threshold to 28.42 VP.",
    );
  });
});
