// pages/api/addUserScore.ts

import { NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  Address,
} from "viem";
import { mainnet, localhost } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { recoverAddress, hashMessage } from "viem";
import { passportScorerABI } from "@/src/generated";
import { getContractsAddrByChain } from "@/constants/contracts";

const CONTRACT_ADDRESS = process.env.PASSPORT_SCORER_ADDRESS as Address;

const LIST_MANAGER_PRIVATE_KEY = process.env.LIST_MANAGER_PRIVATE_KEY;

const CHAIN = process.env.CHAIN_ID || "1337";
const LOCAL_RPC = "http://127.0.0.1:8545";

const RPC_URL = getContractsAddrByChain(CHAIN)?.rpcUrl || LOCAL_RPC;

const client = createPublicClient({
  chain: localhost,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account: privateKeyToAccount(`0x${LIST_MANAGER_PRIVATE_KEY}` || ""),
  chain: localhost,
  transport: custom(client.transport),
});

async function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string,
): Promise<boolean> {
  try {
    const messageHash = hashMessage(message);

    if (!signature.startsWith("0x")) {
      signature = "0x" + signature;
    }

    const recoveredAddress = await recoverAddress({
      hash: messageHash,
      signature: signature as Address,
    });

    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

export async function POST(req: Request) {
  const { user, score, signature, message } = await req.json();

  if (!user || !score || !signature || !message) {
    return NextResponse.json(
      {
        error: "User address, score, message, and signature are required",
      },
      { status: 400 },
    );
  }

  try {
    const isValidSignature = await verifySignature(message, signature, user);
    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

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
