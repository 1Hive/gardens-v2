import { useChainId } from "wagmi";
import { useChainIdFromPath } from "./useChainIdFromPath";

function normalizeChainId(chainId?: number | string) {
  if (typeof chainId === "string") {
    const parsed = Number(chainId);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return chainId;
}

export function useResolvedChainId(explicitChainId?: number | string) {
  const pathChainId = useChainIdFromPath();
  const walletChainId = useChainId();

  return (
    normalizeChainId(explicitChainId) ??
    normalizeChainId(pathChainId) ??
    normalizeChainId(walletChainId)
  );
}
