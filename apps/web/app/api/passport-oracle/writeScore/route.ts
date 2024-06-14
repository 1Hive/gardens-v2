// pages/api/addUserScore.ts

import { NextApiRequest, NextApiResponse } from "next";
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

const CONTRACT_ADDRESS = process.env.PASSPORT_SCORER_ADDRESS as Address;

const LIST_MANAGER_PRIVATE_KEY = process.env
  .LIST_MANAGER_PRIVATE_KEY as Address;
// const CHAIN = process.env.CHAIN || "localhost";

const client = createPublicClient({
  chain: localhost,
  transport: http(
    process.env.NEXT_PUBLIC_RPC_URL_ARB_TESTNET || "http://127.0.0.1:8545",
  ),
});

const walletClient = createWalletClient({
  account: privateKeyToAccount(LIST_MANAGER_PRIVATE_KEY || ""),
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user, score, signature, message } = req.body;

  if (!user || !score || !signature || !message) {
    return res.status(400).json({
      error: "User address, score, message, and signature are required",
    });
  }

  try {
    // Verify the signature
    const isValidSignature = await verifySignature(message, signature, user);
    if (!isValidSignature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const data = {
      abi: passportScorerABI,
      address: CONTRACT_ADDRESS,
      functionName: "addUserScore" as const,
      args: [user, BigInt(score)] as const,
    };

    // Send the transaction
    const hash = await walletClient.writeContract(data);

    return res.status(200).json({
      message: "User score added successfully",
      transactionHash: hash,
    });
  } catch (error) {
    console.error("Error adding user score:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
