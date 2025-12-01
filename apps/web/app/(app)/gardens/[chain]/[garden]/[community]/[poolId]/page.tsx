import type { Metadata } from "next";
import { getPoolTitleDocument } from "#/subgraph/.graphclient";
import ClientPage from "./client-page";
import { FALLBACK_TITLE, getDescriptionText } from "./opengraph-image";
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
  const poolId = params.poolId?.toString();
  let description = getDescriptionText(undefined);
  const fallbackMetadata: Metadata = {
    title: titlePrefix + FALLBACK_TITLE,
    description,
    openGraph: {
      title: titlePrefix + FALLBACK_TITLE,
      description,
      images: [{ url: buildOgImagePath(params) }],
    },
    twitter: {
      card: "summary_large_image",
      title: titlePrefix + FALLBACK_TITLE,
      description,
      images: [buildOgImagePath(params)],
    },
  };

  if (chainConfig == null) {
    console.error("Unsupported chainId for pool metadata generation.", {
      chainId: params.chain,
    });
    return fallbackMetadata;
  }

  if (!poolId) {
    console.error("Missing poolId for pool metadata generation.", {
      poolId: params.poolId,
    });
    return fallbackMetadata;
  }

  try {
    const poolResult = await queryByChain(
      chainConfig,
      getPoolTitleDocument,
      { poolId },
      { requestPolicy: "network-only" },
      true,
    );

    if (poolResult.error) {
      console.error("Error fetching pool metadata.", {
        chainId: params.chain,
        poolId,
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
    const ogImageUrl = buildOgImagePath(params, status);
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
      poolId,
      error,
    });
    return fallbackMetadata;
  }
}

export default function Page(props: PageParams) {
  return (
    <ClientPage
      params={{
        ...props.params,
        poolId: Number(props.params.poolId),
      }}
    />
  );
}
