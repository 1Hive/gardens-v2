import { describe, expect, it } from "vitest";

import { getFarcasterNextCursor, hasPrimaryWalletLabel } from "./farcaster";

describe("Farcaster campaign data", () => {
  it("reads the current top-level pagination cursor", () => {
    expect(getFarcasterNextCursor({ next: { cursor: "next-page" } })).toBe(
      "next-page",
    );
  });

  it("supports the legacy nested pagination cursor", () => {
    expect(
      getFarcasterNextCursor({
        result: { next: { cursor: "legacy-next-page" } },
      }),
    ).toBe("legacy-next-page");
  });

  it("detects the current wallet label array shape", () => {
    expect(hasPrimaryWalletLabel({ labels: ["primary", "warpcast"] })).toBe(
      true,
    );
    expect(hasPrimaryWalletLabel({ labels: ["warpcast"] })).toBe(false);
  });

  it("supports the legacy singular wallet label shape", () => {
    expect(hasPrimaryWalletLabel({ label: "primary" })).toBe(true);
    expect(hasPrimaryWalletLabel({ label: "verified" })).toBe(false);
  });
});
