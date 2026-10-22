import { describe, expect, it } from "vitest";

import {
  STREAMING_POOL_ACTIVITY_MULTIPLIER,
  applyPoolActivityMultiplier,
  calculateCampaignWalletPoints,
  calculatePoolFundingPoints,
  getPoolActivityMultiplier,
  shouldCountDirectFunding,
  sumFundingByWallet,
} from "./points";

describe("superfluid campaign points", () => {
  const wallet = "0xabcdef0000000000000000000000000000000000";
  const fundingForPool = (
    transfers: { from: string; value: bigint }[],
    multiplier = 1,
  ) =>
    Array.from(sumFundingByWallet(transfers), ([from, cents]) => ({
      from,
      ...calculatePoolFundingPoints(Number(cents) / 100, multiplier),
    }));

  it("qualifies the full sum of small contributions to the same pool", () => {
    expect(
      fundingForPool([
        { from: wallet, value: 400n },
        { from: wallet, value: 600n },
      ]),
    ).toEqual([{ from: wallet, eligible: true, points: 10 }]);
  });

  it("checks the cumulative threshold before applying the streaming bonus", () => {
    expect(
      fundingForPool(
        [
          { from: wallet, value: 400n },
          { from: wallet, value: 599n },
        ],
        3,
      ),
    ).toEqual([{ from: wallet, eligible: false, points: 0 }]);
    expect(
      fundingForPool(
        [
          { from: wallet, value: 400n },
          { from: wallet, value: 600n },
        ],
        3,
      ),
    ).toEqual([{ from: wallet, eligible: true, points: 30 }]);
  });

  it("includes small contributions made alongside an already qualifying transfer", () => {
    expect(
      fundingForPool([
        { from: wallet, value: 1_000n },
        { from: wallet, value: 300n },
      ]),
    ).toEqual([{ from: wallet, eligible: true, points: 13 }]);
  });

  it("normalizes wallet casing without mixing different donors", () => {
    expect(
      fundingForPool([
        { from: wallet.toUpperCase(), value: 499n },
        { from: wallet, value: 501n },
        { from: "0x1111111111111111111111111111111111111111", value: 500n },
      ]),
    ).toEqual([
      { from: wallet, eligible: true, points: 10 },
      {
        from: "0x1111111111111111111111111111111111111111",
        eligible: false,
        points: 0,
      },
    ]);
  });

  it("does not combine contributions from separate pool or campaign batches", () => {
    const firstPool = fundingForPool([{ from: wallet, value: 500n }]);
    const secondPool = fundingForPool([{ from: wallet, value: 500n }]);
    expect(firstPool).toEqual([{ from: wallet, eligible: false, points: 0 }]);
    expect(secondPool).toEqual(firstPool);
    expect(fundingForPool([])).toEqual([]);
  });

  it("sums token base units exactly before converting the total to USD", () => {
    const unit = 10n ** 18n;
    expect(
      sumFundingByWallet([
        { from: wallet, value: 4n * unit - 1n },
        { from: wallet, value: 6n * unit + 1n },
      ]).get(wallet),
    ).toBe(10n * unit);
  });

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

  it("counts direct funding for streaming pools even when the stream token is separate", () => {
    expect(
      shouldCountDirectFunding({
        proposalType: "2",
        sameAsUnderlying: false,
      }),
    ).toBe(true);
  });

  it("keeps direct funding enabled for native super-token pools", () => {
    expect(
      shouldCountDirectFunding({
        proposalType: "1",
        sameAsUnderlying: true,
      }),
    ).toBe(true);
  });

  it("does not count direct funding for non-streaming pools with separate super tokens", () => {
    expect(
      shouldCountDirectFunding({
        proposalType: "1",
        sameAsUnderlying: false,
      }),
    ).toBe(false);
  });
});
