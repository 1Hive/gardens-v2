import { NextResponse } from "next/server";
import { gql, type Client } from "urql";
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
import {
  ApiScore,
  fetchAllPassportScores,
  getEffectivePassportScore,
} from "@/utils/gitcoin-passport";
import { CV_PASSPORT_THRESHOLD_SCALE } from "@/utils/numbers";
import { getViemChain } from "@/utils/web3";

const PASSPORT_KEEPER_PRIVATE_KEY =
  process.env.LIST_MANAGER_PRIVATE_KEY ?? process.env.KEEPER_WALLET_PK ?? "";
const LOCAL_RPC = "http://127.0.0.1:8545";
const SCORE_REFRESH_INTERVAL_SECONDS = 7 * 24 * 60 * 60;

interface PassportUser {
  id: string;
  userAddress: string;
  score: string;
  lastUpdated: string;
}

const PASSPORT_USER_PAGE_SIZE = 1000;

const query = gql`
  query PassportUsers($first: Int!, $skip: Int!) {
    passportUsers(
      first: $first
      skip: $skip
      orderBy: id
      orderDirection: asc
    ) {
      id
      userAddress
      score
      lastUpdated
    }
  }
`;

export const compareScores = (
  subgraphUsers: PassportUser[],
  apiScores: ApiScore[],
  nowSeconds = Math.floor(Date.now() / 1000),
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

    if (!apiUser) return;

    const apiScore = getEffectivePassportScore(apiUser, nowSeconds * 1000);
    const scaledApiScore = Math.round(apiScore * CV_PASSPORT_THRESHOLD_SCALE);
    const storedScore = Number(subgraphUser.score);
    const scoreIsStale =
      Number(subgraphUser.lastUpdated) <=
      nowSeconds - SCORE_REFRESH_INTERVAL_SECONDS;

    if (scaledApiScore !== storedScore || scoreIsStale) {
      updates.push({
        userAddress: subgraphUser.userAddress as Address,
        score: apiScore,
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
  if (!PASSPORT_KEEPER_PRIVATE_KEY) {
    throw new Error("Passport keeper is not configured");
  }
  const RPC_URL = getConfigByChain(chain)?.rpcUrl ?? LOCAL_RPC;
  const CONTRACT_ADDRESS = getConfigByChain(chain)?.passportScorer as Address;

  const failures: { userAddress: Address; error: string }[] = [];
  for (const update of updates) {
    const integerScore = Math.round(
      Number(update.score) * CV_PASSPORT_THRESHOLD_SCALE,
    );
    if (
      !Number.isFinite(update.score) ||
      update.score < 0 ||
      !Number.isSafeInteger(integerScore)
    ) {
      failures.push({
        userAddress: update.userAddress,
        error: "Passport score is invalid",
      });
      continue;
    }

    const client = createPublicClient({
      chain: getViemChain(chain),
      transport: http(RPC_URL),
    });

    const walletClient = createWalletClient({
      account: privateKeyToAccount(PASSPORT_KEEPER_PRIVATE_KEY as Address),
      chain: getViemChain(chain),
      transport: custom(client.transport),
    });

    try {
      const hash = await walletClient.writeContract({
        abi: passportScorerABI,
        address: CONTRACT_ADDRESS,
        functionName: "addUserScore" as const,
        args: [update.userAddress, BigInt(integerScore)] as const,
      });
      await client.waitForTransactionReceipt({ hash });
    } catch (error) {
      console.error("Failed to refresh Passport score", {
        chain,
        userAddress: update.userAddress,
        error,
      });
      failures.push({
        userAddress: update.userAddress,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  return failures;
};

const updateScores = async (chain: string) => {
  const subgraphUrl = getConfigByChain(chain)?.subgraphUrl as string;
  const { urqlClient } = initUrqlClient({ chainId: chain });

  const subgraphUsers = await fetchPassportUsers(urqlClient, subgraphUrl);

  const apiScores = await fetchAllPassportScores();

  const updates = compareScores(subgraphUsers, apiScores);

  const failures =
    updates.length > 0 ? await updateScoresOnChain(chain, updates) : [];

  return { updates, failures };
};

export const fetchPassportUsers = async (
  urqlClient: Client,
  subgraphUrl: string,
) => {
  const subgraphUsers: PassportUser[] = [];
  for (let skip = 0; ; skip += PASSPORT_USER_PAGE_SIZE) {
    const subgraphResponse = await urqlClient
      .query<{ passportUsers: PassportUser[] }>(
        query,
        { first: PASSPORT_USER_PAGE_SIZE, skip },
        {
          url: subgraphUrl,
          requestPolicy: "network-only",
        },
      )
      .toPromise();

    if (!subgraphResponse.data) {
      throw new Error("Failed to fetch data from subgraph");
    }

    const page = subgraphResponse.data.passportUsers ?? [];
    subgraphUsers.push(...page);
    if (page.length < PASSPORT_USER_PAGE_SIZE) break;
  }
  return subgraphUsers;
};

type RouteContext = {
  params: Promise<{
    chain: string;
  }>;
};

export async function GET(req: Request, { params }: RouteContext) {
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "");
  const { chain } = await params;

  if (apiKey !== process.env.CRON_SECRET) {
    console.error("Unauthorized", {
      req: req.url,
      chain,
    });
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { updates, failures } = await updateScores(chain);
    return NextResponse.json(
      {
        message:
          updates.length ?
            "Scores updated successfully"
          : "No updates required",
        updates,
        failures,
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
