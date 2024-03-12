import { usePathname } from "next/navigation";

export function getChainIdFromPath(): number {
    const path = usePathname();
    return Number(path.split("/")[2]);

}
