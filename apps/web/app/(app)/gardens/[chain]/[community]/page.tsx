import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getCommunityNameDocument,
  type getCommunityNameQuery,
} from "#/subgraph/.graphclient";
import ClientPage from "./client-page";
import { FALLBACK_TITLE, description } from "./opengraph-image";
import { chainConfigMap } from "@/configs/chains";
import { queryByChain } from "@/providers/queryByChain";
import { getCommunityRedirectPath } from "@/utils/communityRedirects";

type PageParams = {
  params: Promise<{
    chain: string;
    community: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const OG_IMAGE_VERSION = "v=3";

type ResolvedPageParams = Awaited<PageParams["params"]>;

function buildOgImagePath(params: ResolvedPageParams) {
  return `/gardens/${params.chain}/${params.community}/opengraph-image?${OG_IMAGE_VERSION}`;
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

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const resolvedParams = await params;
  const metadataBase = await getRequestMetadataBase();
  const chainId = Number(resolvedParams.chain);
  const chainConfig =
    chainConfigMap[resolvedParams.chain] ?? chainConfigMap[chainId];
  const fallbackMetadata: Metadata = {
    metadataBase,
    title: titlePrefix + FALLBACK_TITLE,
    description,
    openGraph: {
      title: titlePrefix + FALLBACK_TITLE,
      description,
      images: [{ url: buildOgImagePath(resolvedParams) }],
    },
    twitter: {
      card: "summary_large_image",
      title: titlePrefix + FALLBACK_TITLE,
      description,
      images: [buildOgImagePath(resolvedParams)],
    },
  };

  if (chainConfig == null) {
    console.error("Unsupported chainId for community metadata generation.", {
      chainId: resolvedParams.chain,
    });
    return fallbackMetadata;
  }

  try {
    const communityResult = await queryByChain<getCommunityNameQuery>(
      chainConfig,
      getCommunityNameDocument,
      { communityAddr: resolvedParams.community },
    );

    if (communityResult.error) {
      console.error("Error fetching community metadata.", {
        chainId: resolvedParams.chain,
        community: resolvedParams.community,
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
        images: [{ url: buildOgImagePath(resolvedParams) }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [buildOgImagePath(resolvedParams)],
      },
    };
  } catch (error) {
    console.error("Failed to generate community metadata.", {
      chainId: resolvedParams.chain,
      community: resolvedParams.community,
      error,
    });
    return fallbackMetadata;
  }
}

export default async function Page({ params, searchParams }: PageParams) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const redirectPath = getCommunityRedirectPath(
    resolvedParams.chain,
    resolvedParams.community,
    resolvedSearchParams,
  );

  if (redirectPath) {
    redirect(redirectPath);
  }

  return <ClientPage params={resolvedParams} />;
}
