import { describe, expect, it } from "vitest";
import {
  getUnsupportedGovernanceTokenError,
  unsupportedGovernanceTokens,
} from "./unsupportedGovernanceTokens";

describe("unsupported governance tokens", () => {
  it.each(unsupportedGovernanceTokens)(
    "rejects $symbol on its chain",
    (token) => {
      expect(
        getUnsupportedGovernanceTokenError(token.chainId, token.address),
      ).toContain(token.reason);
    },
  );

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
});
