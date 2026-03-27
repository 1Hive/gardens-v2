import { useEffect, useState } from "react";
import { Address } from "wagmi";
import { useAccount, useChainId } from "wagmi";
import { usePreferredReadClient } from "./usePreferredReadClient";
import { useResolvedChainId } from "./useResolvedChainId";
import { cvStrategyABI } from "@/src/generated";

export const usePoolAmount = ({
  poolAddress,
  chainId,
  watch,
  enabled = true,
  throughBalanceOf = false,
}: {
  poolAddress: string | undefined;
  chainId?: number;
  watch?: boolean;
  enabled?: boolean;
  throughBalanceOf?: boolean;
}) => {
  const resolvedChainId = useResolvedChainId(chainId);
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const readClient = usePreferredReadClient(resolvedChainId);
  const [poolAmount, setPoolAmount] = useState<bigint | undefined>(undefined);
  const shouldUseWalletClient =
    isConnected &&
    resolvedChainId != null &&
    walletChainId === resolvedChainId;

  useEffect(() => {
    if (
      throughBalanceOf ||
      !enabled ||
      !poolAddress ||
      resolvedChainId == null ||
      !readClient
    ) {
      setPoolAmount(undefined);
      return;
    }

    let cancelled = false;

    const fetchPoolAmount = async () => {
      try {
        const amount = await readClient.readContract({
          abi: cvStrategyABI,
          address: poolAddress as Address,
          functionName: "getPoolAmount",
        });

        if (!cancelled) {
          setPoolAmount(amount);
        }
      } catch (error) {
        if (!cancelled) {
          setPoolAmount(undefined);
          console.error("Failed to load pool amount", {
            poolAddress,
            resolvedChainId,
            error,
          });
        }
      }
    };

    void fetchPoolAmount();

    if (!watch) {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = window.setInterval(() => {
      void fetchPoolAmount();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    enabled,
    isConnected,
    poolAddress,
    readClient,
    resolvedChainId,
    shouldUseWalletClient,
    throughBalanceOf,
    walletChainId,
    watch,
  ]);

  return poolAmount;
};
