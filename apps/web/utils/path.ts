import { ChainId } from "@/types";
import { usePathname } from "next/navigation";

export function getChainIdFromPath(): ChainId {
  const path = usePathname();
  return Number(path?.split("/")[2]);
}
