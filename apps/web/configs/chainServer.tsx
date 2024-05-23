import React, { FC } from "react";
import {
  Arbitrum,
  GnosisGno,
  Ethereum,
  Optimism,
} from "@thirdweb-dev/chain-icons";
import {
  Chain,
  localhost,
  arbitrumSepolia,
  arbitrum,
  mainnet,
  sepolia,
  optimism,
  optimismSepolia,
  gnosis,
} from "viem/chains";

type ChainIconProps = React.SVGProps<SVGSVGElement> & {
  chain: number | string;
};

export const chains: Chain[] = [
  localhost,
  arbitrumSepolia,
  arbitrum,
  mainnet,
  sepolia,
  optimism,
  optimismSepolia,
  gnosis,
];

export const chainIdToIconMap: { [key: number]: FC } = {
  1337: Ethereum,
  421614: Arbitrum,
  42161: Arbitrum,
  1: Ethereum,
  11155111: Ethereum,
  10: Optimism,
  11155420: Optimism,
  100: GnosisGno,
};

export function getChain(chainId: number | string): Chain | undefined {
  return chains.find((chain) => chain.id === Number(chainId));
}

export const ChainIcon: FC<ChainIconProps> = ({ chain, ...props }) => {
  const numericChainId = Number(chain);
  const IconComponent = chainIdToIconMap[numericChainId];
  return IconComponent ? <IconComponent {...props} /> : null;
};
