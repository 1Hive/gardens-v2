import type { Metadata } from "next";
import ClientPage from "./client-page";
import { SuperBanner } from "@/assets";
import { CampaignId } from "@/utils/campaigns";

type PageParams = {
  params: {
    campaignId: CampaignId;
  };
};

const titlePrefix = "Gardens - ";

// TODO: Later will have the descriptions and assets per campaign
const campaigns: { [key: string]: { name: string; description: string } } = {
  "1": {
    name: "Superfluid Ecosystem Rewards",
    description:
      "Earn SUP rewards by staking governance tokens, adding funds to pools, and following Gardens on Farcaster.",
  },
};

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const campaignTitle = campaigns[params.campaignId]?.name;
  const ogImage =
    typeof SuperBanner === "string" ? SuperBanner : SuperBanner.src;

  const fallbackMetadata: Metadata = {
    title: titlePrefix + campaignTitle,
    description: campaigns[params.campaignId]?.description,
    openGraph: {
      title: titlePrefix + campaignTitle,
      description: campaigns[params.campaignId]?.description,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: titlePrefix + campaignTitle,
      description: campaigns[params.campaignId]?.description,
      images: [ogImage],
    },
  };

  return fallbackMetadata;
}

export default function Page({ params }: PageParams) {
  return <ClientPage campaignId={params.campaignId} />;
}
