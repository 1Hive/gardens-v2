import { describe, expect, it } from "vitest";
import { zeroAddress } from "viem";
import {
  getConfiguredSuperTokenAddress,
  isSameAddress,
} from "./superToken";

describe("super token helpers", () => {
  it("treats an empty or zero configured super token as missing", () => {
    expect(getConfiguredSuperTokenAddress(undefined)).toBeUndefined();
    expect(getConfiguredSuperTokenAddress(null)).toBeUndefined();
    expect(getConfiguredSuperTokenAddress(zeroAddress)).toBeUndefined();
  });

  it("keeps a non-zero configured super token address", () => {
    const superToken = "0x1111111111111111111111111111111111111111";

    expect(getConfiguredSuperTokenAddress(superToken)).toBe(superToken);
  });

  it("compares token addresses case-insensitively", () => {
    expect(
      isSameAddress(
        "0xAbC0000000000000000000000000000000000000",
        "0xabc0000000000000000000000000000000000000",
      ),
    ).toBe(true);
    expect(
      isSameAddress(
        "0xabc0000000000000000000000000000000000000",
        "0xdef0000000000000000000000000000000000000",
      ),
    ).toBe(false);
  });
});
