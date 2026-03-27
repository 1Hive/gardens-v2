import { useEffect, useState } from "react";
import { createPublicClient, custom } from "viem";
import { PublicClient, useAccount, useChainId, usePublicClient } from "wagmi";
import { useResolvedChainId } from "./useResolvedChainId";

export function usePreferredReadClient(chainId?: number) {
  const resolvedChainId = useResolvedChainId(chainId);
  const { connector, isConnected, isConnecting, isReconnecting } = useAccount();
  const walletChainId = useChainId();
  const publicClient = usePublicClient({ chainId: resolvedChainId });
  const shouldWaitForWallet = isConnecting || isReconnecting;
  const shouldUseWalletClient =
    isConnected &&
    resolvedChainId != null &&
    walletChainId === resolvedChainId &&
    !!connector;
  const [preferredClient, setPreferredClient] = useState<
    PublicClient | undefined
  >(shouldUseWalletClient ? undefined : publicClient);

  useEffect(() => {
    let cancelled = false;

    if (shouldWaitForWallet) {
      setPreferredClient(undefined);
      return;
    }

    if (!shouldUseWalletClient) {
      setPreferredClient(publicClient);
      return;
    }

    setPreferredClient(undefined);

    const loadProviderClient = async () => {
      try {
        const provider = await (connector as any)?.getProvider?.({
          chainId: resolvedChainId,
        });

        if (cancelled || !provider || resolvedChainId == null) {
          return;
        }

        const nextClient = createPublicClient({
          chain: publicClient.chain,
          transport: custom(provider),
        }) as PublicClient;

        setPreferredClient(nextClient);
      } catch (error) {
        if (!cancelled) {
          if (process.env.NODE_ENV === "development") {
            console.warn("usePreferredReadClient: provider load failed", error);
          }
          setPreferredClient(undefined);
        }
      }
    };

    void loadProviderClient();

    return () => {
      cancelled = true;
    };
  }, [
    connector,
    publicClient,
    resolvedChainId,
    shouldWaitForWallet,
    shouldUseWalletClient,
  ]);

  return preferredClient;
}
