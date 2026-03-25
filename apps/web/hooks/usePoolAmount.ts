import { Address, useContractRead } from "wagmi";
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
  const { data: poolAmount } = useContractRead({
    abi: cvStrategyABI,
    address: poolAddress as Address,
    chainId: resolvedChainId,
    enabled: !throughBalanceOf && !!poolAddress && enabled,
    functionName: "getPoolAmount",
    watch,
  });
  return poolAmount;
};
