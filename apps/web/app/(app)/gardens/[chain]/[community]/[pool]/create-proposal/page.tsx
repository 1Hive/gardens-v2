import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ClientPage from "./client-page";
import {
  resolveStrategyAddress,
  stringifySearchParams,
} from "../route-helpers";
import { logOnce } from "@/utils/log";

const TITLE = "Gardens - Create a proposal";
const DESCRIPTION =
  "Draft a proposal for your community's pool to align supporters, gather feedback, and move collective action forward.";

type PageParams = {
  params: {
    chain: string;
    community: string;
    pool: string;
  };
};

function buildPoolOgImagePath(params: PageParams["params"]) {
  return `/gardens/${params.chain}/${params.community}/${params.pool}/create-proposal/opengraph-image?v=1`;
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const strategyAddress = await resolveStrategyAddress(
    params.chain,
    params.pool,
  );
  const normalizedParams = {
    ...params,
    pool: strategyAddress ?? params.pool,
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
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function Page({
  params,
  searchParams,
}: PageProps) {
  logOnce(
    "debug",
    "Loading page: (app)/gardens/[chain]/[community]/[pool]/create-proposal/page.tsx",
  );
  const strategyAddress = await resolveStrategyAddress(
    params.chain,
    params.pool,
  );

  if (!strategyAddress) {
    notFound();
  }

  const normalizedSlug = strategyAddress.toLowerCase();
  if (params.pool.toLowerCase() !== normalizedSlug) {
    redirect(
      `/gardens/${params.chain}/${params.community}/${normalizedSlug}/create-proposal${stringifySearchParams(searchParams)}`,
    );
  }

  return <ClientPage params={{ ...params, pool: normalizedSlug }} />;
}

