import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_REDIRECT_BYPASS_PARAM,
  getCampaignCardHref,
  getCampaignRedirectPath,
} from "./campaignRedirects";

describe("campaign redirects", () => {
  it("redirects the stale Superfluid campaign to the latest campaign route", () => {
    expect(getCampaignRedirectPath("3")).toBe("/gardens/campaigns/latest");
  });

  it("allows stale campaign visits when the card bypass flag is present", () => {
    expect(
      getCampaignRedirectPath("3", {
        [CAMPAIGN_REDIRECT_BYPASS_PARAM]: "1",
      }),
    ).toBeNull();
  });

  it("does not redirect other campaign routes", () => {
    expect(getCampaignRedirectPath("4")).toBeNull();
  });

  it("adds the bypass flag only to the stale campaign card href", () => {
    expect(getCampaignCardHref("3")).toBe("/gardens/campaigns/3?noRedirect=1");
    expect(getCampaignCardHref("4")).toBe("/gardens/campaigns/4");
  });
});
