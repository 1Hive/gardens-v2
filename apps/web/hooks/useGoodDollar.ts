import { useEffect, useMemo, useState } from "react";
// eslint-disable-next-line import/no-extraneous-dependencies
import { IdentitySDK } from "@goodsdks/citizen-sdk";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { celo } from "viem/chains";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
type Props = {
  enabled?: boolean;
};
export const useGoodDollarSdk = ({ enabled }: Props) => {
  const [isWalletVerified, setIsWalletVerified] = useState<boolean>();
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: celo.id });
  const { data: walletClient } = useWalletClient({ chainId: celo.id });
  const identitySDK = useMemo(() => {
    if (!enabled || !address || !walletClient?.account) return;
    const celoPublicClient = createPublicClient({
      chain: celo,

      transport: http("https://forno.celo.org"),
    });
    const celoWalletClient = createWalletClient({
      chain: celo,
      account: walletClient.account,
      transport: custom(celoPublicClient.transport),
    });
    // @ts-ignore
    return new IdentitySDK({
      account: walletClient.account,
      publicClient: celoPublicClient,
      walletClient: celoWalletClient,
      chain: celo,
      env: process.env.NEXT_PUBLIC_CHEAT_GOODDOLLAR_ENV ?? "production",
    });
  }, [enabled, address, publicClient, walletClient]);

  useEffect(() => {
    if (address && identitySDK) {
      identitySDK
        .getWhitelistedRoot(address)
        .then(({ isWhitelisted, root }) => {
          setIsWalletVerified(
            isWhitelisted && root.toLowerCase() === address.toLowerCase(),
          );
        });
    }
  }, [identitySDK, address]);

  return {
    isWalletVerified,
    identitySDK,
  };
};
