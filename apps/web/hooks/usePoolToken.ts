import { zeroAddress } from "viem";
import { Address, useToken } from "wagmi";
import { usePoolAmount } from "./usePoolAmount";

export const usePoolToken = ({
  poolAddress,
  poolTokenAddr,
  enabled = true,
  watch,
}: {
  poolAddress: string | undefined;
  poolTokenAddr: string | undefined;
  enabled?: boolean;
  watch?: boolean;
}) => {
  const poolAmount = usePoolAmount({
    poolAddress,
    enabled,
    watch,
  });

  const { data: poolToken } = useToken({
    address: poolTokenAddr as Address,
    enabled: enabled && poolTokenAddr !== zeroAddress,
  });

  return poolAmount && poolToken ?
      {
        address: poolTokenAddr as Address,
        symbol: poolToken.symbol,
        decimals: poolToken.decimals,
        balance: poolAmount,
        formatted: (poolAmount / 10n ** BigInt(poolToken.decimals)).toString(),
      }
    : undefined;
};
