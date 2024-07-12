import { useEffect, useState } from "react";
import { createPublicClient, http, PublicClient } from "viem";
import { useChainId } from "wagmi";
import useChainFromPath from "./useChainFromPath";
import { getChain } from "@/configs/chainServer";

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
