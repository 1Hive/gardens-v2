import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  Address,
  createWalletClient,
  encodePacked,
  getAddress,
  Hex,
  http,
  isAddress,
  isHex,
  keccak256,
  parseAbi,
  stringToHex,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainConfigMap } from "@/configs/chains";
import { registryCommunityABI } from "@/src/generated";
import {
  getEnvPublicClient,
  getRpcUrlForChain,
  resolveClientChain,
} from "@/utils/publicClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHALLENGE_TTL_SECONDS = 5 * 60;
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_ACTIVE_CHALLENGES = 5_000;
const LEADERBOARD_METADATA_HASH = keccak256(
  stringToHex(
    JSON.stringify({ strategy: "streaming-leaderboard", version: 1 }),
  ),
);
const MARKEE_SEPOLIA_CHAIN_ID = 11155111;
const MARKEE_BASE_CHAIN_ID = 8453;
const LEADERBOARD_NAME = "Gardens Community";
const PLATFORM_ID = "Gardens";

const gardensMarkeeRouterABI = parseAbi([
  "function createCommunityLeaderboard(uint256 communityChainId, address registryCommunity, string leaderboardName, string platformId) returns (address vault, address leaderboard, address seedMarkee)",
  "function keepers(address keeper) view returns (bool)",
]);

