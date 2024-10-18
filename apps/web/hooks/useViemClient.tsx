import { useEffect, useState } from "react";
import { Chain, createPublicClient, http, PublicClient } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { useChainId } from "wagmi";
import { useChainFromPath } from "./useChainFromPath";
import { getChain } from "@/configs/chains";

export const useViemClient = function () {
  const chainFromPath = useChainFromPath() as Chain;
  const chainId = useChainId();
  const chain = chainFromPath ?? getChain(chainId) ?? arbitrumSepolia;

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
