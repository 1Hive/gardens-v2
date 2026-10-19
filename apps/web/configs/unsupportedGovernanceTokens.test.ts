import { describe, expect, it } from "vitest";
import {
  getUnsupportedGovernanceTokenError,
  unsupportedGovernanceTokens,
} from "./unsupportedGovernanceTokens";

describe("unsupported governance tokens", () => {
  it("rejects every listed token on its chain", () => {
    for (const token of unsupportedGovernanceTokens) {
      expect(
        getUnsupportedGovernanceTokenError(token.chainId, token.address),
      ).toContain(token.reason);
    }
  });

  it("matches addresses without case sensitivity", () => {
    expect(
      getUnsupportedGovernanceTokenError(
        42220,
        "0xE3B55684AeCd7cC6908F75Ec40F48F8639cc9276",
      ),
    ).toContain("RIBA");
  });

  it("does not block the same address on another chain", () => {
    expect(
      getUnsupportedGovernanceTokenError(
        10,
        unsupportedGovernanceTokens[0].address,
      ),
    ).toBeUndefined();
  });

  it("does not flag unknown tokens or an unselected chain", () => {
    expect(
      getUnsupportedGovernanceTokenError(
        1,
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      ),
    ).toBeUndefined();
    expect(
      getUnsupportedGovernanceTokenError(
        undefined,
        unsupportedGovernanceTokens[0].address,
      ),
    ).toBeUndefined();
  });

  it("keeps unique, sourced chain/address pairs", () => {
    const keys = unsupportedGovernanceTokens.map(
      (token) => `${token.chainId}:${token.address}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
    for (const token of unsupportedGovernanceTokens) {
      expect(token.address).toMatch(/^0x[0-9a-f]{40}$/);
      expect(token.sources.length).toBeGreaterThan(0);
    }
  });
  it("does not block stable-balance wrappers or Origin tokens by association", () => {
    const tokens = [
      // wstETH, gOHM, wUSDM, USDY and OUSD on Ethereum.
      "0x7f39c581f595b53c5cb5bd0b3f8da6c935e2ca0",
      "0x0ab87046fbb341d058f17cbc4c1133f25a20a52f",
      "0x57f5e098cad7a3d1eed53991d4d66c45c9af7812",
      "0x96f6ef951840721adbf46ac996b59e0235cb985c",
      "0x2a8e1e676ec238d8a992307b495b45b3feaa5e86",
    ];
    for (const token of tokens) {
      expect(getUnsupportedGovernanceTokenError(1, token)).toBeUndefined();
    }
    // The first indexed inflationary Circles wrapper (circlesType=1).
    expect(
      getUnsupportedGovernanceTokenError(
        100,
        "0x6f654ff084f47a29bea2211b967c7a1a732b4e80",
      ),
    ).toBeUndefined();
  });

  it("includes rebasing families on their documented networks", () => {
    expect(
      getUnsupportedGovernanceTokenError(
        1,
        "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
      ),
    ).toContain("stETH");
    expect(
      getUnsupportedGovernanceTokenError(
        8453,
        "0x4e65fe4dba92790696d040ac24aa414708f5c0ab",
      ),
    ).toContain("aToken");
    expect(
      getUnsupportedGovernanceTokenError(
        100,
        "0x4b7551b114d1da52dfb7cd02446819028483650d",
      ),
    ).toContain("demurrage");
    expect(
      getUnsupportedGovernanceTokenError(
        42220,
        "0x59d9356e565ab3a36dd77763fc0d87feaf85508c",
      ),
    ).toContain("USDM");
  });
});
