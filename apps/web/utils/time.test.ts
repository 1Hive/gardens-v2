import { describe, expect, it } from "vitest";

import { formatKNumber } from "./time";

describe("formatKNumber", () => {
  it("shows values up to and including 1,000 without a K suffix", () => {
    expect(formatKNumber(0)).toBe("0");
    expect(formatKNumber(999)).toBe("999");
    expect(formatKNumber(1_000)).toBe("1000");
  });

  it("abbreviates values above 1,000", () => {
    expect(formatKNumber(1_001)).toBe("1K");
    expect(formatKNumber(1_500)).toBe("1.5K");
  });
});
