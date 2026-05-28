import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ClientPage from "./client-page";
import {
  resolveStrategyAddress,
  stringifySearchParams,
  type SearchParams,
} from "../route-helpers";

const TITLE = "Gardens - Create a proposal";
const DESCRIPTION =
  "Draft a proposal for your community's pool to align supporters, gather feedback, and move collective action forward.";

type PageParams = {
  params: Promise<{
    chain: string;
    community: string;
    pool: string;
  }>;
};

type ResolvedPageParams = Awaited<PageParams["params"]>;

function buildPoolOgImagePath(params: ResolvedPageParams) {
  return `/gardens/${params.chain}/${params.community}/${params.pool}/create-proposal/opengraph-image?v=1`;
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const resolvedParams = await params;
  const strategyAddress = await resolveStrategyAddress(
    resolvedParams.chain,
    resolvedParams.pool,
  );
  const normalizedParams = {
    ...resolvedParams,
    pool: strategyAddress ?? resolvedParams.pool,
  };
  const ogImage = buildPoolOgImagePath(normalizedParams);
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

type PageProps = PageParams & {
  searchParams?: Promise<SearchParams>;
};

export default async function Page({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const strategyAddress = await resolveStrategyAddress(
    resolvedParams.chain,
    resolvedParams.pool,
  );

  if (!strategyAddress) {
    notFound();
  }

  const normalizedSlug = strategyAddress.toLowerCase();
  if (resolvedParams.pool.toLowerCase() !== normalizedSlug) {
    redirect(
      `/gardens/${resolvedParams.chain}/${resolvedParams.community}/${normalizedSlug}/create-proposal${stringifySearchParams(resolvedSearchParams)}`,
    );
  }

  return <ClientPage params={{ ...resolvedParams, pool: normalizedSlug }} />;
}

