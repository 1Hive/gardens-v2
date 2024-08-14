import React, { FC } from "react";
import {
  Arbitrum,
  Ethereum,
  GnosisGno,
  Optimism,
  Polygon,
} from "@thirdweb-dev/chain-icons";
import {
  arbitrum,
  arbitrumSepolia,
  Chain,
  gnosis,
  localhost,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
  polygon,
} from "viem/chains";
import { ChainId } from "@/types";

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

export const chainDataMap: {
  [key: number | string]: {
    name: string;
    icon: FC;
    explorer: string;
    blockTime: number;
    confirmations: number;
    arbitrator?: string;
    sybilScorer?: string;
  };
} = {
  1337: {
    name: localhost.name,
    icon: Ethereum,
    explorer: "",
    blockTime: 0.23,
    confirmations: 1,
  },
  421614: {
    name: arbitrumSepolia.name,
    icon: Arbitrum,
    explorer: "https://sepolia-explorer.arbitrum.io",
    blockTime: 0.23,
    confirmations: 1, // 7
  },
  42161: {
    name: arbitrum.name,
    icon: Arbitrum,
    explorer: "https://arbitrum.blockscout.com",
    blockTime: 0.23,
    confirmations: 1, // 7
  },
  1: {
    name: mainnet.name,
    icon: Ethereum,
    explorer: "https://eth.blockscout.com",
    blockTime: 12,
    confirmations: 1, // 3
  },
  11155111: {
    name: sepolia.name,
    icon: Ethereum,
    explorer: "https://eth-sepolia.blockscout.com",
    blockTime: 12,
    confirmations: 1, // 3
    arbitrator: "0xbff8a6c13d6536d48dce27186fc3fb503539e5f0",
    sybilScorer: "0x0e3992731e4ba388ccbb6fc92a030f809ebffc23",
  },
  10: {
    name: optimism.name,
    icon: Optimism,
    explorer: "https://optimism.blockscout.com",
    blockTime: 2,
    confirmations: 1, // 2
  },
  11155420: {
    name: optimismSepolia.name,
    icon: Optimism,
    explorer: "https://optimism-sepolia.blockscout.com",
    blockTime: 2,
    confirmations: 1, // 2
  },
  100: {
    name: gnosis.name,
    icon: GnosisGno,
    explorer: "https://gnosis.blockscout.com",
    blockTime: 5.2,
    confirmations: 1, // 4
  },
  137: {
    name: polygon.name,
    icon: Polygon,
    explorer: "https://polygon.blockscout.com",
    blockTime: 2.1,
    confirmations: 1, // 4
  },
};

export function getChain(chainId: ChainId): Chain | undefined {
  return chains.find((chain) => chain.id === Number(chainId));
}

export const ChainIcon: FC<ChainIconProps> = ({ chain, ...props }) => {
  const numericChainId = Number(chain);
  const IconComponent = chainDataMap[numericChainId].icon;
  return IconComponent ? <IconComponent {...props} /> : null;
};
