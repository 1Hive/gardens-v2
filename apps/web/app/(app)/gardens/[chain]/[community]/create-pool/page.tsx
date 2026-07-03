import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ClientPage from "./client-page";
import { getCommunityRedirectPath } from "@/utils/communityRedirects";

const TITLE = "Gardens - Create a pool";
const DESCRIPTION =
  "Spin up a dedicated pool so your community can coordinate funding and signaling decisions together.";

type PageParams = {
  params: Promise<{
    chain: string;
    community: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

export default async function Page({ params, searchParams }: PageParams) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const redirectPath = getCommunityRedirectPath(
    resolvedParams.chain,
    resolvedParams.community,
    resolvedSearchParams,
  );

  if (redirectPath) {
    redirect(redirectPath);
  }

  return <ClientPage params={resolvedParams} />;
}
