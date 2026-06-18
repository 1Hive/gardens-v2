import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  getCommunityNameDocument,
  getPoolTitleDocument,
  type getCommunityNameQuery,
  type getPoolTitleQuery,
} from "#/subgraph/.graphclient";
import ClientPage from "./client-page";
import { FALLBACK_TITLE, getDescriptionText } from "./opengraph-image";
import {
  resolveStrategyAddress,
  stringifySearchParams,
  type SearchParams,
} from "./route-helpers";
import { chainConfigMap, type ChainData } from "@/configs/chains";
import { queryByChain } from "@/providers/queryByChain";
import { PoolTypes } from "@/types";
import { hasEthereumAddressFormat } from "@/utils/web3";

type RouteParams = {
  chain: string;
  community: string;
  pool: string;
};

type MetadataProps = {
  params: Promise<RouteParams>;
};

export const dynamic = "force-dynamic"; // keep metadata fresh for status-aware OG images
export const revalidate = 0;
export const fetchCache = "force-no-store";

const OG_IMAGE_TOKEN = "opengraph-image";
const OG_IMAGE_VERSION = "v=4";

function buildOgImagePath(
  params: RouteParams,
  status?: "active" | "in-review" | "archived" | "unknown",
) {
  const queryParts: string[] = [];
  if (status) {
    queryParts.push(`status=${encodeURIComponent(status)}`);
  }
  queryParts.push(OG_IMAGE_VERSION);
  const query = queryParts.length ? `?${queryParts.join("&")}` : "";
  return `/gardens/${params.chain}/${params.community}/${params.pool}/${OG_IMAGE_TOKEN}${query}`;
}

async function getRequestMetadataBase(): Promise<URL | undefined> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return undefined;
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  try {
    return new URL(`${proto}://${host}`);
  } catch {
    return undefined;
  }
}

const titlePrefix = "Gardens - ";

async function communityExistsOnChain(
  chainConfig: ChainData | undefined,
  communityAddress: string | undefined,
): Promise<boolean> {
  if (!chainConfig || !communityAddress) {
    return false;
  }

  if (!hasEthereumAddressFormat(communityAddress)) {
    return false;
  }

  const result = await queryByChain<getCommunityNameQuery>(
    chainConfig,
    getCommunityNameDocument,
    { communityAddr: communityAddress.toLowerCase() },
    undefined,
    true,
  );

  return !!result?.data?.registryCommunity;
}

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const resolvedParams = await params;
  const metadataBase = await getRequestMetadataBase();
  const chainId = Number(resolvedParams.chain);
  const chainConfig =
    chainConfigMap[resolvedParams.chain] ?? chainConfigMap[chainId];
  const strategyAddress = await resolveStrategyAddress(
    resolvedParams.chain,
    resolvedParams.pool,
  );
  const normalizedParams = {
    ...resolvedParams,
    pool: strategyAddress ?? resolvedParams.pool,
  };
  let description = getDescriptionText(undefined);
  const fallbackMetadata: Metadata = {
    metadataBase,
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
    console.warn("Unsupported chainId for pool metadata generation.", {
      chainId: resolvedParams.chain,
    });
    return fallbackMetadata;
  }

  if (!strategyAddress) {
    console.warn("Missing strategy address for pool metadata generation.", {
      strategySlug: resolvedParams.pool,
    });
    return fallbackMetadata;
  }

  try {
    const poolResult = await queryByChain<getPoolTitleQuery>(
      chainConfig,
      getPoolTitleDocument,
      { strategyId: strategyAddress },
      { requestPolicy: "network-only" },
      true,
    );

    if (poolResult.error) {
      console.warn("Error fetching pool metadata.", {
        chainId: resolvedParams.chain,
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
      metadataBase,
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
    console.warn("Failed to generate pool metadata.", {
      chainId: resolvedParams.chain,
      strategyAddress,
      error,
    });
    return fallbackMetadata;
  }
}

type PageProps = {
  params: Promise<RouteParams>;
  searchParams?: Promise<SearchParams>;
};

export default async function Page(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const numericChain = Number(params.chain);
  const chainConfig = chainConfigMap[params.chain] ?? chainConfigMap[numericChain];

  const currentCommunityExists = await communityExistsOnChain(
    chainConfig,
    params.community,
  );

  if (!currentCommunityExists) {
    const legacyCommunityExists = await communityExistsOnChain(
      chainConfig,
      params.pool,
    );

    if (legacyCommunityExists) {
      redirect(
        `/gardens/${params.chain}/${params.pool}${stringifySearchParams(searchParams)}`,
      );
    }
  }

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
      `/gardens/${params.chain}/${params.community}/${normalizedSlug}${stringifySearchParams(searchParams)}`,
    );
  }

  return (
    <ClientPage
      params={{
        ...params,
        pool: normalizedSlug,
      }}
    />
  );
}
