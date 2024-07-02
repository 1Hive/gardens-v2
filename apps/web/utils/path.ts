import { usePathname } from "next/navigation";

export function getChainIdFromPath() {
  const path = usePathname();
  return Number(path?.split("/")[2]);
}
