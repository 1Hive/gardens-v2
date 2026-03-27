/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { useEffect, useMemo, useState } from "react";
import { Address, isAddress } from "viem";
import { erc20ABI } from "wagmi";
import { usePreferredReadClient } from "./usePreferredReadClient";
import { useResolvedChainId } from "./useResolvedChainId";

interface UseERC20ValidationProps {
  address?: Address | string;
  enabled?: boolean;
  chainId?: number;
}

interface TokenData {
  symbol?: string;
  decimals?: number;
}

/**
 * Hook to validate if an address is an ERC20 token and get its data
 * @param address - The token address to validate
 * @param enabled - Whether to enable the validation
 */
export function useERC20Validation({
  address,
  enabled = true,
  chainId,
}: UseERC20ValidationProps) {
  const resolvedChainId = useResolvedChainId(chainId);
  const readClient = usePreferredReadClient(resolvedChainId);
  const [data, setData] = useState<TokenData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Prepare the address for validation
  const validAddress =
    !address || !isAddress(address) ? undefined : (address as Address);

  const canRead = !!validAddress && enabled && !!resolvedChainId && !!readClient;

  const refetch = async () => {
    if (!canRead) {
      setData(undefined);
      setError(null);
      return { data: undefined };
    }

    setIsLoading(true);
    setError(null);

    try {
      const [symbol, decimals] = await Promise.all([
        readClient.readContract({
          address: validAddress,
          abi: erc20ABI,
          functionName: "symbol",
        }),
        readClient.readContract({
          address: validAddress,
          abi: erc20ABI,
          functionName: "decimals",
        }),
      ]);

      const nextData = { symbol, decimals };
      setData(nextData);
      return { data: nextData };
    } catch (readError) {
      setData(undefined);
      setError(readError as Error);
      return { data: undefined };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refetch();
  }, [validAddress, enabled, resolvedChainId, readClient]);

  const tokenData: TokenData = {
    symbol: data?.symbol,
    decimals: data?.decimals,
  };

  return {
    isToken: !!data?.symbol && !!data?.decimals,
    isLoading,
    error,
    tokenData,
    refetch,
  };
}
