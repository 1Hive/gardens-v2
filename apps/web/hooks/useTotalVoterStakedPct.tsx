import { useEffect, useState } from "react";
import { Abi, Address } from "viem";
import { useAccount } from "wagmi";
import { CVStrategy } from "#/subgraph/.graphclient";
import { useViemClient } from "./useViemClient";
import { cvStrategyABI } from "@/src/generated";
import { SCALE_PRECISION } from "@/utils/numbers";

export function useTotalVoterStakedPct(strategy: CVStrategy) {
  const { address } = useAccount();
  const client = useViemClient();

  const [voterStake, setVoterStake] = useState<any>(null);

  useEffect(() => {
    if (!address) {
      return;
    }

    fetchData();
  }, [address]);

  const fetchData = async () => {
    const voterStakeData = await client.readContract({
      address: strategy.id as Address,
      abi: cvStrategyABI as Abi,
      functionName: "getTotalVoterStakePct",
      args: [address as Address],
    });

    setVoterStake(
      (voterStakeData as unknown as bigint) / BigInt(SCALE_PRECISION),
    );
  };

  return {
    voterStake,
  };
}
