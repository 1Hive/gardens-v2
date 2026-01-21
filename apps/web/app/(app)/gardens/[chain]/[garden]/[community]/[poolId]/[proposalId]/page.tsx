import type { Metadata } from "next";
import {
  getProposalTitleDocument,
  type getProposalTitleQuery,
} from "#/subgraph/.graphclient";
import ClientPage, { type ProposalPageParams } from "./client-page";
import { getConfigByChain } from "@/configs/chains";
import { queryByChain } from "@/providers/urql";
import { ProposalStatus } from "@/types";

export const dynamic = "force-dynamic"; // ensure latest proposal status for OG
export const revalidate = 0; // do not cache this route
export const fetchCache = "force-no-store"; // always fetch fresh metadata data
export const FALLBACK_TITLE = "Gardens proposal";
export const ACTIVE_PROPOSAL_DESCRIPTION =
  "This proposal is active and can receive support from members";
export const DISPUTED_PROPOSAL_DESCRIPTION =
  "This proposal is disputed and now going through arbitration.";
export const ENDED_PROPOSAL_DESCRIPTION =
  "This proposal has ended and can no longer receive support.";
export const OG_IMAGE_TOKEN = "opengraph-image-1eoc0x";
export const OG_IMAGE_VERSION = "v=3";

type PageProps = {
  params: ProposalPageParams;
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
  return `/gardens/${params.chain}/${params.garden}/${params.community}/${params.poolId}/${params.proposalId}/${OG_IMAGE_TOKEN}${query}`;
}

export function getDescriptionFromStatus(
  status?: (typeof ProposalStatus)[number] | undefined,
): string {
  const normalized = status?.toLowerCase() as (typeof ProposalStatus)[number];
  return (
    normalized === "active" ? ACTIVE_PROPOSAL_DESCRIPTION
    : normalized === "disputed" ? DISPUTED_PROPOSAL_DESCRIPTION
    : ENDED_PROPOSAL_DESCRIPTION
  );
}

export function titleCaseStatus(status?: string): string | undefined {
  if (!status) return undefined;
  const normalized = status.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

const titlePrefix = "Gardens - ";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const fallbackDescription = ENDED_PROPOSAL_DESCRIPTION;
  const fallbackMetadata: Metadata = {
    title: FALLBACK_TITLE,
    description: fallbackDescription,
    openGraph: {
      title: FALLBACK_TITLE,
      description: fallbackDescription,
      images: [{ url: buildOgImagePath(params) }],
    },
    twitter: {
      card: "summary_large_image",
      title: FALLBACK_TITLE,
      description: fallbackDescription,
      images: [buildOgImagePath(params)],
    },
  };

  const chainKey = params.chain;
  const chainId = Number(chainKey);
  const chainConfig =
    getConfigByChain(chainKey) ??
    (Number.isFinite(chainId) ? getConfigByChain(chainId) : undefined);

  if (!chainConfig) {
    console.error("Unsupported chainId for proposal metadata generation.", {
      chainId: params.chain,
    });
    return fallbackMetadata;
  }

  const proposalId = params.proposalId?.toLowerCase?.() ?? params.proposalId;

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
        chainId: params.chain,
        proposalId,
        error: proposalResult.error,
      });
      return fallbackMetadata;
    }

    const proposal = proposalResult.data?.cvproposal;

    if (!proposal) {
      console.warn("Proposal metadata not found.", {
        chainId: params.chain,
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
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: buildOgImagePath(params, status, imageTitle),
            alt: titleCaseStatus(status) ?? "Proposal",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [buildOgImagePath(params, status, imageTitle)],
      },
    };
  } catch (error) {
    console.error("Failed to generate proposal metadata.", {
      chainId: params.chain,
      proposalId,
      error,
    });
    return fallbackMetadata;
  }
}

export default function Page({ params }: PageProps) {
  return <ClientPage params={params} />;
}
