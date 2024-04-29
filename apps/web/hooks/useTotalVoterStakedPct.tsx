import { Address } from "#/subgraph/src/scripts/last-addr";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { cvStrategyABI } from "@/src/generated";
import { Strategy } from "@/components/Proposals";
import { useViemClient } from "./useViemClient";
import { PRECISION_SCALE } from "@/utils/numbers";
import { Abi } from "viem";

export function useTotalVoterStakedPct(strategy: Strategy) {
  const { address } = useAccount();
  const client = useViemClient();

  const [voterStake, setVoterStake] = useState<any>(null);

  useEffect(() => {
    if (!address) return;

    fetchData();
  }, [address]);

  const fetchData = async () => {
    const _voterStakeData = await client.readContract({
      address: strategy.id as Address,
      abi: cvStrategyABI as Abi,
      functionName: "getTotalVoterStakePct",
      args: [address as Address],
    });

    setVoterStake((_voterStakeData as unknown as bigint) / PRECISION_SCALE);
  };

  return {
    voterStake,
  };
}
