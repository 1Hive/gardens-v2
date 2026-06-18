import { useEffect, useMemo, useState } from "react";
import { createPublicClient, custom } from "viem";
import { PublicClient, useAccount, useChainId } from "wagmi";
import { useResolvedChainId } from "./useResolvedChainId";
import { getEnvPublicClient } from "@/utils/publicClient";

export function usePreferredReadClient(chainId?: number) {
  const resolvedChainId = useResolvedChainId(chainId);
  const { connector, isConnected, isConnecting, isReconnecting } = useAccount();
  const walletChainId = useChainId();
  const envClient = useMemo(
    () => getEnvPublicClient(resolvedChainId),
    [resolvedChainId],
  );
  const shouldWaitForWallet = isConnecting || isReconnecting;
  const shouldUseWalletClient =
    isConnected &&
    resolvedChainId != null &&
    walletChainId === resolvedChainId &&
    !!connector &&
    connector.id !== "walletConnect" &&
    connector.id !== "mock";
  const [preferredClient, setPreferredClient] = useState<PublicClient>(envClient);

  useEffect(() => {
    let cancelled = false;

    if (shouldWaitForWallet) {
      setPreferredClient(envClient);
      return;
    }

    if (!shouldUseWalletClient) {
      setPreferredClient(envClient);
      return;
    }

    setPreferredClient(envClient);

    const loadProviderClient = async () => {
      try {
        const provider = await (connector as any)?.getProvider?.({
          chainId: resolvedChainId,
        });

        if (cancelled || !provider || resolvedChainId == null) {
          return;
        }

        const nextClient = createPublicClient({
          chain: envClient.chain,
          transport: custom(provider),
        }) as PublicClient;

        setPreferredClient(nextClient);
      } catch (error) {
        if (!cancelled) {
          if (process.env.NODE_ENV === "development") {
            console.warn("usePreferredReadClient: provider load failed", error);
          }
          setPreferredClient(envClient);
        }
      }
    };

    void loadProviderClient();

    return () => {
      cancelled = true;
    };
  }, [
    connector,
    envClient,
    resolvedChainId,
    shouldWaitForWallet,
    shouldUseWalletClient,
  ]);

  return preferredClient;
}
