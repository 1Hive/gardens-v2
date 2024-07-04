import { usePathname } from "next/navigation";

export default function useChainIdFromPath() {
  const path = usePathname();
  return Number(path?.split("/")[2]);
}
