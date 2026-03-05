import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ClientPage from "./client-page";
import {
  resolveStrategyAddress,
  stringifySearchParams,
} from "../route-helpers";

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

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const strategyAddress = await resolveStrategyAddress(
    params.chain,
    params.poolId,
  );
  const normalizedParams = {
    ...params,
    poolId: strategyAddress ?? params.poolId,
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

export default async function Page({ params, searchParams }: PageProps) {
  const strategyAddress = await resolveStrategyAddress(
    params.chain,
    params.poolId,
  );

  if (!strategyAddress) {
    notFound();
  }

  const normalizedSlug = strategyAddress.toLowerCase();
  if (params.poolId.toLowerCase() !== normalizedSlug) {
    redirect(
      `/gardens/${params.chain}/${params.garden}/${params.community}/${normalizedSlug}/create-proposal${stringifySearchParams(searchParams)}`,
    );
  }

  return <ClientPage params={{ ...params, poolId: normalizedSlug }} />;
}
