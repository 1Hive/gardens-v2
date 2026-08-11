import { describe, expect, it } from "vitest";

import { getHiddenPoolConfigLabels } from "./poolConfigLabels";

describe("getHiddenPoolConfigLabels", () => {
  it("hides the token row on capped signaling pools", () => {
    const hidden = getHiddenPoolConfigLabels({
      poolType: "signaling",
      pointSystem: "capped",
    });

    expect(hidden).toContain("Token");
    // Capped is the one point system where the cap is meaningful.
    expect(hidden).not.toContain("Max voting weight");
  });

  it("hides the token and voting weight rows on uncapped signaling pools", () => {
    const hidden = getHiddenPoolConfigLabels({
      poolType: "signaling",
      pointSystem: "unlimited",
    });

    expect(hidden).toEqual(
      expect.arrayContaining([
        "Spending limit",
        "Min threshold",
        "Min conviction",
        "Token",
        "Max voting weight",
      ]),
    );
  });

  it("keeps the token row on funding and streaming pools", () => {
    for (const poolType of ["funding", "streaming"] as const) {
      const hidden = getHiddenPoolConfigLabels({
        poolType,
        pointSystem: "capped",
      });

      expect(hidden).toEqual([]);
    }
  });

  it("hides only the voting weight row on uncapped funding pools", () => {
    expect(
      getHiddenPoolConfigLabels({
        poolType: "funding",
        pointSystem: "quadratic",
      }),
    ).toEqual(["Max voting weight"]);
  });
});
