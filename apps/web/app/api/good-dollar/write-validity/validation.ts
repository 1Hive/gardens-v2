import {
  Address,
  createPublicClient,
  createWalletClient,
  custom,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainConfigMap, getConfigByChain } from "@/configs/chains";
import { goodDollarABI } from "@/src/generated";
import { ChainId } from "@/types";
import { fetchGooddollarWhitelisted } from "@/utils/goodDollar";
import { getViemChain } from "@/utils/web3";

const LOCAL_RPC = "http://127.0.0.1:8545";
const LIST_MANAGER_PRIVATE_KEY = process.env.LIST_MANAGER_PRIVATE_KEY;
const BYPASS_GOOD_DOLLAR_WHITELIST =
  (process.env.GOOD_DOLLAR_BYPASS_WHITELIST ?? "").toLowerCase() === "true";

export type ValidationResult =
  | {
      chainId: string;
      status: "success";
      transactionHash: string;
    }
  | {
      chainId: string;
      status: "already-valid" | "skipped";
      message: string;
    }
  | {
      chainId: string;
      status: "error";
      message: string;
    };

export const getGoodDollarChainIds = (): string[] =>
  Object.values(chainConfigMap)
    .filter((config) => Boolean(config.goodDollar))
    .map((config) => String(config.id));

export const isGoodDollarWhitelisted = async (
  user: string,
): Promise<boolean> => {
  if (BYPASS_GOOD_DOLLAR_WHITELIST) return true;
  return fetchGooddollarWhitelisted(user);
};

export async function validateUserOnChain(
  chainId: ChainId,
  user: string,
  isWhitelisted: boolean,
): Promise<ValidationResult> {
  if (!LIST_MANAGER_PRIVATE_KEY) {
    return {
      chainId: String(chainId),
      status: "error",
      message: "LIST_MANAGER_PRIVATE_KEY is missing",
    };
  }

  const chainConfig = getConfigByChain(chainId);
  if (!chainConfig) {
    return {
      chainId: String(chainId),
      status: "skipped",
      message: "Unsupported chain",
    };
  }

  if (!chainConfig.goodDollar) {
    return {
      chainId: String(chainId),
      status: "skipped",
      message: "GoodDollar contract address missing",
    };
  }

  let chain;
  try {
    chain = getViemChain(chainId);
  } catch (error) {
    return {
      chainId: String(chainId),
      status: "error",
      message: error instanceof Error ? error.message : "Invalid chain",
    };
  }

  if (!isWhitelisted) {
    return {
      chainId: String(chainId),
      status: "skipped",
      message: "User is not whitelisted in GoodDollar",
    };
  }

  try {
    const client = createPublicClient({
      chain,
      transport: http(chainConfig.rpcUrl ?? LOCAL_RPC),
    });

    const walletClient = createWalletClient({
      account: privateKeyToAccount((LIST_MANAGER_PRIVATE_KEY as Address) || ""),
      chain,
      transport: custom(client.transport),
    });

    const isAlreadyValid = (await client.readContract({
      abi: goodDollarABI,
      address: chainConfig.goodDollar,
      functionName: "userValidity",
      args: [user as Address],
    })) as boolean;

    if (isAlreadyValid) {
      return {
        chainId: String(chainId),
        status: "already-valid",
        message: "User already validated on chain",
      };
    }

    const hash = await walletClient.writeContract({
      abi: goodDollarABI,
      address: chainConfig.goodDollar,
      functionName: "validateUser",
      chain,
      args: [user as Address],
    });

    await client.waitForTransactionReceipt({ hash });

    return {
      chainId: String(chainId),
      status: "success",
      transactionHash: hash,
    };
  } catch (error) {
    console.error("[good-dollar] validateUserOnChain error", {
      chainId,
      error,
    });
    return {
      chainId: String(chainId),
      status: "error",
      message: "Validation transaction failed",
    };
  }
}
