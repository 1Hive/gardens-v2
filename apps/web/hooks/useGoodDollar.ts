import { useEffect, useMemo, useState } from "react";
// eslint-disable-next-line import/no-extraneous-dependencies
import { contractEnv, IdentitySDK } from "@goodsdks/citizen-sdk";
import {
  Address as AddressType,
  createPublicClient,
  createWalletClient,
  custom,
  http,
  zeroAddress,
} from "viem";
import { celo } from "viem/chains";
import { useAccount } from "wagmi";

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

type Props = {
  enabled?: boolean;
};
export const useGoodDollarSdk = ({ enabled }: Props) => {
  const [isWalletVerified, setIsWalletVerified] = useState<boolean>();
  const { address } = useAccount();

  const identitySDK = useMemo(() => {
    if (!enabled || !address) return;

    const celoPublicClient = createPublicClient({
      chain: celo,
      transport: http("https://forno.celo.org"),
    });

    const celoWalletClient = createWalletClient({
      chain: celo,
      account: address as AddressType,
      transport: custom(celoPublicClient.transport),
    });

    return new IdentitySDK({
      account: address as AddressType,
      publicClient: celoPublicClient as any,
      walletClient: celoWalletClient,
      env:
        (process.env.NEXT_PUBLIC_CHEAT_GOODDOLLAR_ENV as contractEnv) ??
        "production",
    });
  }, [enabled, address]);

  useEffect(() => {
    if (!enabled || !address || !identitySDK) {
      setIsWalletVerified(undefined);
      return;
    }

    void fetchIsWalletVerified();
  }, [enabled, identitySDK, address]);

  const fetchIsWalletVerified = () => {
    if (address && identitySDK) {
      return identitySDK
        .getWhitelistedRoot(address)
        .then(({ root, isWhitelisted }) => {
          const isVerified =
            isWhitelisted && root !== zeroAddress && sameAddress(root, address);
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
