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
  3: {
    document: getCommunityTitlesDocument,
    getVariables: (communityAddr: string, _segments: string[]) => ({
      communityAddr: communityAddr.toLowerCase(),
    }),
    parseResult: async (
      resData: CommunityTitlesResult,
    ): Promise<(string | undefined)[]> => {
      const community = resData?.registryCommunity;
      return [community?.garden?.name, community?.communityName ?? undefined];
    },
  },
  4: {
    document: getPoolTitlesDocument,
    getVariables: (strategyId: string, _segments: string[]) => ({
      strategyId: strategyId.toLowerCase(),
    }),
    parseResult: async (
      resData: PoolTitlesResult,
    ): Promise<(string | undefined)[]> => {
      const pool = resData?.cvstrategies[0];
      const poolTitle = getMetadataTitle(pool?.metadata);
      return [
        pool?.registryCommunity?.garden?.name,
        pool?.registryCommunity?.communityName ?? undefined,
        poolTitle || `Pool #${pool?.poolId}`,
      ];
    },
  },
  5: {
    document: getProposalTitlesDocument,
    getVariables: (proposalSegment: string, segments: string[]) => {
      const strategySegment = segments[4] ?? "";
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
        proposal?.strategy?.registryCommunity?.garden?.name,
        proposal?.strategy?.registryCommunity?.communityName ?? undefined,
        strategyTitle || `Pool #${proposal?.strategy?.poolId}`,
        proposalTitle || `Proposal #${proposal?.proposalNumber}`,
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

