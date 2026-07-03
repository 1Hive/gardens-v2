import { describe, expect, it } from "vitest";

import {
  getCampaignCardHref,
  getCampaignRedirectPath,
} from "./campaignRedirects";

describe("campaign redirects", () => {
  it("does not redirect campaign routes", () => {
    expect(getCampaignRedirectPath("3")).toBeNull();
    expect(getCampaignRedirectPath("4")).toBeNull();
  });

  it("links campaign cards directly to their campaign routes", () => {
    expect(getCampaignCardHref("3")).toBe("/gardens/campaigns/3");
    expect(getCampaignCardHref("4")).toBe("/gardens/campaigns/4");
  });
});
