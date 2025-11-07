/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { useMemo } from "react";
import { Address, isAddress } from "viem";
import { useNetwork, useToken } from "wagmi";

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
  const { chain } = useNetwork();

  // Prepare the address for validation
  const validAddress =
    !address || !isAddress(address) ? undefined : (address as Address);

  // Use wagmi's useToken hook
  const { data, isLoading, error, refetch } = useToken({
    address: validAddress,
    enabled: !!validAddress && enabled && !!chain?.id,
    chainId: chainId || chain?.id,
  });

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
