import {
  localhost,
  arbitrumSepolia,
  arbitrum,
  mainnet,
  Chain,
} from "viem/chains";
export const chains = [arbitrumSepolia, arbitrum, localhost];

export function getChain(chainId: number | string): Chain | undefined {
  let chainResult: Chain = arbitrumSepolia;
  if (typeof chainId === "string") {
    chainId = parseInt(chainId);
  }
  const found = chains.find((chain) => chain.id === chainId);
  if (found) {
    chainResult = found;
  }
  return chainResult;
}
