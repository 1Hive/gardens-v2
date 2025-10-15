import type { Metadata } from "next";
import { getPoolTitleDocument } from "#/subgraph/.graphclient";
import ClientPage from "./ClientPage";
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

function buildOgImagePath(params: PageParams["params"]) {
  return `/gardens/${params.chain}/${params.garden}/${params.community}/${params.poolId}/opengraph-image-12jbcu`;
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const chainId = Number(params.chain);
  const chainConfig = chainConfigMap[params.chain] ?? chainConfigMap[chainId];
  const poolId = params.poolId?.toString();
  let description = getDescriptionText(undefined);
  const fallbackMetadata: Metadata = {
    title: FALLBACK_TITLE,
    description,
    openGraph: {
      title: FALLBACK_TITLE,
      description,
      images: [{ url: buildOgImagePath(params) }],
    },
    twitter: {
      card: "summary_large_image",
      title: FALLBACK_TITLE,
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
      undefined,
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

    const poolTitle =
      poolResult?.data?.cvstrategies?.[0]?.metadata?.title?.trim();

    if (!poolTitle) {
      return fallbackMetadata;
    }
    const poolType =
      PoolTypes[
        poolResult?.data?.cvstrategies?.[0]?.metadata?.poolType as number
      ];
    description = getDescriptionText(poolType);
    return {
      title: poolTitle,
      description,
      openGraph: {
        title: poolTitle,
        description,
        images: [{ url: buildOgImagePath(params) }],
      },
      twitter: {
        card: "summary_large_image",
        title: poolTitle,
        description,
        images: [buildOgImagePath(params)],
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
