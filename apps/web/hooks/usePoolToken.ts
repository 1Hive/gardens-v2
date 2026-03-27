import { useEffect, useState } from "react";
import { zeroAddress } from "viem";
import { Address, erc20ABI, useAccount, useChainId } from "wagmi";
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
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const tokenClient = usePreferredReadClient(resolvedChainId);
  const [poolToken, setPoolToken] = useState<
    | {
        name: string;
        symbol: string;
        decimals: number;
      }
    | undefined
  >(undefined);
  const shouldUseWalletClient =
    isConnected &&
    resolvedChainId != null &&
    walletChainId === resolvedChainId;

  const poolAmount = usePoolAmount({
    poolAddress,
    chainId: resolvedChainId,
    enabled: enabled && !!poolAddress && !!poolTokenAddr,
    watch,
  });

  useEffect(() => {
    if (!enabled || !poolTokenAddr || poolTokenAddr === zeroAddress || !tokenClient) {
      setPoolToken(undefined);
      return;
    }

    let cancelled = false;

    const readToken = async () => {
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
        }
      } catch (error) {
        if (!cancelled) {
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

  if (!poolAmount != null && !poolToken && enabled) {
    console.debug("Waiting for", {
      poolAmount,
      poolToken,
    });
    return undefined;
  }

  const balanceInfo = poolToken &&
    poolAmount != null && {
      value: poolAmount,
      formatted: (poolAmount / 10n ** BigInt(poolToken.decimals)).toString(),
    };

  return balanceInfo ?
      {
        address: poolTokenAddr as Address,
        symbol: poolToken.symbol,
        decimals: poolToken.decimals,
        balance: balanceInfo.value,
        formatted: balanceInfo.formatted,
        name: poolToken.name,
      }
    : undefined;
};
