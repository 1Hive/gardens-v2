import type { Metadata } from "next";
import ClientPage from "./client-page";
import { logOnce } from "@/utils/log";

const TITLE = "Gardens - Create a pool";
const DESCRIPTION =
  "Spin up a dedicated pool so your community can coordinate funding and signaling decisions together.";

type PageParams = {
  params: {
    chain: string;
    community: string;
  };
};

function buildCommunityOgImagePath(params: PageParams["params"]) {
  return `/gardens/${params.chain}/${params.community}/opengraph-image?v=3`;
}

export function generateMetadata({ params }: PageParams): Metadata {
  const ogImage = buildCommunityOgImagePath(params);
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

export default function Page({
  params,
}: PageParams) {
  logOnce(
    "debug",
    "Loading page: (app)/gardens/[chain]/[community]/create-pool/page.tsx",
  );
  return <ClientPage params={params} />;
}

