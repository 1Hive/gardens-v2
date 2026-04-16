import { Chain } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { useChainId } from "wagmi";
import { useChainFromPath } from "./useChainFromPath";
import { usePreferredReadClient } from "./usePreferredReadClient";
import { getChain } from "@/configs/chains";

export const useViemClient = function () {
  const chainFromPath = useChainFromPath() as Chain;
  const chainId = useChainId();
  const chain = chainFromPath ?? getChain(chainId) ?? arbitrumSepolia;
  return usePreferredReadClient(chain.id);
};
