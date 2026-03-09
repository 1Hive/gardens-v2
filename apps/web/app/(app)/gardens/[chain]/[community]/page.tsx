import type { Metadata } from "next";
import { headers } from "next/headers";
import { getCommunityNameDocument } from "#/subgraph/.graphclient";
import ClientPage from "./client-page";
import { FALLBACK_TITLE, description } from "./opengraph-image";
import { chainConfigMap } from "@/configs/chains";
import { queryByChain } from "@/providers/urql";
import { logOnce } from "@/utils/log";

type PageParams = {
  params: {
    chain: string;
    community: string;
  };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const OG_IMAGE_VERSION = "v=3";

function buildOgImagePath(params: PageParams["params"]) {
  return `/gardens/${params.chain}/${params.community}/opengraph-image?${OG_IMAGE_VERSION}`;
}

function getRequestMetadataBase(): URL | undefined {
  const requestHeaders = headers();
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

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const metadataBase = getRequestMetadataBase();
  const chainId = Number(params.chain);
  const chainConfig = chainConfigMap[params.chain] ?? chainConfigMap[chainId];
  const fallbackMetadata: Metadata = {
    metadataBase,
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
      metadataBase,
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

export default function Page({
  params,
}: PageParams) {
  logOnce("debug", "Loading page: (app)/gardens/[chain]/[community]/page.tsx");
  return <ClientPage params={params} />;
}

