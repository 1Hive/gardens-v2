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
import { goodDollarABI } from "@/src/generated";
import { fetchGooddollarWhitelisted } from "@/utils/goodDollar";
import { getViemChain } from "@/utils/web3";

const LIST_MANAGER_PRIVATE_KEY = process.env.LIST_MANAGER_PRIVATE_KEY;
const LOCAL_RPC = "http://127.0.0.1:8545";

export async function POST(req: Request, { params }: Params) {
  const { chain: chainId } = params as { chain: string };
  const { user } = await req.json();
  if (typeof user !== "string") {
    return NextResponse.json(
      {
        error: "User address is required",
      },
      { status: 400 },
    );
  }

  const chain = getViemChain(chainId);
  const chainConfig = getConfigByChain(chainId);

  try {
    const client = createPublicClient({
      chain: chain,
      transport: http(chainConfig?.rpcUrl ?? LOCAL_RPC),
    });

    const walletClient = createWalletClient({
      account: privateKeyToAccount(
        (`${LIST_MANAGER_PRIVATE_KEY}` as Address) || "",
      ),
      chain: chain,
      transport: custom(client.transport),
    });

    const isWhitelisted = await fetchGooddollarWhitelisted(user);

    if (!chainConfig?.goodDollar) {
      console.error("Gooddoll Sybil contract address is missing");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
    if (isWhitelisted) {
      const isAlreadyValid = (await client.readContract({
        abi: goodDollarABI,
        address: chainConfig.goodDollar,
        functionName: "userValidity",
        args: [user as Address],
      })) as boolean;

      if (isAlreadyValid) {
        return NextResponse.json({
          message: "User already validated on Gooddollar Sybil smart contract",
          isValid: true,
        });
      }

      const hash = await walletClient.writeContract({
        abi: goodDollarABI,
        address: chainConfig.goodDollar,
        functionName: "validateUser",
        chain: chain,
        args: [user as Address],
      });

      // Wait for transaction to be mined
      await client.waitForTransactionReceipt({ hash });

      return NextResponse.json({
        message: "Validity set successfully",
        transactionHash: hash,
      });
    }
  } catch (error) {
    console.error("Error validating user", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
