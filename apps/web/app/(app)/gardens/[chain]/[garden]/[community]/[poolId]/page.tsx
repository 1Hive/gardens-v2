import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPoolTitleDocument } from "#/subgraph/.graphclient";
import ClientPage from "./client-page";
import { FALLBACK_TITLE, getDescriptionText } from "./opengraph-image";
import { resolveStrategyAddress, stringifySearchParams } from "./route-helpers";
import { chainConfigMap } from "@/configs/chains";
import { queryByChain } from "@/providers/urql";
import { PoolTypes } from "@/types";

type PageParams = {
  params: {
    chain: string;
    garden: string;
    community: string;
    poolId: string;
  };
};

export const dynamic = "force-dynamic"; // keep metadata fresh for status-aware OG images
export const revalidate = 0;
export const fetchCache = "force-no-store";

const OG_IMAGE_TOKEN = "opengraph-image-12jbcu";
const OG_IMAGE_VERSION = "v=4";

function buildOgImagePath(
  params: PageParams["params"],
  status?: "active" | "in-review" | "archived" | "unknown",
) {
  const queryParts: string[] = [];
  if (status) {
    queryParts.push(`status=${encodeURIComponent(status)}`);
  }
  queryParts.push(OG_IMAGE_VERSION);
  const query = queryParts.length ? `?${queryParts.join("&")}` : "";
  return `/gardens/${params.chain}/${params.garden}/${params.community}/${params.poolId}/${OG_IMAGE_TOKEN}${query}`;
}

const titlePrefix = "Gardens - ";

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const chainId = Number(params.chain);
  const chainConfig = chainConfigMap[params.chain] ?? chainConfigMap[chainId];
  const strategyAddress = await resolveStrategyAddress(
    params.chain,
    params.poolId,
  );
  const normalizedParams = {
    ...params,
    poolId: strategyAddress ?? params.poolId,
  };
  let description = getDescriptionText(undefined);
  const fallbackMetadata: Metadata = {
    title: titlePrefix + FALLBACK_TITLE,
    description,
    openGraph: {
      title: titlePrefix + FALLBACK_TITLE,
      description,
      images: [{ url: buildOgImagePath(normalizedParams) }],
    },
    twitter: {
      card: "summary_large_image",
      title: titlePrefix + FALLBACK_TITLE,
      description,
      images: [buildOgImagePath(normalizedParams)],
    },
  };

  if (chainConfig == null) {
    console.error("Unsupported chainId for pool metadata generation.", {
      chainId: params.chain,
    });
    return fallbackMetadata;
  }

  if (!strategyAddress) {
    console.error("Missing strategy address for pool metadata generation.", {
      poolSlug: params.poolId,
    });
    return fallbackMetadata;
  }

  try {
    const poolResult = await queryByChain(
      chainConfig,
      getPoolTitleDocument,
      { strategyId: strategyAddress },
      { requestPolicy: "network-only" },
      true,
    );

    if (poolResult.error) {
      console.error("Error fetching pool metadata.", {
        chainId: params.chain,
        strategyAddress,
        error: poolResult.error,
      });
      return fallbackMetadata;
    }

    const pool = poolResult?.data?.cvstrategies?.[0];
    const poolTitle = titlePrefix + pool?.metadata?.title?.trim();
    if (!poolTitle) {
      return fallbackMetadata;
    }

    const status: "active" | "in-review" | "archived" | "unknown" =
      pool?.archived ?
        "archived"
      : pool?.isEnabled === false ?
        "in-review"
      : pool?.isEnabled ?
        "active"
      : "unknown";
    const poolType = PoolTypes[pool?.config?.proposalType as number];
    const actualDescription = getDescriptionText(poolType);
    const ogImageUrl = buildOgImagePath(normalizedParams, status);
    return {
      title: poolTitle,
      description: actualDescription,
      openGraph: {
        title: poolTitle,
        description: actualDescription,
        images: [{ url: ogImageUrl }],
      },
      twitter: {
        card: "summary_large_image",
        title: poolTitle,
        description: actualDescription,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    console.error("Failed to generate pool metadata.", {
      chainId: params.chain,
      strategyAddress,
      error,
    });
    return fallbackMetadata;
  }
}

type PageProps = PageParams & {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function Page(props: PageProps) {
  const strategyAddress = await resolveStrategyAddress(
    props.params.chain,
    props.params.poolId,
  );

  if (!strategyAddress) {
    notFound();
  }

  const normalizedSlug = strategyAddress.toLowerCase();
  if (props.params.poolId.toLowerCase() !== normalizedSlug) {
    redirect(
      `/gardens/${props.params.chain}/${props.params.garden}/${props.params.community}/${normalizedSlug}${stringifySearchParams(props.searchParams)}`,
    );
  }

  return (
    <ClientPage
      params={{
        ...props.params,
        poolId: normalizedSlug,
      }}
    />
  );
}
