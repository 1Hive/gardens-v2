import { getChain } from "@/configs/chainServer";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Chain } from "viem";

export default function useChainFromPath() {
  const path = usePathname();
  const computeChain = () => {
    const chainId = Number(path?.split("/")[2]);
    const chain = getChain(chainId);
    if (!chain) {
      throw new Error(`Chain with id ${chainId} not found`);
    }
    setChain(chain);
    return chain;
  };
  const [chain, setChain] = useState<Chain>(computeChain());

  useEffect(() => {
    computeChain();
  }, [path]);

  return chain;
}
