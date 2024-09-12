import { usePathname } from "next/navigation";

export function useChainIdFromPath() {
  const path = usePathname();
  const segment = path?.split("/")[1];
  return segment ? Number(segment) : undefined;
}
