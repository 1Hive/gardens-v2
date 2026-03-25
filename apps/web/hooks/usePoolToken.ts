import { zeroAddress } from "viem";
import { Address, useToken } from "wagmi";
import { usePoolAmount } from "./usePoolAmount";
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
  const poolAmount = usePoolAmount({
    poolAddress,
    chainId: resolvedChainId,
    enabled: enabled && !!poolAddress && !!poolTokenAddr,
    watch,
  });

  const { data: poolToken } = useToken({
    address: poolTokenAddr as Address,
    chainId: resolvedChainId,
    enabled: enabled && poolTokenAddr !== zeroAddress,
  });

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
