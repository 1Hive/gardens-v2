import { fetchToken } from "@wagmi/core";
import { DocumentNode } from "graphql";
import { toast } from "react-toastify";
import { Address } from "viem";
import {
  CVProposal,
  CVStrategy,
  getCommunityTitlesDocument,
  getPoolTitlesDocument,
  getProposalTitlesDocument,
  RegistryCommunity,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import { capitalize } from "@/utils/text";

const { urqlClient } = initUrqlClient();

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
  getVariables: (arg: string) => Record<string, unknown>;
  parseResult: (arg: any) => Promise<(string | undefined)[]>;
}

const queryMap: Record<number, QueryMapItem> = {
  3: {
    document: getCommunityTitlesDocument,
    getVariables: (communityAddr: string) => ({
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
    getVariables: (poolId: string) => ({ poolId }),
    parseResult: async (
      resData: PoolTitlesResult,
    ): Promise<(string | undefined)[]> => {
      const pool = resData?.cvstrategies[0];
      // const poolTitle = await getPoolTitle(pool);
      return [
        pool?.registryCommunity?.garden?.name,
        pool?.registryCommunity?.communityName ?? undefined,
        `Pool #${pool?.poolId}`,
      ];
    },
  },
  5: {
    document: getProposalTitlesDocument,
    getVariables: (proposalId: string) => ({ proposalId }),
    parseResult: async (
      resData: ProposalTitlesResult,
    ): Promise<(string | undefined)[]> => {
      const proposal = resData?.cvproposal;
      // const strategyTitle = await getPoolTitle(proposal?.strategy);
      // const proposalTitle = await getProposalTitle(proposal);
      return [
        proposal?.strategy?.registryCommunity?.garden?.name,
        proposal?.strategy?.registryCommunity?.communityName ?? undefined,
        `Pool #${proposal?.strategy?.poolId}`,
        `Proposal #${proposal?.proposalNumber}`,
      ];
    },
  },
};

/**
 * Parses a static segment from the URL.
 * @param str - The segment to parse.
 * @returns The capitalized and formatted segment.
 */
const parseStaticSegment = (str: string): string => {
  return capitalize(str.replace(/-/g, " "));
};

/**
 * Fetches and returns the pool title.
 * @param pool - The pool data.
 * @returns A promise that resolves to the formatted pool title or undefined.
 */
// async function getPoolTitle(
//   pool: Pick<CVStrategy, "poolId" | "metadata"> | undefined,
// ): Promise<string | undefined> {
//   if (!pool) return undefined;
//   const poolTitle = pool.metadata
//     ? await getIpfsMetadata(pool.metadata).then((data) => data?.title)
//     : undefined;
//   return poolTitle && pool.poolId ? `#${pool.poolId} ${poolTitle} ` : undefined;
// }

/**
 * Fetches and returns the proposal title.
 * @param proposal - The proposal data.
 * @returns A promise that resolves to the formatted proposal title or undefined.
 */
// async function getProposalTitle(
//   proposal: Pick<CVProposal, "proposalNumber" | "metadata"> | undefined,
// ): Promise<string | undefined> {
//   if (!proposal) return undefined;
//   const proposalTitle = proposal.metadata
//     ? await getIpfsMetadata(proposal.metadata).then((data) => data?.title)
//     : undefined;
//   return proposalTitle && proposal.proposalNumber
//     ? `#${proposal.proposalNumber} ${proposalTitle}`
//     : undefined;
// }

/**
 * Fetches and parses titles from URL segments.
 * @param segments - The URL segments to process.
 * @returns A promise that resolves to an array of title strings or undefined.
 * @throws {Error} If there's an issue fetching or parsing the data.
 */
export async function getTitlesFromUrlSegments(
  segments: string[],
): Promise<(string | undefined)[] | undefined> {
  const segmentsLength = segments.length;
  if (segmentsLength < 3) {
    return undefined;
  }

  const isStaticSegment = segments[segmentsLength - 1].includes("create");
  const entityIndex = isStaticSegment ? segmentsLength - 2 : segmentsLength - 1;

  if (entityIndex === 2) {
    const tokenArgs = {
      address: segments[2] as Address,
      chainId: parseInt(segments[1]),
    };
    console.log("tokenArgs", tokenArgs);
    const tokenData = await fetchToken(tokenArgs)
      .then((token) => token?.symbol)
      .catch(() => {
        console.error("Error fetching token from address: ", tokenArgs);
        toast.error("Token not found");
        return undefined;
      });
    return [tokenData];
  }

  const queryItem = queryMap[entityIndex];

  try {
    const result = await queryByChain(
      urqlClient,
      segments[1],
      queryItem.document,
      queryItem.getVariables(segments[entityIndex]),
    );

    if (!result?.data) {
      throw new Error("No data returned from query");
    }

    const parsedResult = await queryItem.parseResult(result.data);

    if (isStaticSegment) {
      parsedResult.push(parseStaticSegment(segments[segmentsLength - 1]));
    }

    return parsedResult;
  } catch (error) {
    console.error("Error fetching title from address:", error);
    return;
  }
}
