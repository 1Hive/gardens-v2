// eslint-disable-next-line import/no-extraneous-dependencies
import { IdentitySDK } from "@goodsdks/citizen-sdk";
import { createPublicClient, http, createWalletClient, custom } from "viem";
import { Address as AddressType } from "viem";
import { celo } from "viem/chains";

export async function fetchGooddollarWhitelisted(
  account: string,
): Promise<boolean> {
  const celoPublicClient = createPublicClient({
    chain: celo,
    transport: http("https://forno.celo.org"),
  });

  const celoWalletClient = createWalletClient({
    chain: celo,
    transport: custom(celoPublicClient.transport),
  });

  const celoIdentitySDK = new IdentitySDK(
    celoPublicClient as any,
    celoWalletClient as any,
    "production",
  );
  const { isWhitelisted } = await celoIdentitySDK!.getWhitelistedRoot(
    account as AddressType,
  );
  return isWhitelisted;
}
