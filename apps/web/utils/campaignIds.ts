export function getLatestCampaignIdFromKeys(campaignIds: string[]) {
  if (campaignIds.length === 0) {
    throw new Error("No campaigns configured");
  }

  const numericCampaignIds = campaignIds.map((campaignId) => {
    const numericCampaignId = Number(campaignId);

    if (!Number.isFinite(numericCampaignId)) {
      throw new Error(`Invalid campaign id: ${campaignId}`);
    }

    return numericCampaignId;
  });

  return String(Math.max(...numericCampaignIds));
}
