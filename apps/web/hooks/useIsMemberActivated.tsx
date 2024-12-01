import { useEffect, useState } from "react";
import { useAccount, Address } from "wagmi";
import { CVStrategy, RegistryCommunity } from "#/subgraph/.graphclient";
import { useViemClient } from "./useViemClient";
import { registryCommunityABI } from "@/src/generated";

export function useIsMemberActivated(
  strategy: Pick<CVStrategy, "id"> & {
    registryCommunity: Pick<RegistryCommunity, "id">;
  },
) {
  const { address } = useAccount();
  const client = useViemClient();

  const [isMemberActived, setIsMemberActived] = useState(false);
  const [errorMemberActivated, setErrorMemberActivated] =
    useState<Error | null>(null);

  useEffect(() => {
    if (!address) {
      return;
    }

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
