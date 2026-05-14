import type { Metadata } from "next";
import ClientPage from "./client-page";
import { SuperBanner } from "@/assets";
import { CAMPAIGNS, CampaignId } from "@/utils/campaigns";

type PageParams = {
  params: Promise<{
    campaignId: CampaignId;
  }>;
};

const titlePrefix = "Gardens - ";

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const resolvedParams = await params;
  const campaign = CAMPAIGNS[resolvedParams.campaignId];
  const campaignTitle = campaign?.name;
  const ogImage =
    typeof SuperBanner === "string" ? SuperBanner : SuperBanner.src;

  const fallbackMetadata: Metadata = {
    title: titlePrefix + campaignTitle,
    description: campaign?.description,
    openGraph: {
      title: titlePrefix + campaignTitle,
      description: campaign?.description,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: titlePrefix + campaignTitle,
      description: campaign?.description,
      images: [ogImage],
    },
  };

  return fallbackMetadata;
}

export default async function Page({
  params,
}: PageParams) {
  const resolvedParams = await params;
  return <ClientPage campaignId={resolvedParams.campaignId} />;
}

