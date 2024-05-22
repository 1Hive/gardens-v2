import {
  localhost,
  arbitrumSepolia,
  arbitrum,
  mainnet,
  sepolia,
  Chain,
  optimism,
  optimismSepolia,
  gnosis,
} from "viem/chains";

export const chains = [
  localhost,
  arbitrumSepolia,
  arbitrum,
  mainnet,
  sepolia,
  optimism,
  optimismSepolia,
  gnosis,
];

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
