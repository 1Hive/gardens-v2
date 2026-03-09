import { DocumentNode } from "graphql";
import {
  CVProposal,
  CVStrategy,
  getCommunityTitlesDocument,
  getPoolTitlesDocument,
  getProposalTitlesDocument,
  RegistryCommunity,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { buildProposalEntityId } from "@/utils/proposals";
import { capitalize } from "@/utils/text";

interface CommunityTitlesResult {
  registryCommunity?: Pick<RegistryCommunity, "communityName"> & {
    garden: Pick<TokenGarden, "name">;
  };
}

interface PoolTitlesResult {
  cvstrategies: Array<
    Pick<CVStrategy, "poolId" | "metadata"> & {
      registryCommunity: Pick<RegistryCommunity, "communityName"> & {
        garden: Pick<TokenGarden, "name">;
      };
    }
  >;
}

interface ProposalTitlesResult {
  cvproposal?: Pick<CVProposal, "proposalNumber" | "metadata"> & {
    strategy: Pick<CVStrategy, "poolId" | "metadata"> & {
      registryCommunity: Pick<RegistryCommunity, "communityName"> & {
        garden: Pick<TokenGarden, "name">;
      };
    };
  };
}

interface QueryMapItem {
  document: DocumentNode;
  getVariables: (arg: string, segments: string[]) => Record<string, unknown>;
  parseResult: (arg: any) => Promise<(string | undefined)[]>;
}

export const queryMap: Record<number, QueryMapItem> = {
  2: {
    document: getCommunityTitlesDocument,
    getVariables: (communityAddr: string) => ({
      communityAddr: communityAddr.toLowerCase(),
    }),
    parseResult: async (
      resData: CommunityTitlesResult,
    ): Promise<(string | undefined)[]> => {
      const community = resData?.registryCommunity;
      return [community?.communityName ?? undefined];
    },
  },
  3: {
    document: getPoolTitlesDocument,
    getVariables: (strategyId: string) => ({
      strategyId: strategyId.toLowerCase(),
    }),
    parseResult: async (
      resData: PoolTitlesResult,
    ): Promise<(string | undefined)[]> => {
      const pool = resData?.cvstrategies[0];
      const poolTitle = getMetadataTitle(pool?.metadata);
      return [
        pool?.registryCommunity?.communityName ?? undefined,
        poolTitle ??
          (pool?.poolId != null ? `Pool #${pool.poolId}` : undefined),
      ];
    },
  },
  4: {
    document: getProposalTitlesDocument,
    getVariables: (proposalSegment: string, segments: string[]) => {
      const strategySegment = segments[3] ?? "";
      return {
        proposalId: buildProposalEntityId(
          strategySegment.toLowerCase(),
          proposalSegment,
        ).toLowerCase(),
      };
    },
    parseResult: async (
      resData: ProposalTitlesResult,
    ): Promise<(string | undefined)[]> => {
      const proposal = resData?.cvproposal;
      const strategyTitle = getMetadataTitle(proposal?.strategy?.metadata);
      const proposalTitle = getMetadataTitle(proposal?.metadata);
      return [
        proposal?.strategy?.registryCommunity?.communityName ?? undefined,
        strategyTitle ??
          (proposal?.strategy?.poolId != null ?
            `Pool #${proposal.strategy.poolId}`
          : undefined),
        proposalTitle ??
          (proposal?.proposalNumber != null ?
            `Proposal #${proposal.proposalNumber}`
          : undefined),
      ];
    },
  },
};

function getMetadataTitle(
  metadata: { title?: string | null } | null | undefined,
): string | undefined {
  const title = metadata?.title?.trim();
  return title || undefined;
}

/**
 * Parses a static segment from the URL.
 * @param str - The segment to parse.
 * @returns The capitalized and formatted segment.
 */
export const parseStaticSegment = (str: string): string => {
  return capitalize(str.replace(/-/g, " "));
};
