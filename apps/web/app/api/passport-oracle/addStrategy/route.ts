// pages/api/addStrategy.ts

import { NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  Address,
  Chain,
} from "viem";
import { localhost, arbitrumSepolia, sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  passportScorerABI,
  registryCommunityABI,
  cvStrategyABI,
} from "@/src/generated";
import { getConfigByChain } from "@/constants/contracts";

const LIST_MANAGER_PRIVATE_KEY = process.env.LIST_MANAGER_PRIVATE_KEY;

const CHAIN = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 1337;
const LOCAL_RPC = "http://127.0.0.1:8545";

const RPC_URL = getConfigByChain(CHAIN)?.rpcUrl || LOCAL_RPC;

const PASSPORT_SCORER_ADDRESS = getConfigByChain(CHAIN)
  ?.passportScorer as Address;

function getViemChain(chain: number): Chain {
  let viemChain: Chain;

  switch (chain) {
    case localhost.id:
      viemChain = localhost;
      break;
    case arbitrumSepolia.id:
      viemChain = arbitrumSepolia;
      break;
    case sepolia.id:
      viemChain = sepolia;
      break;

    default:
      viemChain = localhost;
      break;
  }

  return viemChain;
}

const client = createPublicClient({
  chain: getViemChain(CHAIN),
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account: privateKeyToAccount(`${LIST_MANAGER_PRIVATE_KEY}` as Address),
  chain: localhost,
  transport: custom(client.transport),
});

export async function POST(req: Request) {
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
