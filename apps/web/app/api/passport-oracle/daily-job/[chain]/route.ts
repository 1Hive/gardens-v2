// api/passport-oracles/daily-job

import { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { NextResponse } from "next/server";
import { gql } from "urql";
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getConfigByChain } from "@/configs/chains";
import { initUrqlClient } from "@/providers/urql";
import { passportScorerABI } from "@/src/generated";
import { CV_PASSPORT_THRESHOLD_SCALE } from "@/utils/numbers";
import { getViemChain } from "@/utils/web3";

const LIST_MANAGER_PRIVATE_KEY = process.env.LIST_MANAGER_PRIVATE_KEY ?? "";
const LOCAL_RPC = "http://127.0.0.1:8545";

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
  const url = `${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/api/passport/scores/`;

  const response = await fetch(url, {
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
  chain: string,
  updates: { userAddress: Address; score: number; lastUpdated: number }[],
) => {
  const RPC_URL = getConfigByChain(chain)?.rpcUrl ?? LOCAL_RPC;
  const CONTRACT_ADDRESS = getConfigByChain(chain)?.passportScorer as Address;

  for (const update of updates) {
    const integerScore = Number(update.score) * CV_PASSPORT_THRESHOLD_SCALE;

    const client = createPublicClient({
      chain: getViemChain(chain),
      transport: http(RPC_URL),
    });

    const walletClient = createWalletClient({
      account: privateKeyToAccount(LIST_MANAGER_PRIVATE_KEY as Address),
      chain: getViemChain(chain),
      transport: custom(client.transport),
    });

    const hash = await walletClient.writeContract({
      abi: passportScorerABI,
      address: CONTRACT_ADDRESS,
      functionName: "addUserScore" as const,
      args: [update.userAddress, BigInt(integerScore)] as const,
    });
    await client.waitForTransactionReceipt({ hash });
  }
};

const updateScores = async (chain: string) => {
  const subgraphUrl = getConfigByChain(chain)?.subgraphUrl as string;
  const { urqlClient } = initUrqlClient({ chainId: chain });
  const subgraphResponse = await urqlClient
    .query<{ passportUsers: PassportUser[] }>(
      query,
      {},
      {
        url: subgraphUrl,
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
    await updateScoresOnChain(chain, updates);
  }

  return updates;
};

export async function GET(req: Request, { params }: Params) {
  const apiKey = req.headers.get("Authorization");
  const { chain } = params;

  if (apiKey !== process.env.CRON_SECRET) {
    console.error("Unauthorized", {
      req: req.url,
      chain,
    });
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const updates = await updateScores(chain);
    return NextResponse.json(
      {
        message:
          updates.length ?
            "Scores updated successfully"
          : "No updates required",
        updates,
      },
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
