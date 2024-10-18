import { useMemo } from "react";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { chainConfigMap, getChain } from "@/configs/chains";

export function useChainFromPath() {
  const chainId = useChainIdFromPath();
  const chain = useMemo(() => {
    if (!chainId) {
      return undefined;
    }
    return { ...getChain(chainId), ...chainConfigMap[chainId] };
  }, [chainId]);

  return chain;
}
