import { zeroAddress } from "viem";
import { Address, useBalance, useToken } from "wagmi";
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

  const { data: balanceResult } = useBalance({
    address: poolAddress as Address,
    token: poolTokenAddr as Address,
    enabled: enabled && !!poolTokenAddr,
    watch,
  });

  if (!balanceResult) {
    console.debug("Waiting for", {
      balanceResult,
    });
    return undefined;
  }

  if (!poolAmount && !poolToken) {
    console.debug("Waiting for", {
      poolAmount,
      poolToken,
    });
    return undefined;
  }

  return (
    (poolAmount != undefined && !!poolToken) || balanceResult ?
      {
        address: poolTokenAddr as Address,
        symbol: balanceResult?.symbol ?? poolToken!.symbol,
        decimals: balanceResult?.decimals ?? poolToken!.decimals,
        balance: balanceResult?.value ?? poolAmount!,
        formatted:
          balanceResult?.formatted ??
          (poolAmount! / 10n ** BigInt(poolToken!.decimals)).toString(),
        name: poolToken!.name,
      }
    : !poolAmount && poolToken ?
      {
        address: poolTokenAddr as Address,
        symbol: poolToken.symbol,
        decimals: poolToken.decimals,
        balance: 0n,
        formatted: "0",
        name: poolToken.name,
      }
    : undefined
  );
};
