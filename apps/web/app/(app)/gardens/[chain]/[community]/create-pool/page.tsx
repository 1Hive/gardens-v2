import type { Metadata } from "next";
import ClientPage from "./client-page";

const TITLE = "Gardens - Create a pool";
const DESCRIPTION =
  "Spin up a dedicated pool so your community can coordinate funding and signaling decisions together.";

type PageParams = {
  params: Promise<{
    chain: string;
    community: string;
  }>;
};

type ResolvedPageParams = Awaited<PageParams["params"]>;

function buildCommunityOgImagePath(params: ResolvedPageParams) {
  return `/gardens/${params.chain}/${params.community}/create-pool/opengraph-image?v=1`;
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const resolvedParams = await params;
  const ogImage = buildCommunityOgImagePath(resolvedParams);
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

export default async function Page({
  params,
}: PageParams) {
  const resolvedParams = await params;
  return <ClientPage params={resolvedParams} />;
}
