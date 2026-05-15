import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  getProposalTitleDocument,
  type getProposalTitleQuery,
} from "#/subgraph/.graphclient";
import ClientPage, { type ProposalPageParams } from "./client-page";
import {
  ENDED_PROPOSAL_DESCRIPTION,
  FALLBACK_TITLE,
  getDescriptionFromStatus,
  OG_IMAGE_TOKEN,
  OG_IMAGE_VERSION,
  titleCaseStatus,
} from "./og-metadata";
import {
  resolveStrategyAddress,
  stringifySearchParams,
} from "../route-helpers";
import { getConfigByChain } from "@/configs/chains";
import { queryByChain } from "@/providers/queryByChain";
import { ProposalStatus } from "@/types";
import {
  buildProposalEntityId,
  extractProposalNumber,
  formatProposalSlug,
} from "@/utils/proposals";

export const dynamic = "force-dynamic"; // ensure latest proposal status for OG
export const revalidate = 0; // do not cache this route
export const fetchCache = "force-no-store"; // always fetch fresh metadata data

type PageProps = {
  params: Promise<ProposalPageParams>;
};

export function buildOgImagePath(
  params: ProposalPageParams,
  status?: string,
  title?: string,
): string {
  const paramsList = [];
  if (status) {
    paramsList.push(`status=${encodeURIComponent(status.toLowerCase())}`);
  }
  if (title) {
    paramsList.push(`title=${encodeURIComponent(title)}`);
  }
  paramsList.push(OG_IMAGE_VERSION);
  const query = paramsList.length ? `?${paramsList.join("&")}` : "";
  const proposalSlug = formatProposalSlug(params.proposalId);
  return `/gardens/${params.chain}/${params.community}/${params.pool}/${proposalSlug}/${OG_IMAGE_TOKEN}${query}`;
}

const titlePrefix = "Gardens - ";

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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const metadataBase = await getRequestMetadataBase();
  const fallbackDescription = ENDED_PROPOSAL_DESCRIPTION;
  const fallbackMetadata: Metadata = {
    metadataBase,
    title: FALLBACK_TITLE,
    description: fallbackDescription,
    openGraph: {
      title: FALLBACK_TITLE,
      description: fallbackDescription,
      images: [{ url: buildOgImagePath(resolvedParams) }],
    },
    twitter: {
      card: "summary_large_image",
      title: FALLBACK_TITLE,
      description: fallbackDescription,
      images: [buildOgImagePath(resolvedParams)],
    },
  };

  const chainKey = resolvedParams.chain;
  const chainId = Number(chainKey);
  const chainConfig =
    getConfigByChain(chainKey) ??
    (Number.isFinite(chainId) ? getConfigByChain(chainId) : undefined);
  const strategyAddress = await resolveStrategyAddress(
    resolvedParams.chain,
    resolvedParams.pool,
  );
  const normalizedProposalSegment = extractProposalNumber(
    resolvedParams.proposalId,
  );
  const canonicalProposalSlug = formatProposalSlug(normalizedProposalSegment);
  const normalizedParams: ProposalPageParams = {
    ...resolvedParams,
    pool: strategyAddress ?? resolvedParams.pool,
    proposalId: canonicalProposalSlug,
  };

  if (!chainConfig) {
    console.error("Unsupported chainId for proposal metadata generation.", {
      chainId: resolvedParams.chain,
    });
    return fallbackMetadata;
  }

  if (!strategyAddress) {
    console.error("Unable to resolve strategy address for proposal metadata.", {
      strategySlug: resolvedParams.pool,
    });
    return fallbackMetadata;
  }

  const proposalId = buildProposalEntityId(
    strategyAddress,
    canonicalProposalSlug,
  ).toLowerCase();

  try {
    const proposalResult = await queryByChain<getProposalTitleQuery>(
      chainConfig,
      getProposalTitleDocument,
      { proposalId },
      { requestPolicy: "network-only" },
      true, // avoid gateway cache for latest proposal status
    );

    if (proposalResult.error) {
      console.error("Error fetching proposal metadata.", {
        chainId: resolvedParams.chain,
        proposalId,
        error: proposalResult.error,
      });
      return fallbackMetadata;
    }

    const proposal = proposalResult.data?.cvproposal;

    if (!proposal) {
      console.warn("Proposal metadata not found.", {
        chainId: resolvedParams.chain,
        proposalId,
      });
      return fallbackMetadata;
    }

    const statusCode = proposal.proposalStatus?.toString?.();
    const status = statusCode != null ? ProposalStatus[statusCode] : undefined;

    const description = getDescriptionFromStatus(status);
    const rawTitle = proposal.metadata?.title?.trim();
    const title =
      titlePrefix +
      (rawTitle && rawTitle.length > 0 ? rawTitle : FALLBACK_TITLE);
    const imageTitle =
      rawTitle && rawTitle.length > 0 ? rawTitle : FALLBACK_TITLE;

    return {
      metadataBase,
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: buildOgImagePath(normalizedParams, status, imageTitle),
            alt: titleCaseStatus(status) ?? "Proposal",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [buildOgImagePath(normalizedParams, status, imageTitle)],
      },
    };
  } catch (error) {
    console.error("Failed to generate proposal metadata.", {
      chainId: resolvedParams.chain,
      proposalId,
      error,
    });
    return fallbackMetadata;
  }
}

type PagePropsWithSearch = PageProps & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({
  params,
  searchParams,
}: PagePropsWithSearch) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const strategyAddress = await resolveStrategyAddress(
    resolvedParams.chain,
    resolvedParams.pool,
  );

  if (!strategyAddress) {
    notFound();
  }

  const normalizedStrategy = strategyAddress.toLowerCase();
  const normalizedProposalSegment = extractProposalNumber(
    resolvedParams.proposalId,
  );
  const canonicalProposalSlug = formatProposalSlug(normalizedProposalSegment);

  if (
    resolvedParams.pool.toLowerCase() !== normalizedStrategy ||
    resolvedParams.proposalId.toLowerCase() !== canonicalProposalSlug
  ) {
    redirect(
      `/gardens/${resolvedParams.chain}/${resolvedParams.community}/${normalizedStrategy}/${canonicalProposalSlug}${stringifySearchParams(resolvedSearchParams)}`,
    );
  }

  return (
    <ClientPage
      params={{
        ...resolvedParams,
        pool: normalizedStrategy,
        proposalId: normalizedProposalSegment,
      }}
    />
  );
}
