// api/passport-oracle/write-score

import { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getConfigByChain } from "@/configs/chains";
import { passportScorerABI } from "@/src/generated";
import { CV_PERCENTAGE_SCALE } from "@/utils/numbers";
import { getViemChain } from "@/utils/web3";

const LIST_MANAGER_PRIVATE_KEY = process.env.LIST_MANAGER_PRIVATE_KEY;
const LOCAL_RPC = "http://127.0.0.1:8545";

const fetchScoreFromGitcoin = async (user: string) => {
  const url = `${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/api/passport`;
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

export async function POST(req: Request, { params }: Params) {
  const apiKey = req.headers.get("Authorization");
  const { chain } = params;

  if (apiKey !== process.env.CRON_SECRET) {
    console.error("Unauthorized", {
      req: req.url,
      chain,
    });
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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
    const RPC_URL = getConfigByChain(chain)?.rpcUrl ?? LOCAL_RPC;

    const CONTRACT_ADDRESS = getConfigByChain(chain)?.passportScorer as Address;

    const client = createPublicClient({
      chain: getViemChain(chain),
      transport: http(RPC_URL),
    });

    const walletClient = createWalletClient({
      account: privateKeyToAccount(
        (`${LIST_MANAGER_PRIVATE_KEY}` as Address) || "",
      ),
      chain: getViemChain(chain),
      transport: custom(client.transport),
    });

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
