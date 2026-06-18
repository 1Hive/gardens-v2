import { redirect } from "next/navigation";

import { getLatestCampaignId } from "@/utils/campaigns";

export default async function Page() {
  redirect(`/gardens/campaigns/${getLatestCampaignId()}`);
}
