import { usePathname } from "next/navigation";

export function useChainIdFromPath() {
  const path = usePathname();
  const segment = path?.split("/")[2];
  if (!segment) {
    return undefined;
  }

  const chainId = Number(segment);
  return Number.isNaN(chainId) ? undefined : chainId;
}
