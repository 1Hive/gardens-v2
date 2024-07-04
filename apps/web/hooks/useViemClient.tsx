import { useEffect, useState } from "react";
import { PublicClient, createPublicClient, http } from "viem";
import useChainFromPath from "./useChainIdFromtPath";

export const useViemClient = function () {
  const chain = useChainFromPath();

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
