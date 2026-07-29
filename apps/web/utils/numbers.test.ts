import { describe, expect, it } from "vitest";
import { parsePositiveUnitsFloor } from "./numbers";

describe("parsePositiveUnitsFloor", () => {
  it("preserves an exact 18-decimal max balance", () => {
    expect(parsePositiveUnitsFloor("306.79652535737285804", 18)).toBe(
      306796525357372858040n,
    );
  });

  it("floors digits beyond the token's supported precision", () => {
    expect(parsePositiveUnitsFloor("306.796525999", 6)).toBe(306796525n);
  });

  it("does not round up when the first discarded digit is nine", () => {
    expect(parsePositiveUnitsFloor("1.999", 2)).toBe(199n);
  });
});
