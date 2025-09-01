import { useEffect, useMemo, useState } from "react";
// eslint-disable-next-line import/no-extraneous-dependencies
import { contractEnv, IdentitySDK } from "@goodsdks/citizen-sdk";
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
      account: walletClient.account.address,
      transport: custom(celoPublicClient.transport),
    });

    return new IdentitySDK({
      account: walletClient.account.address,
      publicClient: celoPublicClient as any,
      walletClient: celoWalletClient,
      env:
        (process.env.NEXT_PUBLIC_CHEAT_GOODDOLLAR_ENV as contractEnv) ??
        "production",
    });
  }, [enabled, address, publicClient, walletClient]);

  useEffect(() => {
    fetchIsWalletVerified();
  }, [identitySDK, address]);

  const fetchIsWalletVerified = () => {
    if (address && identitySDK) {
      return identitySDK
        .getWhitelistedRoot(address)
        .then(({ isWhitelisted, root }) => {
          const isVerified =
            isWhitelisted && root.toLowerCase() === address.toLowerCase();
          setIsWalletVerified(isVerified);
          return isVerified;
        });
    }
  };

  return {
    isWalletVerified,
    identitySDK,
    refetch: fetchIsWalletVerified,
  };
};
