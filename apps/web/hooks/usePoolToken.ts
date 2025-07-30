import { zeroAddress } from "viem";
import { Address, useToken } from "wagmi";
import { usePoolAmount } from "./usePoolAmount";

export const usePoolToken = ({
  poolAddress,
  poolTokenAddr,
  enabled = true,
  watch = false,
}: {
  poolAddress: string | undefined;
  poolTokenAddr: string | undefined;
  enabled?: boolean;
  watch?: boolean;
}) => {
  const poolAmount = usePoolAmount({
    poolAddress,
    enabled: enabled && !!poolAddress && !!poolTokenAddr,
    watch,
  });

  const { data: poolToken } = useToken({
    address: poolTokenAddr as Address,
    enabled: enabled && poolTokenAddr !== zeroAddress,
  });

  if (!poolAmount && !poolToken) {
    console.debug("Waiting for", {
      poolAmount,
      poolToken,
    });
    return undefined;
  }

  const balance = poolToken &&
    poolAmount && {
      value: poolAmount,
      formatted: (poolAmount / 10n ** BigInt(poolToken.decimals)).toString(),
    };

  return balance && !!poolToken ?
      {
        address: poolTokenAddr as Address,
        symbol: poolToken.symbol,
        decimals: poolToken.decimals,
        balance: balance.value,
        formatted: balance.formatted,
        name: poolToken.name,
      }
    : undefined;
};
