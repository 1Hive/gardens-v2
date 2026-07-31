import { describe, expect, it } from "vitest";
import {
  getRemainingBlocksToPass,
  getRemainingBlocksToPassWithThresholdDecay,
} from "./convictionFormulas";

describe("getRemainingBlocksToPassWithThresholdDecay", () => {
  it("matches the constant-threshold estimate when the threshold is stable", () => {
    const expected = getRemainingBlocksToPass(50, 10, 10, 0.9);

    expect(
      getRemainingBlocksToPassWithThresholdDecay(50, 50, 10, 10, 0.9),
    ).toBe(Math.ceil(expected));
  });

  it("accounts for a threshold decaying toward the current pool state", () => {
    expect(
      getRemainingBlocksToPassWithThresholdDecay(100, 50, 40, 10, 0.9),
    ).toBe(8);
  });

  it("waits one more block when conviction only equals the threshold", () => {
    expect(
      getRemainingBlocksToPassWithThresholdDecay(50, 50, 50, 10, 0.9),
    ).toBe(1);
  });

  it("returns zero when the proposal cannot exceed the stable threshold", () => {
    expect(
      getRemainingBlocksToPassWithThresholdDecay(100, 100, 40, 5, 0.9),
    ).toBe(0);
  });

  it("requires one block to converge when decay is zero", () => {
    expect(getRemainingBlocksToPassWithThresholdDecay(100, 50, 40, 60, 0)).toBe(
      1,
    );
  });
});
