import { Chain } from "viem";
import * as chains from "viem/chains";
import { ChainId } from "@/types";

export function getViemChain(chainId: ChainId): Chain {
  for (const chain of Object.values(chains)) {
    if ("id" in chain) {
      if (chain.id === chainId) {
        return chain;
      }
    }
  }

  throw new Error(`Chain with id ${chainId} not found`);
}

export const isENS = (address = "") => /.+\.eth$/i.test(address);
