import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearMarkeeChallengesForTests } from "./markeeChallengeStore";
import {
  consumeClaimQuoteSnapshot,
  saveClaimQuoteSnapshot,
} from "./markeeClaimQuoteSnapshot";

const community = "0x0000000000000000000000000000000000000001";
const recipient = "0x0000000000000000000000000000000000000002";
const quote = {
  claimAmount: 100000n,
  estimatedFeeAmount: 1001n,
  estimatedNetworkFeeAmount: 200n,
  markeeChainId: 8453,
  recipient,
} as const;
beforeEach(() => {
  clearMarkeeChallengesForTests();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

it("retains reviewed amounts with a rounded-up, explicit fee ceiling", async () => {
  const snapshot = await saveClaimQuoteSnapshot(100, community, quote);
  expect(snapshot.maxFeeAmount).toBe(1052n);
  expect(snapshot.expiresAt).toBe(Math.floor(Date.now() / 1000) + 300);
  vi.advanceTimersByTime(61000);
  const terms = await consumeClaimQuoteSnapshot(
    snapshot.quoteId,
    100,
    community,
    recipient,
    8453,
  );
  expect(terms).toMatchObject({ ...quote, maxFeeAmount: 1052n });
  await expect(
    consumeClaimQuoteSnapshot(
      snapshot.quoteId,
      100,
      community,
      recipient,
      8453,
    ),
  ).rejects.toThrow("already used");
});
it("rejects expired consent terms", async () => {
  const snapshot = await saveClaimQuoteSnapshot(100, community, quote);
  vi.advanceTimersByTime(300000);
  await expect(
    consumeClaimQuoteSnapshot(
      snapshot.quoteId,
      100,
      community,
      recipient,
      8453,
    ),
  ).rejects.toThrow("expired");
});
it.each([
  [10, community, recipient, 8453],
  [100, recipient, recipient, 8453],
  [100, community, community, 8453],
  [100, community, recipient, 11155111],
] as const)(
  "rejects mismatched chain, community, recipient or source chain (%s, %s, %s, %s)",
  async (chain, c, s, m) => {
    const snapshot = await saveClaimQuoteSnapshot(100, community, quote);
    await expect(
      consumeClaimQuoteSnapshot(snapshot.quoteId, chain, c, s, m),
    ).rejects.toThrow();
  },
);
