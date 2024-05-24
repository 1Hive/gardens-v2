import { getChain } from "@/configs/chainServer";
import { useEffect, useState } from "react";
import { PublicClient, createPublicClient, http } from "viem";
import { useAccount, useChainId } from "wagmi";

export const useViemClient = function () {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  let chain: number | string = "";

  // if (isConnected)
  chain = chainId;

  const chainObj = getChain(chain);

  const [viemClient, setViemClient] = useState<PublicClient>(
    createPublicClient({
      chain: chainObj,
      transport: http(),
    }),
  );

  useEffect(() => {
    setViemClient(
      createPublicClient({
        chain: chainObj,
        transport: http(),
      }),
    );
  }, [chainId]);

  return viemClient;
};
