import { describe, expect, it } from "vitest";

import {
  STREAMING_POOL_ACTIVITY_MULTIPLIER,
  applyPoolActivityMultiplier,
  calculateCampaignWalletPoints,
  getPoolActivityMultiplier,
} from "./points";

describe("superfluid campaign points", () => {
  it("computes wallet points across all activity categories", () => {
    expect(
      calculateCampaignWalletPoints({
        address: "0x1111111111111111111111111111111111111111",
        fundUsd: 12.9,
        streamUsd: 21.4,
        governanceStakePoints: 7.8,
        farcasterPoints: 1,
      }),
    ).toMatchObject({
      fundPoints: 12,
      streamPoints: 21,
      governanceStakePoints: 7,
      farcasterPoints: 1,
      totalPoints: 41,
    });
  });

  it("keeps the ten dollar threshold on funding and stream points", () => {
    expect(
      calculateCampaignWalletPoints({
        address: "0x2222222222222222222222222222222222222222",
        fundUsd: 9.99,
        streamUsd: 9.99,
        governanceStakePoints: 4.9,
        farcasterPoints: 1.9,
      }),
    ).toMatchObject({
      fundPoints: 0,
      streamPoints: 0,
      governanceStakePoints: 4,
      farcasterPoints: 1,
      totalPoints: 5,
    });
  });

  it("returns the x3 multiplier only for streaming pools", () => {
    expect(getPoolActivityMultiplier("2")).toBe(
      STREAMING_POOL_ACTIVITY_MULTIPLIER,
    );
    expect(getPoolActivityMultiplier(2)).toBe(
      STREAMING_POOL_ACTIVITY_MULTIPLIER,
    );
    expect(getPoolActivityMultiplier("1")).toBe(1);
    expect(getPoolActivityMultiplier("0")).toBe(1);
    expect(getPoolActivityMultiplier(null)).toBe(1);
  });

  it("applies the streaming pool bonus before computing pool-related points", () => {
    const proposalType = "2";
    const fundUsd = applyPoolActivityMultiplier(11, proposalType);
    const streamUsd = applyPoolActivityMultiplier(20, proposalType);
    const governanceStakePoints = applyPoolActivityMultiplier(8.5, proposalType);

    expect(
      calculateCampaignWalletPoints({
        address: "0x3333333333333333333333333333333333333333",
        fundUsd,
        streamUsd,
        governanceStakePoints,
        farcasterPoints: 1,
      }),
    ).toMatchObject({
      fundPoints: 33,
      streamPoints: 60,
      governanceStakePoints: 25,
      farcasterPoints: 1,
      totalPoints: 119,
    });
  });
});
