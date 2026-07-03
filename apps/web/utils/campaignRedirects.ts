import type { CampaignId } from "@/utils/campaigns";

export type CampaignSearchParams = Record<
  string,
  string | string[] | undefined
>;

export function getCampaignRedirectPath(
  _campaignId: CampaignId,
  _searchParams: CampaignSearchParams = {},
) {
  return null;
}

export function getCampaignCardHref(campaignId: CampaignId) {
  return `/gardens/campaigns/${campaignId}`;
}
