import React, { FC } from "react";
import {
  Arbitrum,
  Ethereum,
  GnosisGno,
  Optimism,
  Polygon,
} from "@thirdweb-dev/chain-icons";
import { Address } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  Chain,
  gnosis,
  localhost,
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  sepolia,
} from "viem/chains";
import { getRunLatestAddrs } from "#/subgraph/src/scripts/last-addr.cjs";
import { networks } from "../../../pkg/contracts/config/networks.json";
import { ChainId } from "@/types";

type ChainIconProps = React.SVGProps<SVGSVGElement> & {
  chain: number | string;
};

export const isProd = process.env.NEXT_PUBLIC_ENV_GARDENS === "prod";

export const chains: Chain[] = [
  arbitrumSepolia,
  // optimismSepolia,
  sepolia,

  arbitrum,
  polygon,
  // mainnet,
  optimism,
  // gnosis,
];

if (process.env.NODE_ENV === "development") {
  chains.push(localhost);
}

type ChainData = {
  name: string;
  icon: FC;
  explorer: string;
  blockTime: number;
  confirmations: number;
  rpcUrl: string;
  subgraphUrl: string;
  globalTribunal?: Address;

  arbitrator: Address;
  passportScorer: Address;
  allo: Address;
  isTestnet: boolean;
};

const chainDataMapWithoutContracts: {
  [key: number | string]: Omit<
    ChainData,
    "allo" | "passportScorer" | "arbitrator" | "isTestnet"
  >;
} = {
  // Testnets
  1337: {
    name: localhost.name,
    icon: Ethereum,
    explorer: "",
    blockTime: 0.23,
    confirmations: 1,
    rpcUrl: "http://127.0.0.1:8545",
    subgraphUrl: "http://localhost:8000/subgraphs/name/kamikazebr/gv2",
  },
  421614: {
    name: arbitrumSepolia.name,
    icon: Arbitrum,
    explorer: "https://sepolia-explorer.arbitrum.io",
    blockTime: 0.23,
    confirmations: 7,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_ARB_TESTNET!,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_ARB_SEP!,
    globalTribunal: "0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD",
  },
  11155111: {
    name: sepolia.name,
    icon: Ethereum,
    explorer: "https://eth-sepolia.blockscout.com",
    blockTime: 12,
    confirmations: 1, // 3
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_ETH_TESTNET!,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_ETH_SEP!,
    globalTribunal: "0xc6Eaf449f79B081300F5317122B2Dff3f039ad0b",
  },
  // 11155420: {
  //   name: optimismSepolia.name,
  //   icon: Optimism,
  //   explorer: "https://optimism-sepolia.blockscout.com",
  //   blockTime: 2,
  //   confirmations: 1, // 2
  // },

  // Prodnets
  42161: {
    name: arbitrum.name,
    icon: Arbitrum,
    explorer: "https://arbitrum.blockscout.com",
    blockTime: 0.25,
    confirmations: 7, // 7
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM!,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_ARBITRUM!,
    globalTribunal: "0x1b8c7f06f537711a7caf6770051a43b4f3e69a7e",
  },
  1: {
    name: mainnet.name,
    icon: Ethereum,
    explorer: "https://eth.blockscout.com",
    blockTime: 12,
    confirmations: 3, // 3
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_ETHEREUM!,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_ETHEREUM!,
    globalTribunal: "0x1b8c7f06f537711a7caf6770051a43b4f3e69a7e",
  },
  10: {
    name: optimism.name,
    icon: Optimism,
    explorer: "https://optimism.blockscout.com",
    blockTime: 2,
    confirmations: 2, // 2
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_OPTIMISM!,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_OPTIMISM!,
    globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
  },
  100: {
    name: gnosis.name,
    icon: GnosisGno,
    explorer: "https://gnosis.blockscout.com",
    blockTime: 5.2,
    confirmations: 4, // 4
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_GNOSIS!,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_GNOSIS!,
    globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
  },
  137: {
    name: polygon.name,
    icon: Polygon,
    explorer: "https://polygon.blockscout.com",
    blockTime: 2.1,
    confirmations: 4, // 4
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_MATIC!,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_MATIC!,
    globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
  },
};

export const chainConfigMap: { [key: number | string]: ChainData } = {};

// Fill deployed contract addresses
Promise.all(
  chains.map(async (chain) => {
    const latestContracts = getRunLatestAddrs(chain.id);
    if (!latestContracts) {
      throw new Error(`No contract addresses found for chain ${chain.id}`);
    }
    const network = networks.find((x) => x.chainId === +chain.id);
    if (!network) {
      console.error(`No network found for chain ${chain.id}`);
    } else {
      chainConfigMap[chain.id] = {
        ...chainDataMapWithoutContracts[chain.id],
        allo: network.ENVS.ALLO_PROXY as Address,
        passportScorer: latestContracts.proxyPassportScorer as Address,
        arbitrator: latestContracts.proxySafeArbitrator as Address,
        isTestnet: network.testnet,
      };
    }
  }),
).then(() => console.debug("Contracts addresses loaded"));

export function getConfigByChain(chainId: ChainId): ChainData | undefined {
  if (chainId in chainConfigMap) {
    return chainConfigMap[chainId];
  } else {
    return undefined;
  }
}

export function getChain(chainId: ChainId): Chain | undefined {
  return chains.find((chain) => chain.id === chainId);
}

export const ChainIcon: FC<ChainIconProps> = ({ chain, ...props }) => {
  const numericChainId = Number(chain);
  const IconComponent = chainConfigMap[numericChainId].icon;
  return IconComponent ? <IconComponent {...props} /> : null;
};
