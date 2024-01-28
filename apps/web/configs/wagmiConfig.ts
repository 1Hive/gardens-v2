"use client";
import { configureChains } from "wagmi";
// import type { Chain } from "viem";
import { arbitrum, localhost, arbitrumSepolia } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";

export const { chains, publicClient } = configureChains(
  [arbitrum, arbitrumSepolia, localhost],
  [publicProvider()],
);

// export function getChain(chainId: number | string): Chain | undefined {
//   let chainResult = undefined;
//   if (typeof chainId === "string") {
//     chainId = parseInt(chainId);
//   }
//   chainResult = chains.find(chain => chain.id === chainId);
//   return chainResult;
// }
