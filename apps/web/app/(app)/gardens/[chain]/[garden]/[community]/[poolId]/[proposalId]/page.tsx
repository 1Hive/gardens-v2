import type { Metadata } from "next";
import {
  getProposalTitleDocument,
  type getProposalTitleQuery,
} from "#/subgraph/.graphclient";
import ClientPage, { type ProposalPageParams } from "./ClientPage";
import { getConfigByChain } from "@/configs/chains";
import { queryByChain } from "@/providers/urql";
import { ProposalStatus } from "@/types";

export const FALLBACK_TITLE = "Gardens proposal";
export const ACTIVE_PROPOSAL_DESCRIPTION =
  "This proposal is active and can receive support from members";
export const DISPUTED_PROPOSAL_DESCRIPTION =
  "This proposal is disputed and now going through arbitration.";
export const ENDED_PROPOSAL_DESCRIPTION =
  "This proposal has ended and can no longer receive support.";
export const OG_IMAGE_TOKEN = "opengraph-image-1eoc0x";

type PageProps = {
  params: ProposalPageParams;
};

export function buildOgImagePath(
  params: ProposalPageParams,
  status?: string,
): string {
  const statusQuery = status ? `?status=${status.toLowerCase()}` : "";
  return `/gardens/${params.chain}/${params.garden}/${params.community}/${params.poolId}/${params.proposalId}/${OG_IMAGE_TOKEN}${statusQuery}`;
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
      undefined,
      true,
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
    const title = rawTitle && rawTitle.length > 0 ? rawTitle : FALLBACK_TITLE;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: buildOgImagePath(params, status),
            alt: titleCaseStatus(status) ?? "Proposal",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [buildOgImagePath(params, status)],
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

export default function Page(props: PageProps) {
  return <ClientPage {...props} />;
}
