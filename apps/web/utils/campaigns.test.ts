import { describe, expect, it } from "vitest";

import { CAMPAIGNS, getLatestCampaignId, isCampaignActive } from "./campaigns";

describe("campaigns utils", () => {
  it("returns the highest configured campaign id for the latest alias", () => {
    expect(getLatestCampaignId()).toBe("4");
    expect(Number(getLatestCampaignId())).toBe(
      Math.max(...Object.keys(CAMPAIGNS).map(Number)),
    );
  });

  it("keeps date-only campaigns active through the end of the listed day", () => {
    expect(
      isCampaignActive("31 Aug 2026", Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
    ).toBe(true);
  });

  it("marks date-only campaigns inactive once the listed day has passed", () => {
    expect(
      isCampaignActive("31 Aug 2026", Date.UTC(2026, 8, 1, 0, 0, 0, 0)),
    ).toBe(false);
  });
});
