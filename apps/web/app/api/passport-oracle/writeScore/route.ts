// api/passport-oracle/write-score

import { NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getConfigByChain } from "@/constants/contracts";
import { passportScorerABI } from "@/src/generated";
import { CV_PERCENTAGE_SCALE } from "@/utils/numbers";
import { getViemChain } from "@/utils/viem";

const LIST_MANAGER_PRIVATE_KEY = process.env.LIST_MANAGER_PRIVATE_KEY;
const CHAIN_ID = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 1337;
const LOCAL_RPC = "http://127.0.0.1:8545";

const RPC_URL = getConfigByChain(CHAIN_ID)?.rpcUrl ?? LOCAL_RPC;

const CONTRACT_ADDRESS = getConfigByChain(CHAIN_ID)?.passportScorer as Address;

const API_ENDPOINT = "/api/passport";

const client = createPublicClient({
  chain: getViemChain(CHAIN_ID),
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account: privateKeyToAccount(
    (`${LIST_MANAGER_PRIVATE_KEY}` as Address) || "",
  ),
  chain: getViemChain(CHAIN_ID),
  transport: custom(client.transport),
});

const fetchScoreFromGitcoin = async (user: string) => {
  const url = new URL(
    API_ENDPOINT,
    `http://${process.env.HOST ?? "localhost"}:${process.env.PORT ?? 3000}`,
  );
  const response = await fetch(`${url}/${user}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    const data = await response.json();
    return data.score;
  } else {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch score from Gitcoin");
  }
};

export async function POST(req: Request) {
  const { user } = await req.json();

  if (!user) {
    return NextResponse.json(
      {
        error: "User address is required",
      },
      { status: 400 },
    );
  }

  try {
    const score = await fetchScoreFromGitcoin(user);
    const integerScore = Number(score) * CV_PERCENTAGE_SCALE;
    const data = {
      abi: passportScorerABI,
      address: CONTRACT_ADDRESS,
      functionName: "addUserScore" as const,
      args: [
        user,
        { score: BigInt(integerScore), lastUpdated: BigInt(Date.now()) },
      ] as const,
    };

    const hash = await walletClient.writeContract(data);

    return NextResponse.json({
      message: "User score added successfully",
      transactionHash: hash,
    });
  } catch (error) {
    console.error("Error adding user score:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
