// pages/api/addUserScore.ts

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
import { passportScorerABI } from "@/src/generated";
import { getContractsAddrByChain } from "@/constants/contracts";

const LIST_MANAGER_PRIVATE_KEY = process.env.LIST_MANAGER_PRIVATE_KEY;

const CHAIN = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 1337;
const LOCAL_RPC = "http://127.0.0.1:8545";

const RPC_URL = getContractsAddrByChain(CHAIN)?.rpcUrl || LOCAL_RPC;

const CONTRACT_ADDRESS = getContractsAddrByChain(CHAIN)
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
  account: privateKeyToAccount(
    (`${LIST_MANAGER_PRIVATE_KEY}` as Address) || "",
  ),
  chain: localhost,
  transport: custom(client.transport),
});

export async function POST(req: Request) {
  const { user, score } = await req.json();

  if (!user || !score) {
    return NextResponse.json(
      {
        error: "User address and score are required",
      },
      { status: 400 },
    );
  }

  try {
    const data = {
      abi: passportScorerABI,
      address: CONTRACT_ADDRESS,
      functionName: "addUserScore" as const,
      args: [user, BigInt(score)] as const,
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