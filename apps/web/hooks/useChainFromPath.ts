import { useMemo } from "react";
import { getChain } from "@/configs/chainServer";
import useChainIdFromPath from "./useChainIdFromPath";

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
