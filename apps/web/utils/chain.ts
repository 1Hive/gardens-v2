import { chainConfigMap } from "@/configs/chains";

export function getChainIdFromPath(url: string) {
  const path = url;
  const segment = path?.split("/")[2];
  return segment ? Number(segment) : undefined;
}

export function getChainFromPath(url: string) {
  const path = url;
  const segment = path?.split("/")[2];
  const chainId = segment ? Number(segment) : undefined;
  if (chainId == null) return undefined;
  return chainConfigMap[chainId];
}