const authorizationTypes = {
  OptInAuthorization: [
    { name: "communityKey", type: "bytes32" },
    { name: "communityChainId", type: "uint256" },
    { name: "registryCommunity", type: "address" },
    { name: "leaderboardFactory", type: "address" },
    { name: "leaderboardMetadataHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

type AuthorizationMessage = {
  communityKey: Hex;
  communityChainId: bigint;
  registryCommunity: Address;
  leaderboardFactory: Address;
  leaderboardMetadataHash: Hex;
  nonce: bigint;
  deadline: bigint;
};

type Challenge = {
  chainId: number;
  community: Address;
  councilSafe: Address;
  deadline: number;
  leaderboardFactory: Address;
  message: AuthorizationMessage;
  nonce: string;
};

type ChallengeRequest = {
  action: "challenge";
  chainId: number;
  community: Address;
  account: Address;
};

type VerifyRequest = {
  action: "verify";
  nonce: string;
  signature: Hex;
};

type RequestBody = ChallengeRequest | VerifyRequest;

const globalForMarkeeAuthorization = globalThis as typeof globalThis & {
  __markeeAuthorizationChallenges?: Map<string, Challenge>;
};

const challenges =
  globalForMarkeeAuthorization.__markeeAuthorizationChallenges ??
  new Map<string, Challenge>();

if (process.env.NODE_ENV !== "production") {
  globalForMarkeeAuthorization.__markeeAuthorizationChallenges = challenges;
}

const jsonError = (error: string, status: number) =>
  NextResponse.json(
    { error },
    {
      headers: { "Cache-Control": "no-store" },
      status,
    },
  );

const jsonSuccess = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseRequest = (value: unknown): RequestBody | null => {
  if (!isObject(value)) return null;

  if (value.action === "challenge") {
    if (
      typeof value.chainId !== "number" ||
      !Number.isSafeInteger(value.chainId) ||
      typeof value.community !== "string" ||
      !isAddress(value.community) ||
      typeof value.account !== "string" ||
      !isAddress(value.account)
    ) {
      return null;
    }

    return {
      action: "challenge",
      account: getAddress(value.account),
      chainId: value.chainId,
      community: getAddress(value.community),
    };
  }

  if (value.action === "verify") {
    if (
      typeof value.nonce !== "string" ||
      !/^[1-9][0-9]{0,77}$/u.test(value.nonce) ||
      typeof value.signature !== "string" ||
      !isHex(value.signature)
    ) {
      return null;
    }

    return {
      action: "verify",
      nonce: value.nonce,
      signature: value.signature,
    };
  }

  return null;
};

const pruneExpiredChallenges = (now: number) => {
  for (const [nonce, challenge] of challenges) {
    if (challenge.deadline <= now) {
      challenges.delete(nonce);
    }
  }
};

const getAuthorizationDomain = (chainId: number, community: Address) => ({
  name: "Gardens Markee",
  version: "1",
  chainId,
  verifyingContract: community,
});

const getMarkeeExecutionConfig = (communityChainId?: number) => {
  const isProduction =
    communityChainId == null ||
    chainConfigMap[communityChainId]?.isTestnet !== true;
  const factoryValue = (
    isProduction ?
      process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS_BASE
    : process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS_SEPOLIA)?.trim();
  const fallbackFactory =
    process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS?.trim();
  const routerValue = (
    isProduction ?
      process.env.MARKEE_ROUTER_ADDRESS_BASE
    : process.env.MARKEE_ROUTER_ADDRESS_SEPOLIA)?.trim();

  return {
    chainId: isProduction ? MARKEE_BASE_CHAIN_ID : MARKEE_SEPOLIA_CHAIN_ID,
    factory:
      factoryValue && isAddress(factoryValue) ? getAddress(factoryValue)
      : fallbackFactory && isAddress(fallbackFactory) ?
        getAddress(fallbackFactory)
      : null,
    router:
      routerValue && isAddress(routerValue) ? getAddress(routerValue) : null,
  };
};

const getStreamingLeaderboardFactoryAddress = (communityChainId?: number) => {
  const value = getMarkeeExecutionConfig(communityChainId).factory;
  return value && isAddress(value) ? getAddress(value) : null;
};

const executeRouterCreation = async (challenge: Challenge) => {
  const execution = getMarkeeExecutionConfig(challenge.chainId);
  if (!execution.router) {
    throw new Error("Markee router is not configured for this environment");
  }

  const privateKey = process.env.KEEPER_WALLET_PK?.trim();
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/u.test(privateKey)) {
    throw new Error("Markee keeper wallet is not configured");
  }

  const account = privateKeyToAccount(privateKey as Hex);
  const client = getEnvPublicClient(execution.chainId);
  const keeperIsAuthorized = await client.readContract({
    abi: gardensMarkeeRouterABI,
    address: execution.router,
    args: [account.address],
    functionName: "keepers",
  });
  if (!keeperIsAuthorized) {
    throw new Error("Markee keeper is not authorized by the router");
  }
  const simulation = await client.simulateContract({
    abi: gardensMarkeeRouterABI,
    account,
    address: execution.router,
    args: [
      BigInt(challenge.chainId),
      challenge.community,
      LEADERBOARD_NAME,
      PLATFORM_ID,
    ],
    functionName: "createCommunityLeaderboard",
  });
  const estimatedGas = await client.estimateContractGas(simulation.request);
  const gas = (estimatedGas * 125n + 99n) / 100n;
  const gasPrice = await client.getGasPrice();
  const requiredKeeperBalance = (gas * gasPrice * 125n + 99n) / 100n;
  const keeperBalance = await client.getBalance({ address: account.address });
  if (keeperBalance < requiredKeeperBalance) {
    throw new Error("Markee keeper needs more ETH to create the leaderboard");
  }

  const walletClient = createWalletClient({
    account,
    chain: resolveClientChain(execution.chainId),
    transport: http(getRpcUrlForChain(execution.chainId)),
  });
  const transactionHash = await walletClient.writeContract({
    ...simulation.request,
    gas,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: transactionHash,
  });
  if (receipt.status !== "success") {
    throw new Error("Markee leaderboard creation transaction reverted");
  }

  return {
    chainId: execution.chainId,
    from: account.address,
    router: execution.router,
    result: simulation.result,
    transactionHash,
  };
};

const readCouncilSafe = async (chainId: number, community: Address) => {
  const client = getEnvPublicClient(chainId);
  const councilSafe = await client.readContract({
    abi: registryCommunityABI,
    address: community,
    functionName: "councilSafe",
  });

  if (typeof councilSafe !== "string" || !isAddress(councilSafe)) {
    throw new Error("Invalid council Safe returned by community contract");
  }

  return getAddress(councilSafe);
};

const createAuthorizationMessage = ({
  chainId,
  community,
  deadline,
  leaderboardFactory,
  nonce,
}: {
  chainId: number;
  community: Address;
  deadline: number;
  leaderboardFactory: Address;
  nonce: bigint;
}): AuthorizationMessage => ({
  communityKey: keccak256(
    encodePacked(["uint256", "address"], [BigInt(chainId), community]),
  ),
  communityChainId: BigInt(chainId),
  registryCommunity: community,
  leaderboardFactory,
  leaderboardMetadataHash: LEADERBOARD_METADATA_HASH,
  nonce,
  deadline: BigInt(deadline),
});

const issueChallenge = async (body: ChallengeRequest) => {
  if (process.env.NODE_ENV === "production") {
    return jsonError(
      "Markee authorization nonce storage is not configured.",
      503,
    );
  }

  if (!Object.prototype.hasOwnProperty.call(chainConfigMap, body.chainId)) {
    return jsonError("Unsupported community chain.", 400);
  }

  const leaderboardFactory = getStreamingLeaderboardFactoryAddress(
    body.chainId,
  );
  if (!leaderboardFactory) {
    return jsonError(
      "Markee streaming leaderboard factory is not configured.",
      503,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  pruneExpiredChallenges(now);
  if (challenges.size >= MAX_ACTIVE_CHALLENGES) {
    return jsonError("Too many active authorization requests.", 429);
  }

  try {
    const councilSafe = await readCouncilSafe(body.chainId, body.community);
    if (councilSafe === zeroAddress) {
      return jsonError("This community does not have a council Safe.", 409);
    }
    if (body.account !== councilSafe) {
      return jsonError(
        "Connect with the community council Safe to authorize Markee.",
        403,
      );
    }

    const randomNonce = BigInt(`0x${randomBytes(32).toString("hex")}`);
    const nonceValue = randomNonce === BigInt(0) ? BigInt(1) : randomNonce;
    const nonce = nonceValue.toString();
    const deadline = now + CHALLENGE_TTL_SECONDS;
    const challenge: Challenge = {
      chainId: body.chainId,
      community: body.community,
      councilSafe,
      deadline,
      leaderboardFactory,
      message: createAuthorizationMessage({
        chainId: body.chainId,
        community: body.community,
        deadline,
        leaderboardFactory,
        nonce: nonceValue,
      }),
      nonce,
    };
    challenges.set(nonce, challenge);

    return jsonSuccess(
      {
        chainId: challenge.chainId,
        community: challenge.community,
        councilSafe: challenge.councilSafe,
        deadline: challenge.deadline,
        leaderboardFactory: challenge.leaderboardFactory,
        nonce: challenge.nonce,
        typedData: {
          domain: getAuthorizationDomain(
            challenge.chainId,
            challenge.community,
          ),
          message: {
            ...challenge.message,
            communityChainId: challenge.message.communityChainId.toString(),
            deadline: challenge.message.deadline.toString(),
            nonce: challenge.message.nonce.toString(),
          },
          primaryType: "OptInAuthorization",
          types: authorizationTypes,
        },
      },
      201,
    );
  } catch (error) {
    console.error("[Markee authorization] Failed to issue challenge", error);
    return jsonError("Unable to read the community council Safe.", 502);
  }
};

const verifyChallenge = async (body: VerifyRequest) => {
  const challenge = challenges.get(body.nonce);
  if (!challenge) {
    return jsonError(
      "Authorization challenge is invalid or already used.",
      401,
    );
  }

  // Consume before asynchronous verification so concurrent requests cannot replay it.
  challenges.delete(body.nonce);

  if (challenge.deadline <= Math.floor(Date.now() / 1000)) {
    return jsonError("Authorization challenge has expired.", 401);
  }

  try {
    const currentLeaderboardFactory = getStreamingLeaderboardFactoryAddress(
      challenge.chainId,
    );
    if (!currentLeaderboardFactory) {
      return jsonError(
        "Markee streaming leaderboard factory is not configured.",
        503,
      );
    }
    if (currentLeaderboardFactory !== challenge.leaderboardFactory) {
      return jsonError(
        "The Markee leaderboard factory changed. Request a new challenge.",
        409,
      );
    }

    const currentCouncilSafe = await readCouncilSafe(
      challenge.chainId,
      challenge.community,
    );
    if (currentCouncilSafe !== challenge.councilSafe) {
      return jsonError(
        "The community council Safe changed. Request a new challenge.",
        409,
      );
    }

    const client = getEnvPublicClient(challenge.chainId);
    const signatureIsValid = await client.verifyTypedData({
      address: currentCouncilSafe,
      domain: getAuthorizationDomain(challenge.chainId, challenge.community),
      message: challenge.message,
      primaryType: "OptInAuthorization",
      signature: body.signature,
      types: authorizationTypes,
    });
    if (!signatureIsValid) {
      return jsonError("Invalid council Safe authorization signature.", 401);
    }

    const routerExecution = await executeRouterCreation(challenge);

    return jsonSuccess({
      authorized: true,
      chainId: challenge.chainId,
      community: challenge.community,
      councilSafe: currentCouncilSafe,
      leaderboardFactory: challenge.leaderboardFactory,
      markeeChainId: routerExecution.chainId,
      router: routerExecution.router,
      transactionHash: routerExecution.transactionHash,
    });
  } catch (error) {
    console.error("[Markee authorization] Failed to verify challenge", error);
    return jsonError("Unable to verify Markee authorization.", 502);
  }
};

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return jsonError("Request body is too large.", 413);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const body = parseRequest(rawBody);
  if (!body) {
    return jsonError("Invalid Markee authorization request.", 400);
  }

  return body.action === "challenge" ?
      issueChallenge(body)
    : verifyChallenge(body);
}

export const clearMarkeeAuthorizationChallengesForTests = () => {
  challenges.clear();
};
