// api/add-strategy

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
import {
  passportScorerABI,
  registryCommunityABI,
  cvStrategyABI,
} from "@/src/generated";
import { getViemChain } from "@/utils/web3";

const LIST_MANAGER_PRIVATE_KEY = process.env.LIST_MANAGER_PRIVATE_KEY;

const LOCAL_RPC = "http://127.0.0.1:8545";

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

  const { strategy, threshold } = await req.json();

  if (!strategy || !threshold) {
    return NextResponse.json(
      {
        error:
          "Strategy address, threshold, and CV Strategy address are required",
      },
      { status: 400 },
    );
  }

  try {
    const RPC_URL = getConfigByChain(chain)?.rpcUrl ?? LOCAL_RPC;

    const PASSPORT_SCORER_ADDRESS = getConfigByChain(chain)
      ?.passportScorer as Address;

    const client = createPublicClient({
      chain: getViemChain(chain),
      transport: http(RPC_URL),
    });

    const walletClient = createWalletClient({
      account: privateKeyToAccount(`${LIST_MANAGER_PRIVATE_KEY}` as Address),
      chain: getViemChain(chain),
      transport: custom(client.transport),
    });

    // Get registryCommunity address from CVStrategy
    let registryCommunityAddress: Address;
    try {
      registryCommunityAddress = await client.readContract({
        abi: cvStrategyABI,
        address: strategy,
        functionName: "registryCommunity",
      });
    } catch (error) {
      console.error("Error fetching registryCommunity address:", error);
      return NextResponse.json(
        { error: "Failed to fetch registryCommunity address" },
        { status: 500 },
      );
    }

    // Get councilSafe address from RegistryCommunity
    let councilSafeAddress: Address;
    try {
      councilSafeAddress = await client.readContract({
        abi: registryCommunityABI,
        address: registryCommunityAddress,
        functionName: "councilSafe",
      });
    } catch (error) {
      console.error("Error fetching councilSafe address:", error);
      return NextResponse.json(
        { error: "Failed to fetch councilSafe address" },
        { status: 500 },
      );
    }

    try {
      const data = {
        abi: passportScorerABI,
        address: PASSPORT_SCORER_ADDRESS,
        functionName: "addStrategy" as const,
        args: [
          strategy as Address,
          BigInt(threshold),
          councilSafeAddress,
        ] as const,
      };

      const hash = await walletClient.writeContract(data);

      return NextResponse.json({
        message: "Strategy added successfully",
        transactionHash: hash,
      });
    } catch (error) {
      console.error("Error adding strategy:", error);
      return NextResponse.json(
        { error: "Failed to add strategy" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
