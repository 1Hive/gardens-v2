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

export const chainIdMap: {
  [key: number]: { name: string; icon: FC; explorer: string };
} = {
  1337: { name: localhost.name, icon: Ethereum, explorer: "" },
  421614: {
    name: arbitrumSepolia.name,
    icon: Arbitrum,
    explorer: "https://sepolia.arbiscan.io/address/",
  },
  42161: {
    name: arbitrum.name,
    icon: Arbitrum,
    explorer: "https://arbiscan.io/address/",
  },
  1: {
    name: mainnet.name,
    icon: Ethereum,
    explorer: "https://etherscan.io/address/",
  },
  11155111: {
    name: sepolia.name,
    icon: Ethereum,
    explorer: "https://sepolia.etherscan.io/address/",
  },
  10: {
    name: optimism.name,
    icon: Optimism,
    explorer: "https://optimistic.etherscan.io/address/",
  },
  11155420: {
    name: optimismSepolia.name,
    icon: Optimism,
    explorer: "https://sepolia-optimism.etherscan.io/address/",
  },
  100: {
    name: gnosis.name,
    icon: GnosisGno,
    explorer: "https://gnosisscan.io/address/",
  },
};

export function getChain(chainId: number | string): Chain | undefined {
  return chains.find((chain) => chain.id === Number(chainId));
}

export const ChainIcon: FC<ChainIconProps> = ({ chain, ...props }) => {
  const numericChainId = Number(chain);
  const IconComponent = chainIdMap[numericChainId].icon;
  return IconComponent ? <IconComponent {...props} /> : null;
};
