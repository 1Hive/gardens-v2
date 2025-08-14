import { useEffect, useState } from "react";
// eslint-disable-next-line import/no-extraneous-dependencies
import { IdentitySDK } from "@goodsdks/citizen-sdk";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { celo } from "viem/chains";
import { useAccount } from "wagmi";
type Props = {
  enabled?: boolean;
};
export const useGoodDollarSdk = ({ enabled }: Props) => {
  const [identitySDK, setIdentitySDK] = useState<IdentitySDK>();
  const [isWalletVerified, setIsWalletVerified] = useState<boolean>();
  const { address } = useAccount();

  useEffect(() => {
    if (!enabled) return;
    const celoPublicClient = createPublicClient({
      chain: celo,
      transport: http("https://forno.celo.org"),
    });

    const celoWalletClient = createWalletClient({
      chain: celo,
      transport: custom(celoPublicClient.transport),
    });

    setIdentitySDK(
      new IdentitySDK(
        celoPublicClient as any,
        celoWalletClient as any,
        "production",
      ),
    );
  }, []);

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
    verificationLink,
    identitySDK,
  };
};
