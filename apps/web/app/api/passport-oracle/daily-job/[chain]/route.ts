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
  fetchPassportScoreRecord,
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
// Eight scheduled chains share one Passport API key. Four reads per chain
// leave headroom below Passport's default 125 requests / 15 minutes.
const PASSPORT_REFRESH_BATCH_SIZE = 4;
const PASSPORT_REFRESH_SLOT_MS = 15 * 60 * 1000;

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
  const config = getConfigByChain(chain);
  if (!config?.subgraphUrl)
    throw new Error("Passport subgraph is not configured");
  const { urqlClient } = initUrqlClient({ chainId: chain });

  const subgraphUsers = await fetchPassportUsers(
    urqlClient,
    config.subgraphUrl,
    config.publishedSubgraphUrl,
  );
  const selectedUsers = selectPassportUsersForRefresh(subgraphUsers);
  const results = await Promise.allSettled(
    selectedUsers.map((user) => fetchPassportScoreRecord(user.userAddress)),
  );
  const apiScores: ApiScore[] = [];
  const failures: { userAddress: Address; error: string }[] = [];
  results.forEach((result, index) => {
    const userAddress = selectedUsers[index].userAddress as Address;
    if (result.status === "rejected") {
      failures.push({
        userAddress,
        error:
          result.reason instanceof Error ?
            result.reason.message
          : "Passport score request failed",
      });
      return;
    }
    try {
      if (result.value.error != null) throw new Error(result.value.error);
      getEffectivePassportScore(result.value);
      if (!Number.isFinite(Date.parse(result.value.last_score_timestamp)))
        throw new Error("Passport API returned an invalid score timestamp");
      apiScores.push(result.value);
    } catch (error) {
      failures.push({
        userAddress,
        error:
          error instanceof Error ? error.message : "Invalid Passport score",
      });
    }
  });

  const updates = compareScores(selectedUsers, apiScores);
  if (updates.length > 0)
    failures.push(...(await updateScoresOnChain(chain, updates)));

  return {
    updates,
    failures,
    processed: selectedUsers.length,
    totalUsers: subgraphUsers.length,
  };
};

export const selectPassportUsersForRefresh = (
  users: PassportUser[],
  nowMs = Date.now(),
): PassportUser[] => {
  if (users.length <= PASSPORT_REFRESH_BATCH_SIZE) return users;
  const start =
    (Math.floor(nowMs / PASSPORT_REFRESH_SLOT_MS) *
      PASSPORT_REFRESH_BATCH_SIZE) %
    users.length;
  return Array.from(
    { length: PASSPORT_REFRESH_BATCH_SIZE },
    (_, offset) => users[(start + offset) % users.length],
  );
};

export const fetchPassportUsers = async (
  urqlClient: Client,
  subgraphUrl: string,
  publishedSubgraphUrl?: string,
) => {
  const endpoints =
    publishedSubgraphUrl && publishedSubgraphUrl !== subgraphUrl ?
      [publishedSubgraphUrl, subgraphUrl]
    : [subgraphUrl];
  let lastError = "Subgraph returned no data";
  for (const [index, endpoint] of endpoints.entries()) {
    try {
      const subgraphUsers: PassportUser[] = [];
      for (let skip = 0; ; skip += PASSPORT_USER_PAGE_SIZE) {
        const response = await urqlClient
          .query<{
            passportUsers: PassportUser[];
          }>(
            query,
            { first: PASSPORT_USER_PAGE_SIZE, skip },
            { url: endpoint, requestPolicy: "network-only" },
          )
          .toPromise();
        if (!Array.isArray(response.data?.passportUsers)) {
          const error = response.error;
          const status =
            error?.networkError && "response" in error.networkError ?
              (error.networkError.response as Response | undefined)?.status
            : undefined;
          lastError = `Subgraph returned no users data${status != null ? ` (HTTP ${status})` : ""}`;
          throw new Error(lastError);
        }
        const page = response.data?.passportUsers as PassportUser[];
        subgraphUsers.push(...page);
        if (page.length < PASSPORT_USER_PAGE_SIZE) return subgraphUsers;
      }
    } catch (error) {
      lastError =
        error instanceof Error && error.message === lastError ?
          lastError
        : "Subgraph request failed";
      console.warn("[passport-oracle] Subgraph lookup failed", {
        source: index === 0 && endpoints.length > 1 ? "published" : "studio",
        reason: lastError,
      });
    }
  }
  throw new Error(`Failed to fetch Passport users: ${lastError}`);
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
    const { updates, failures, processed, totalUsers } =
      await updateScores(chain);
    if (failures.length > 0)
      console.error("[passport-oracle] Score refresh failures", {
        chain,
        failures,
        processed,
      });
    return NextResponse.json(
      {
        message:
          failures.length > 0 ?
            "Some Passport scores could not be refreshed"
          : updates.length ?
            "Scores updated successfully"
          : "No updates required",
        updates,
        failures,
        processed,
        totalUsers,
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
