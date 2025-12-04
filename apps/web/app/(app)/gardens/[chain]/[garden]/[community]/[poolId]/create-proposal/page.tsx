import type { Metadata } from "next";
import ClientPage from "./client-page";

const TITLE = "Gardens - Create a proposal";
const DESCRIPTION =
  "Draft a proposal for your community's pool to align supporters, gather feedback, and move collective action forward.";

type PageParams = {
  params: {
    chain: string;
    garden: string;
    community: string;
    poolId: string;
  };
};

function buildPoolOgImagePath(params: PageParams["params"]) {
  return `/gardens/${params.chain}/${params.garden}/${params.community}/${params.poolId}/opengraph-image-12jbcu`;
}

export function generateMetadata({ params }: PageParams): Metadata {
  const ogImage = buildPoolOgImagePath(params);
  return {
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
      images: [ogImage],
    },
  };
}

export default function Page({ params }: PageParams) {
  return <ClientPage params={params} />;
}
