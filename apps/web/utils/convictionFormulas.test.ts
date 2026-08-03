import { describe, expect, it } from "vitest";
import {
  getRemainingBlocksToPass,
  getRemainingBlocksToPassWithThresholdAdjustment,
} from "./convictionFormulas";

describe("getRemainingBlocksToPassWithThresholdAdjustment", () => {
  it("matches the constant-threshold estimate when the threshold is stable", () => {
    const expected = getRemainingBlocksToPass(50, 10, 10, 0.9);

    expect(
      getRemainingBlocksToPassWithThresholdAdjustment(50, 50, 10, 10, 0.9),
    ).toBe(Math.ceil(expected));
  });

  it("accounts for a threshold decaying toward the current pool state", () => {
    expect(
      getRemainingBlocksToPassWithThresholdAdjustment(100, 50, 40, 10, 0.9),
    ).toBe(8);
  });

  it("accounts for a threshold rising toward the current pool state", () => {
    expect(
      getRemainingBlocksToPassWithThresholdAdjustment(50, 100, 10, 15, 0.9),
    ).toBe(6);
  });

  it("waits one more block when conviction only equals the threshold", () => {
    expect(
      getRemainingBlocksToPassWithThresholdAdjustment(50, 50, 50, 10, 0.9),
    ).toBe(1);
  });

  it("returns zero when the proposal cannot exceed the stable threshold", () => {
    expect(
      getRemainingBlocksToPassWithThresholdAdjustment(100, 100, 40, 5, 0.9),
    ).toBe(0);
  });

  it("requires one block to converge when decay is zero", () => {
    expect(
      getRemainingBlocksToPassWithThresholdAdjustment(100, 50, 40, 60, 0),
    ).toBe(1);
  });
});
