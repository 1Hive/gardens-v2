import { describe, expect, it } from "vitest";
import {
  PENDING_COVENANT_IPFS_HASH,
  PENDING_REGISTER_STAKE_AMOUNT,
  buildCovenantDiff,
  canReviewPendingCommunityParams,
  hasGuardedCommunityChanges,
  hasPendingField,
  normalizePendingCommunityParams,
} from "./communityPendingParams";

describe("community pending params", () => {
  it("normalizes missing and tuple-shaped contract results", () => {
    expect(normalizePendingCommunityParams(undefined).fields).toBe(0);
    expect(
      normalizePendingCommunityParams([5, 12n, true, "cid"] as const),
    ).toEqual({
      fields: 5,
      registerStakeAmount: 12n,
      isKickEnabled: true,
      covenantIpfsHash: "cid",
    });
  });

  it("checks individual fields and owner visibility", () => {
    const fields =
      PENDING_REGISTER_STAKE_AMOUNT | PENDING_COVENANT_IPFS_HASH;
    expect(hasPendingField(fields, PENDING_REGISTER_STAKE_AMOUNT)).toBe(true);
    expect(canReviewPendingCommunityParams("0xAbC", "0xabc", fields)).toBe(
      true,
    );
    expect(canReviewPendingCommunityParams("0xdef", "0xabc", fields)).toBe(
      false,
    );
  });

  it("detects guarded changes independently from ordinary params", () => {
    expect(
      hasGuardedCommunityChanges({
        currentStake: "10",
        nextStake: "10",
        currentKickEnabled: false,
        nextKickEnabled: false,
        currentCovenant: "same",
        nextCovenant: " same ",
      }),
    ).toBe(false);
    expect(
      hasGuardedCommunityChanges({
        currentStake: "10",
        nextStake: "11",
        currentKickEnabled: false,
        nextKickEnabled: false,
        currentCovenant: "same",
        nextCovenant: "same",
      }),
    ).toBe(true);
  });

  it("produces explicit covenant additions and removals", () => {
    const parts = buildCovenantDiff("Members vote weekly", "Members vote daily");
    expect(parts.some((part) => part.kind === "removed" && part.value === "weekly")).toBe(true);
    expect(parts.some((part) => part.kind === "added" && part.value === "daily")).toBe(true);
  });
});
