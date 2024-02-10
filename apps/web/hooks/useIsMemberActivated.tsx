import { Address } from "#/subgraph/src/scripts/last-addr";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { registryCommunityABI } from "@/src/generated";
import { Strategy } from "@/components/Proposals";
import { useViemClient } from "./useViemClient";

export function useIsMemberActivated(strategy: Strategy) {
  const { address } = useAccount();
  const client = useViemClient();

  const [isMemberActived, setIsMemberActived] = useState(false);
  const [errorMemberActivated, setErrorMemberActivated] =
    useState<Error | null>(null);

  useEffect(() => {
    if (!address) return;

    fetchData();
  }, [address]);

  const fetchData = async () => {
    const strategyAddress = strategy.id as Address;

    try {
      const isMemberActivedData = await client.readContract({
        address: strategy.registryCommunity.id as Address,
        abi: registryCommunityABI,
        functionName: "memberActivatedInStrategies",
        args: [address as Address, strategyAddress],
      });
      if (isMemberActivedData !== undefined) {
        setIsMemberActived(isMemberActivedData);
      }
    } catch (error) {
      setErrorMemberActivated(error as unknown as Error);
    }
  };

  return {
    isMemberActived,
    errorMemberActivated,
  };
}
