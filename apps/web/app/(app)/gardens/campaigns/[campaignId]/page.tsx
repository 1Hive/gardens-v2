import type { Metadata } from "next";
import ClientPage from "./client-page";
import { FALLBACK_TITLE, description } from "./opengraph-image";
import { SuperBanner } from "@/assets";

type PageParams = {
  params: {
    campaignId: string;
  };
};

const titlePrefix = "Gardens - ";

// TODO: Later will have the descriptions and assets per campaign
const campaigns: { [key: string]: { name: string } } = {
  "1": { name: "Superfluid Ecosystem Rewards" },
};

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const campaignTitle = campaigns[params.campaignId]?.name ?? FALLBACK_TITLE;
  const ogImage = typeof SuperBanner === "string" ? SuperBanner : SuperBanner.src;

  const fallbackMetadata: Metadata = {
    title: titlePrefix + campaignTitle,
    description,
    openGraph: {
      title: titlePrefix + campaignTitle,
      description,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: titlePrefix + campaignTitle,
      description,
      images: [ogImage],
    },
  };

  return fallbackMetadata;
}

export default function Page() {
  return <ClientPage />;
}
