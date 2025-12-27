import type { Metadata } from "next";
import { getCommunityNameDocument } from "#/subgraph/.graphclient";
import ClientPage from "./client-page";
import { FALLBACK_TITLE, description } from "./opengraph-image";
import { chainConfigMap } from "@/configs/chains";
import { queryByChain } from "@/providers/urql";

type PageParams = {
  params: {
    chain: string;
    garden: string;
    community: string;
  };
};

const OG_IMAGE_VERSION = "v=3";

function buildOgImagePath(params: PageParams["params"]) {
  return `/gardens/${params.chain}/${params.garden}/${params.community}/opengraph-image-w94mav?${OG_IMAGE_VERSION}`;
}

const titlePrefix = "Gardens - ";

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const chainId = Number(params.chain);
  const chainConfig = chainConfigMap[params.chain] ?? chainConfigMap[chainId];
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
    console.error("Unsupported chainId for community metadata generation.", {
      chainId: params.chain,
    });
    return fallbackMetadata;
  }

  try {
    const communityResult = await queryByChain(
      chainConfig,
      getCommunityNameDocument,
      { communityAddr: params.community },
    );

    if (communityResult.error) {
      console.error("Error fetching community metadata.", {
        chainId: params.chain,
        community: params.community,
        error: communityResult.error,
      });
      return fallbackMetadata;
    }

    const title =
      titlePrefix +
      communityResult?.data?.registryCommunity?.communityName?.trim();

    if (!title) {
      return fallbackMetadata;
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: buildOgImagePath(params) }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [buildOgImagePath(params)],
      },
    };
  } catch (error) {
    console.error("Failed to generate community metadata.", {
      chainId: params.chain,
      community: params.community,
      error,
    });
    return fallbackMetadata;
  }
}

export default function Page({ params }: PageParams) {
  return <ClientPage params={params} />;
}
