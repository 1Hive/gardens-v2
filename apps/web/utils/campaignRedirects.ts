import type { CampaignId } from "@/utils/campaigns";

export type CampaignSearchParams = Record<
  string,
  string | string[] | undefined
>;

export const CAMPAIGN_REDIRECT_BYPASS_PARAM = "noRedirect";
export const STALE_SUPERFLUID_CAMPAIGN_ID: CampaignId = "3";
export const LATEST_CAMPAIGN_PATH = "/gardens/campaigns/latest";

const isRedirectBypassValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value.some(isRedirectBypassValue);
  }

  return value !== undefined && value !== "0" && value !== "false";
};

export const shouldBypassCampaignRedirect = (
  searchParams: CampaignSearchParams = {},
) => isRedirectBypassValue(searchParams[CAMPAIGN_REDIRECT_BYPASS_PARAM]);

export function getCampaignRedirectPath(
  campaignId: CampaignId,
  searchParams: CampaignSearchParams = {},
) {
  if (
    campaignId === STALE_SUPERFLUID_CAMPAIGN_ID &&
    !shouldBypassCampaignRedirect(searchParams)
  ) {
    return LATEST_CAMPAIGN_PATH;
  }

  return null;
}

export function getCampaignCardHref(campaignId: CampaignId) {
  const pathname = `/gardens/campaigns/${campaignId}`;

  if (campaignId !== STALE_SUPERFLUID_CAMPAIGN_ID) {
    return pathname;
  }

  return `${pathname}?${CAMPAIGN_REDIRECT_BYPASS_PARAM}=1`;
}
