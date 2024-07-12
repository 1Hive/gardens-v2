import { useMemo } from "react";
import useChainIdFromPath from "./useChainIdFromPath";
import { getChain } from "@/configs/chainServer";

export default function useChainFromPath() {
  const chainId = useChainIdFromPath();
  const chain = useMemo(() => {
    if (!chainId) {
      return undefined;
    }
    const chain = getChain(chainId);
    return chain;
  }, [chainId]);

  return chain;
}
