import { useEffect, useState } from "react";
import { Abi } from "viem";
import { useAccount } from "wagmi";
import { useViemClient } from "./useViemClient";
import { CVStrategy } from "#/subgraph/.graphclient";
import { cvStrategyABI } from "@/src/generated";
import { SCALE_PRECISION } from "@/utils/numbers";
import { Address } from "#/subgraph/src/scripts/last-addr";

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
    const _voterStakeData = await client.readContract({
      address: strategy.id as Address,
      abi: cvStrategyABI as Abi,
      functionName: "getTotalVoterStakePct",
      args: [address as Address],
    });

    setVoterStake(
      (_voterStakeData as unknown as bigint) / BigInt(SCALE_PRECISION),
    );
  };

  return {
    voterStake,
  };
}
