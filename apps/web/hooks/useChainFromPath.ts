import { useMemo } from "react";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { chainDataMap, getChain } from "@/configs/chainServer";

export function useChainFromPath() {
  const chainId = useChainIdFromPath();
  const chain = useMemo(() => {
    if (!chainId) {
      return undefined;
    }
    return { ...getChain(chainId), ...chainDataMap[chainId] };
  }, [chainId]);

  return chain;
}
