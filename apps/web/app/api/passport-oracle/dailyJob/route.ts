import { NextResponse } from "next/server";
import { gql } from "urql";
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  Address,
  Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { localhost, arbitrumSepolia, sepolia } from "viem/chains";
import { getConfigByChain } from "@/constants/contracts";
import { initUrqlClient } from "@/providers/urql";
import { passportScorerABI } from "@/src/generated";
import { CV_PERCENTAGE_SCALE } from "@/utils/numbers";

const LIST_MANAGER_PRIVATE_KEY = process.env.LIST_MANAGER_PRIVATE_KEY ?? "";
const CHAIN = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 1337;
const LOCAL_RPC = "http://127.0.0.1:8545";
const RPC_URL = getConfigByChain(CHAIN)?.rpcUrl ?? LOCAL_RPC;
const CONTRACT_ADDRESS = getConfigByChain(CHAIN)?.passportScorer as Address;
const SUBGRAPH = getConfigByChain(CHAIN)?.subgraphUrl as string;
const API_ENDPOINT = "/api/passport/scores";

interface PassportUser {
  id: string;
  userAddress: string;
  score: string;
  lastUpdated: string;
}

interface ApiScore {
  address: string;
  score: string;
  status: string;
  last_score_timestamp: string;
  expiration_date: string | null;
  evidence: string | null;
  error: string | null;
  stamp_scores: Record<string, number>;
}

function getViemChain(chain: number): Chain {

  switch (chain) {
    case localhost.id:
      return localhost;
    case arbitrumSepolia.id:
      return arbitrumSepolia;
    case sepolia.id:
      return sepolia;
    default:
      return localhost;
  }
}

const client = createPublicClient({
  chain: getViemChain(CHAIN),
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account: privateKeyToAccount(LIST_MANAGER_PRIVATE_KEY as Address),
  chain: getViemChain(CHAIN),
  transport: custom(client.transport),
});

const { urqlClient } = initUrqlClient({ chainId: CHAIN });

const query = gql`
  query {
    passportUsers {
      id
      userAddress
      score
      lastUpdated
    }
  }
`;

const fetchScoresFromService = async (): Promise<ApiScore[]> => {
  const url = new URL(
    API_ENDPOINT,
    `http://${process.env.HOST ?? "localhost"}:${process.env.PORT ?? 3000}`,
  );

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    const data = await response.json();
    return data.items;
  } else {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch scores from service");
  }
};

const compareScores = (
  subgraphUsers: PassportUser[],
  apiScores: ApiScore[],
) => {
  const updates: {
    userAddress: Address;
    score: number;
    lastUpdated: number;
  }[] = [];

  subgraphUsers.forEach((subgraphUser) => {
    const apiUser = apiScores.find(
      (user) =>
        user.address.toLowerCase() === subgraphUser.userAddress.toLowerCase(),
    );

    if (
      apiUser &&
      parseFloat(apiUser.score) !== parseFloat(subgraphUser.score)
    ) {
      updates.push({
        userAddress: subgraphUser.userAddress as Address,
        score: parseFloat(apiUser.score),
        lastUpdated: new Date(apiUser.last_score_timestamp).getTime() / 1000,
      });
    }
  });

  return updates;
};

const updateScoresOnChain = async (
  updates: { userAddress: Address; score: number; lastUpdated: number }[],
) => {
  for (const update of updates) {
    const integerScore = Number(update.score) * CV_PERCENTAGE_SCALE;
    const data = {
      abi: passportScorerABI,
      address: CONTRACT_ADDRESS,
      functionName: "addUserScore" as const,
      args: [
        update.userAddress,
        {
          score: BigInt(integerScore),
          lastUpdated: BigInt(Date.now()),
        },
      ] as const,
    };

    const hash = await walletClient.writeContract(data);
    await client.waitForTransactionReceipt({ hash });
  }
};

const updateScores = async () => {
  const subgraphResponse = await urqlClient
    .query<{ passportUsers: PassportUser[] }>(
    query,
    {},
    {
      url: SUBGRAPH,
      requestPolicy: "network-only",
    },
  )
    .toPromise();

  if (!subgraphResponse.data) {
    throw new Error("Failed to fetch data from subgraph");
  }

  const subgraphUsers = subgraphResponse.data.passportUsers ?? [];

  const apiScores = await fetchScoresFromService();
  const updates = compareScores(subgraphUsers, apiScores);

  if (updates.length > 0) {
    await updateScoresOnChain(updates);
  }

  return updates;
};

export async function GET() {
  try {
    const updates = await updateScores();
    return NextResponse.json(
      { message: "Scores updated successfully", updates },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
