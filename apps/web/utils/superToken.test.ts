import { describe, expect, it } from "vitest";
import { zeroAddress } from "viem";
import {
  getConfiguredSuperTokenAddress,
  getSuperTokenInfo,
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

  it("resolves Super Token metadata without a connected wallet balance", () => {
    const address = "0x1111111111111111111111111111111111111111";

    expect(
      getSuperTokenInfo({
        address,
        token: { symbol: "sDAIx", decimals: 18 },
        sameAsUnderlying: false,
      }),
    ).toEqual({
      address,
      symbol: "sDAIx",
      decimals: 18,
      value: 0n,
      formatted: "0",
      sameAsUnderlying: false,
    });
  });

  it("adds the connected wallet balance when available", () => {
    expect(
      getSuperTokenInfo({
        address: "0x1111111111111111111111111111111111111111",
        token: { symbol: "sDAIx", decimals: 18 },
        balance: { value: 42n, formatted: "0.000000000000000042" },
      }),
    ).toMatchObject({
      value: 42n,
      formatted: "0.000000000000000042",
    });
  });
});
