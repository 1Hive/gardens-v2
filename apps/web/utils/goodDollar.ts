// eslint-disable-next-line import/no-extraneous-dependencies
import { contractEnv, IdentitySDK } from "@goodsdks/citizen-sdk";
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  zeroAddress,
} from "viem";
import { Address as AddressType } from "viem";
import { celo } from "viem/chains";
import { getConfigByChain } from "@/configs/chains";

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export type GoodDollarWhitelistStatus = {
  isWhitelisted: boolean;
  root: AddressType;
};

export async function fetchGooddollarWhitelisted(
  account: string,
): Promise<boolean> {
  const { isWhitelisted } = await fetchGooddollarWhitelistStatus(account);
  return isWhitelisted;
}

export async function fetchGooddollarWhitelistStatus(
  account: string,
): Promise<GoodDollarWhitelistStatus> {
  const celoRpc = getConfigByChain("celo")?.rpcUrl;
  const celoPublicClient = createPublicClient({
    chain: celo,
    transport: http(celoRpc),
  });

  const celoWalletClient = createWalletClient({
    chain: celo,
    account: account as AddressType,
    transport: custom(celoPublicClient.transport),
  });

  const celoIdentitySDK = new IdentitySDK({
    publicClient: celoPublicClient as any,
    walletClient: celoWalletClient,
    env:
      (process.env.NEXT_PUBLIC_CHEAT_GOODDOLLAR_ENV as contractEnv) ??
      "production",
  });
  const { root } = await celoIdentitySDK!.getWhitelistedRoot(
    account as AddressType,
  );

  return {
    isWhitelisted: root !== zeroAddress && sameAddress(root, account),
    root,
  };
}
