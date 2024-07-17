import { useMemo } from "react";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { getChain } from "@/configs/chainServer";

export function useChainFromPath() {
  const chainId = useChainIdFromPath();
  const chain = useMemo(() => {
    if (!chainId) {
      return undefined;
    }
    return getChain(chainId);
  }, [chainId]);

  return chain;
}
