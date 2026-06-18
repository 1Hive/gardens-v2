import { describe, expect, it } from "vitest";

import { getLatestCampaignIdFromKeys } from "./campaignIds";

describe("getLatestCampaignIdFromKeys", () => {
  it("returns the highest numeric campaign id", () => {
    expect(getLatestCampaignIdFromKeys(["1", "4", "3"])).toBe("4");
  });

  it("throws when no campaigns are configured", () => {
    expect(() => getLatestCampaignIdFromKeys([])).toThrow(
      "No campaigns configured",
    );
  });

  it("throws when a campaign id is not numeric", () => {
    expect(() => getLatestCampaignIdFromKeys(["1", "alpha"])).toThrow(
      "Invalid campaign id: alpha",
    );
  });
});
