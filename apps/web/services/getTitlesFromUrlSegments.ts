import {
  getCommunityTitlesDocument,
  getPoolTitlesDocument,
  getProposalTitlesDocument,
  getTokenTitleDocument,
} from "#/subgraph/.graphclient";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import { DocumentNode } from "graphql";

const { urqlClient } = initUrqlClient();

type TokenTitleResult = {
  tokenGarden: {
    name: string;
  };
};

type CommunityTitlesResult = {
  registryCommunity: {
    communityName: string;
    garden: {
      name: string;
    };
  };
};

type PoolTitlesResult = {
  cvstrategies: Array<{
    metadata: string;
    registryCommunity: {
      communityName: string;
      garden: {
        name: string;
      };
    };
  }>;
};

type ProposalTitlesResult = {
  cvproposal: {
    metadata: string;
    strategy: {
      metadata: string;
      registryCommunity: {
        communityName: string;
        garden: {
          name: string;
        };
      };
    };
  };
};

type QueryResult =
  | TokenTitleResult
  | CommunityTitlesResult
  | PoolTitlesResult
  | ProposalTitlesResult;

// segments =>
// [0] = gardens
// [1] = chainId
// [2] = tokenAddress
// [3] = communityAddress
// [4] = poolId
// [5] = proposalId

const queryMap: Record<
  number,
  {
    document: DocumentNode;
    getVariables: (arg: string) => any;
    parseResult: (arg: any) => Promise<(string | undefined)[]>;
  }
> = {
  2: {
    document: getTokenTitleDocument,
    getVariables: (tokenAddr) => ({ tokenAddr: tokenAddr }),
    parseResult: async (resData: TokenTitleResult) => [
      resData?.tokenGarden?.name,
    ],
  },
  3: {
    document: getCommunityTitlesDocument,
    getVariables: (communityAddr) => ({ communityAddr: communityAddr }),
    parseResult: async (resData: CommunityTitlesResult) => {
      const community = resData?.registryCommunity;
      return [community?.garden?.name, community?.communityName];
    },
  },
  4: {
    document: getPoolTitlesDocument,
    getVariables: (poolId) => ({ poolId: poolId }),
    parseResult: async (resData: PoolTitlesResult) => {
      const pool = resData?.cvstrategies[0];
      return [
        pool?.registryCommunity?.garden?.name,
        pool?.registryCommunity?.communityName,
        await getIpfsMetadata(pool?.metadata).then((data) => data?.title),
      ];
    },
  },
  5: {
    document: getProposalTitlesDocument,
    getVariables: (proposalId) => ({ proposalId: proposalId }),
    parseResult: async (resData: ProposalTitlesResult) => {
      const proposal = resData?.cvproposal;
      return [
        proposal?.strategy?.registryCommunity?.garden?.name,
        proposal?.strategy?.registryCommunity?.communityName,
        await getIpfsMetadata(proposal?.strategy?.metadata).then(
          (data) => data?.title,
        ),
        await getIpfsMetadata(proposal?.metadata).then((data) => data?.title),
      ];
    },
  },
};

export async function getTitlesFromUrlSegments(
  segments: string[],
): Promise<(string | undefined)[] | undefined> {
  let segmentsLength = segments.length;
  if (segmentsLength < 3) return;

  // chequear que no haya create forms si no corrijo

  const entityIndex = segmentsLength - 1;
  try {
    const result = await queryByChain(
      urqlClient,
      segments[1],
      queryMap[entityIndex].document,
      queryMap[entityIndex].getVariables(segments[entityIndex]),
    );

    const parsedResult = await queryMap[entityIndex].parseResult(result?.data);

    return parsedResult;
  } catch (error) {
    console.error("Error fetching title from address:", error);
    return;
  }
}
