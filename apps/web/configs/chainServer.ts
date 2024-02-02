import { localhost, arbitrumSepolia, arbitrum, Chain } from "viem/chains";
export const chains = [arbitrum, arbitrumSepolia, localhost];

export function getChain(chainId: number | string): Chain | undefined {
  let chainResult: Chain = arbitrumSepolia;
  if (typeof chainId === "string") {
    chainId = parseInt(chainId);
  }
  const found = chains.find((chain) => chain.id === chainId);
  if (found) {
    chainResult = found;
  }
  console.log(chainResult);
  return chainResult;
}
