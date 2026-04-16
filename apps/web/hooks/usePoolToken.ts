import { useEffect, useState } from "react";
import { zeroAddress } from "viem";
import { Address, erc20ABI } from "wagmi";
import { usePoolAmount } from "./usePoolAmount";
import { usePreferredReadClient } from "./usePreferredReadClient";
import { useResolvedChainId } from "./useResolvedChainId";

export const usePoolToken = ({
  poolAddress,
  poolTokenAddr,
  chainId,
  enabled = true,
  watch = false,
}: {
  poolAddress: string | undefined;
  poolTokenAddr: string | undefined;
  chainId?: number;
  enabled?: boolean;
  watch?: boolean;
}) => {
  const resolvedChainId = useResolvedChainId(chainId);
  const tokenClient = usePreferredReadClient(resolvedChainId);
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  const [poolToken, setPoolToken] = useState<
    | {
        name: string;
        symbol: string;
        decimals: number;
      }
    | undefined
  >(undefined);

  const poolAmount = usePoolAmount({
    poolAddress,
    chainId: resolvedChainId,
    enabled: enabled && !!poolAddress && !!poolTokenAddr,
    watch,
  });

  useEffect(() => {
    if (
      !enabled ||
      !poolTokenAddr ||
      poolTokenAddr === zeroAddress ||
      !tokenClient
    ) {
      setIsTokenLoading(false);
      setPoolToken(undefined);
      return;
    }

    let cancelled = false;

    const readToken = async () => {
      if (!cancelled) {
        setIsTokenLoading(true);
      }
      try {
        const [name, symbol, decimals] = await Promise.all([
          tokenClient.readContract({
            address: poolTokenAddr as Address,
            abi: erc20ABI,
            functionName: "name",
          }),
          tokenClient.readContract({
            address: poolTokenAddr as Address,
            abi: erc20ABI,
            functionName: "symbol",
          }),
          tokenClient.readContract({
            address: poolTokenAddr as Address,
            abi: erc20ABI,
            functionName: "decimals",
          }),
        ]);

        if (!cancelled) {
          setPoolToken({
            name,
            symbol,
            decimals,
          });
          setIsTokenLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setIsTokenLoading(false);
          setPoolToken(undefined);
          console.error("Failed to load pool token metadata", {
            poolTokenAddr,
            resolvedChainId,
            error,
          });
        }
      }
    };

    void readToken();

    return () => {
      cancelled = true;
    };
  }, [enabled, poolTokenAddr, resolvedChainId, tokenClient]);

  if (poolToken == null || poolAmount == null) {
    return {
      poolToken: undefined,
      isLoading: enabled && (isTokenLoading || poolAmount == null),
    };
  }

  return {
    poolToken: {
      address: poolTokenAddr as Address,
      symbol: poolToken.symbol,
      decimals: poolToken.decimals,
      balance: poolAmount,
      formatted: (poolAmount / 10n ** BigInt(poolToken.decimals)).toString(),
      name: poolToken.name,
    },
    isLoading: false,
  };
};
