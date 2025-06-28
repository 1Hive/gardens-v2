import { Address, useContractRead } from "wagmi";
import { cvStrategyABI } from "@/src/generated";

export const usePoolAmount = ({
  poolAddress,
  watch,
}: {
  poolAddress: string | undefined;
  watch?: boolean;
}) => {
  const { data: poolAmount } = useContractRead({
    abi: cvStrategyABI,
    address: poolAddress as Address,
    enabled: !!poolAddress,
    functionName: "getPoolAmount",
    watch,
  });
  return poolAmount;
};
