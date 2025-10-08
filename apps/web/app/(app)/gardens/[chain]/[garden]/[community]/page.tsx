import type { Metadata } from "next";
import { getCommunityNameDocument } from "#/subgraph/.graphclient";
import ClientPage from "./ClientPage";
import { FALLBACK_TITLE, description } from "./opengraph-image";
import CommunityImage from "@/assets/CommunityImage.png";
import { chainConfigMap } from "@/configs/chains";
import { queryByChain } from "@/providers/urql";

type PageParams = {
  params: {
    chain: string;
    garden: string;
    community: string;
  };
};

function buildOgImagePath(params: PageParams["params"]) {
  return CommunityImage.src;
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const chainId = Number(params.chain);
  const chainConfig = chainConfigMap[params.chain] ?? chainConfigMap[chainId];
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
      undefined,
      true,
    );

    if (communityResult.error) {
      console.error("Error fetching community metadata.", {
        chainId: params.chain,
        community: params.community,
        error: communityResult.error,
      });
      return fallbackMetadata;
    }

    const communityName =
      communityResult?.data?.registryCommunity?.communityName?.trim();

    if (!communityName) {
      return fallbackMetadata;
    }

    return {
      title: communityName,
      description,
      openGraph: {
        title: communityName,
        description,
        images: [{ url: buildOgImagePath(params) }],
      },
      twitter: {
        card: "summary_large_image",
        title: communityName,
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

export default function Page(props: PageParams) {
  return <ClientPage {...props} />;
}
