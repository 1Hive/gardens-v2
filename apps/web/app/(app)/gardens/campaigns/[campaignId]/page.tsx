import type { Metadata } from "next";
import ClientPage from "./client-page";
import { FALLBACK_TITLE, description } from "./opengraph-image";

type PageParams = {
  params: {
    campaignId: string;
  };
};

function buildOgImagePath(params: PageParams["params"]) {
  const version = "v=1"; // cache-busting query to avoid extra route segments
  return `/gardens/campaigns/${params.campaignId}/opengraph-image?${version}`;
}

const titlePrefix = "Gardens - ";

// TODO: Later will have the descriptions and assets per campaign
const campaigns: { [key: string]: { name: string } } = {
  "1": { name: "Superfluid Ecosystem Rewards" },
};

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const fallbackMetadata: Metadata = {
    title: titlePrefix + FALLBACK_TITLE,
    description,
    openGraph: {
      title: titlePrefix + FALLBACK_TITLE,
      description,
      // images: [{ url: buildOgImagePath(params) }],
    },
    twitter: {
      card: "summary_large_image",
      title: titlePrefix + FALLBACK_TITLE,
      description,
      // images: [buildOgImagePath(params)],
    },
  };

  return fallbackMetadata;
}

export default function Page() {
  return <ClientPage />;
}
