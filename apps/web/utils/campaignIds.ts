export function getLatestCampaignIdFromKeys<T extends string>(
  campaignIds: readonly T[],
): T {
  if (campaignIds.length === 0) {
    throw new Error("No campaigns configured");
  }

  const numericCampaignIds = campaignIds.map((campaignId) => {
    const numericCampaignId = Number(campaignId);

    if (!Number.isFinite(numericCampaignId)) {
      throw new Error(`Invalid campaign id: ${campaignId}`);
    }

    return {
      campaignId,
      numericCampaignId,
    };
  });

  return numericCampaignIds.reduce((latestCampaign, campaign) =>
    campaign.numericCampaignId > latestCampaign.numericCampaignId ?
      campaign
    : latestCampaign,
  ).campaignId;
}
