import { useEffect, useState } from "react";
import { PublicClient, createPublicClient, http } from "viem";
import { useChainId } from "wagmi";
import { getChain } from "@/configs/chainServer";
import useChainFromPath from "./useChainFromPath";

export const useViemClient = function () {
  const chainFromPath = useChainFromPath();
  const chainId = useChainId();
  const chain = chainFromPath ?? getChain(chainId);
  
  const [viemClient, setViemClient] = useState<PublicClient>(
    createPublicClient({
      chain,
      transport: http(),
    }),
  );

  useEffect(() => {
    setViemClient(
      createPublicClient({
        chain,
        transport: http(),
      }),
    );
  }, [chain]);

  return viemClient;
};
