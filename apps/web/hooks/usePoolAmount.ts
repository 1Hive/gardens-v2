import { Address, useContractRead } from "wagmi";
import { cvStrategyABI } from "@/src/generated";

export const usePoolAmount = ({
  poolAddress,
  watch,
  enabled = true,
  throughBalanceOf = false,
}: {
  poolAddress: string | undefined;
  watch?: boolean;
  enabled?: boolean;
  throughBalanceOf?: boolean;
}) => {
  const { data: poolAmount } = useContractRead({
    abi: cvStrategyABI,
    address: poolAddress as Address,
    enabled: !throughBalanceOf && !!poolAddress && enabled,
    functionName: "getPoolAmount",
    watch,
  });
  return poolAmount;
};
