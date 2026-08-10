import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  Address,
  encodePacked,
  getAddress,
  Hex,
  isAddress,
  isHex,
  keccak256,
  parseAbi,
  zeroAddress,
} from "viem";
import { chainConfigMap } from "@/configs/chains";
import {
  executeMarkeeClaim,
  getMarkeeChainId,
  MarkeeClaimExecutionError,
  markeeAdapter,
} from "@/services/markeeServer";
import { registryCommunityABI } from "@/src/generated";
import { getEnvPublicClient } from "@/utils/publicClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHALLENGE_TTL_SECONDS = 5 * 60;
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_ACTIVE_CHALLENGES = 5_000;

const safeOwnerABI = parseAbi([
  "function isOwner(address account) view returns (bool)",
]);

const claimAuthorizationTypes = {
  ClaimAuthorization: [
    { name: "communityKey", type: "bytes32" },
    { name: "communityChainId", type: "uint256" },
    { name: "registryCommunity", type: "address" },
    { name: "councilSafe", type: "address" },
    { name: "claimant", type: "address" },
    { name: "recipient", type: "address" },
    { name: "markeeChainId", type: "uint256" },
    { name: "claimAmount", type: "uint256" },
    { name: "maxFeeAmount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

type ClaimAuthorizationMessage = {
  communityKey: Hex;
  communityChainId: bigint;
  registryCommunity: Address;
  councilSafe: Address;
  claimant: Address;
  recipient: Address;
  markeeChainId: bigint;
  claimAmount: bigint;
  maxFeeAmount: bigint;
  nonce: bigint;
  deadline: bigint;
};

type ClaimChallenge = {
  chainId: number;
  community: Address;
  councilSafe: Address;
  claimant: Address;
  deadline: number;
  message: ClaimAuthorizationMessage;
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

const globalForMarkeeClaimAuthorization = globalThis as typeof globalThis & {
  __markeeClaimAuthorizationChallenges?: Map<string, ClaimChallenge>;
};

const challenges =
  globalForMarkeeClaimAuthorization.__markeeClaimAuthorizationChallenges ??
  new Map<string, ClaimChallenge>();

if (process.env.NODE_ENV !== "production") {
  globalForMarkeeClaimAuthorization.__markeeClaimAuthorizationChallenges =
    challenges;
}

const jsonError = (error: string, status: number) =>
  NextResponse.json(
    { error },
    { headers: { "Cache-Control": "no-store" }, status },
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
      account: getAddress(value.account),
      action: "challenge",
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
    if (challenge.deadline <= now) challenges.delete(nonce);
  }
};

const getAuthorizationDomain = (chainId: number, community: Address) => ({
  name: "Gardens Markee Claim",
  version: "1",
  chainId,
  verifyingContract: community,
});

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

const isEligibleClaimant = async (
  chainId: number,
  councilSafe: Address,
  account: Address,
) => {
  if (account === councilSafe) return true;

  const client = getEnvPublicClient(chainId);
  return client.readContract({
    abi: safeOwnerABI,
    address: councilSafe,
    args: [account],
    functionName: "isOwner",
  });
};

const createClaimMessage = async ({
  chainId,
  community,
  councilSafe,
  claimant,
  deadline,
  nonce,
}: {
  chainId: number;
  community: Address;
  councilSafe: Address;
  claimant: Address;
  deadline: number;
  nonce: bigint;
}): Promise<ClaimAuthorizationMessage> => {
  const quote = await markeeAdapter.getClaimQuote(
    chainId,
    community,
    councilSafe,
  );

  return {
    claimAmount: quote.claimAmount,
    claimant,
    communityChainId: BigInt(chainId),
    communityKey: keccak256(
      encodePacked(["uint256", "address"], [BigInt(chainId), community]),
    ),
    councilSafe,
    deadline: BigInt(deadline),
    markeeChainId: BigInt(getMarkeeChainId(chainId)),
    maxFeeAmount: quote.estimatedFeeAmount,
    nonce,
    recipient: councilSafe,
    registryCommunity: community,
  };
};

const issueChallenge = async (body: ChallengeRequest) => {
  if (process.env.NODE_ENV === "production") {
    return jsonError(
      "Markee claim authorization nonce storage is not configured.",
      503,
    );
  }

  if (!Object.prototype.hasOwnProperty.call(chainConfigMap, body.chainId)) {
    return jsonError("Unsupported community chain.", 400);
  }

  const now = Math.floor(Date.now() / 1000);
  pruneExpiredChallenges(now);
  if (challenges.size >= MAX_ACTIVE_CHALLENGES) {
    return jsonError("Too many active claim authorization requests.", 429);
  }

  try {
    const councilSafe = await readCouncilSafe(body.chainId, body.community);
    if (councilSafe === zeroAddress) {
      return jsonError("This community does not have a council Safe.", 409);
    }
    if (!(await isEligibleClaimant(body.chainId, councilSafe, body.account))) {
      return jsonError(
        "Connect with the council Safe or one of its current owners to claim revenue.",
        403,
      );
    }

    const randomNonce = BigInt(`0x${randomBytes(32).toString("hex")}`);
    const nonceValue = randomNonce === BigInt(0) ? BigInt(1) : randomNonce;
    const nonce = nonceValue.toString();
    const deadline = now + CHALLENGE_TTL_SECONDS;
    const challenge: ClaimChallenge = {
      chainId: body.chainId,
      claimant: body.account,
      community: body.community,
      councilSafe,
      deadline,
      message: await createClaimMessage({
        chainId: body.chainId,
        claimant: body.account,
        community: body.community,
        councilSafe,
        deadline,
        nonce: nonceValue,
      }),
      nonce,
    };
    challenges.set(nonce, challenge);

    return jsonSuccess(
      {
        chainId: challenge.chainId,
        claimant: challenge.claimant,
        community: challenge.community,
        councilSafe: challenge.councilSafe,
        deadline: challenge.deadline,
        nonce: challenge.nonce,
        typedData: {
          domain: getAuthorizationDomain(
            challenge.chainId,
            challenge.community,
          ),
          message: Object.fromEntries(
            Object.entries(challenge.message).map(([key, value]) => [
              key,
              typeof value === "bigint" ? value.toString() : value,
            ]),
          ),
          primaryType: "ClaimAuthorization",
          types: claimAuthorizationTypes,
        },
      },
      201,
    );
  } catch (error) {
    console.error("[Markee claim authorization] Challenge failed", error);
    return jsonError("Unable to validate the council Safe member.", 502);
  }
};

const verifyChallenge = async (body: VerifyRequest) => {
  const challenge = challenges.get(body.nonce);
  if (!challenge) {
    return jsonError(
      "Claim authorization challenge is invalid or already used.",
      401,
    );
  }

  challenges.delete(body.nonce);

  if (challenge.deadline <= Math.floor(Date.now() / 1000)) {
    return jsonError("Claim authorization challenge has expired.", 401);
  }

  try {
    const currentCouncilSafe = await readCouncilSafe(
      challenge.chainId,
      challenge.community,
    );
    if (currentCouncilSafe !== challenge.councilSafe) {
      return jsonError(
        "The community council Safe changed. Request a new claim authorization.",
        409,
      );
    }
    if (
      !(await isEligibleClaimant(
        challenge.chainId,
        currentCouncilSafe,
        challenge.claimant,
      ))
    ) {
      return jsonError(
        "The claim signer is no longer a council Safe owner.",
        403,
      );
    }

    const client = getEnvPublicClient(challenge.chainId);
    const signatureIsValid = await client.verifyTypedData({
      address: challenge.claimant,
      domain: getAuthorizationDomain(challenge.chainId, challenge.community),
      message: challenge.message,
      primaryType: "ClaimAuthorization",
      signature: body.signature,
      types: claimAuthorizationTypes,
    });
    if (!signatureIsValid) {
      return jsonError("Invalid claim authorization signature.", 401);
    }

    const execution = await executeMarkeeClaim({
      chainId: challenge.chainId,
      community: challenge.community,
      expectedClaimAmount: challenge.message.claimAmount,
      maxFeeAmount: challenge.message.maxFeeAmount,
      recipient: currentCouncilSafe,
    });

    return jsonSuccess({
      authorized: true,
      bridged: execution.bridged,
      chainId: challenge.chainId,
      claimAmount: execution.claimAmount.toString(),
      claimant: challenge.claimant,
      community: challenge.community,
      councilSafe: currentCouncilSafe,
      estimatedFeeAmount: execution.estimatedFeeAmount.toString(),
      expectedAmountOut: execution.expectedAmountOut.toString(),
      markeeChainId: execution.markeeChainId,
      recipient: currentCouncilSafe,
      transactionHash: execution.transactionHash,
    });
  } catch (error) {
    console.error("[Markee claim authorization] Verification failed", error);
    if (error instanceof MarkeeClaimExecutionError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Unable to verify claim authorization.", 502);
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
    return jsonError("Invalid Markee claim authorization request.", 400);
  }

  return body.action === "challenge" ?
      issueChallenge(body)
    : verifyChallenge(body);
}

export const clearMarkeeClaimAuthorizationChallengesForTests = () => {
  if (process.env.NODE_ENV === "test") challenges.clear();
};
