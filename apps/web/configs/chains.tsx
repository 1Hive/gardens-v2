import React, { FC } from "react";
import {
  Arbitrum,
  Ethereum,
  Optimism,
  Polygon,
} from "@thirdweb-dev/chain-icons";
import { Address } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  Chain,
  localhost,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";
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

export const chainConfigMap: {
  [key: number | string]: ChainData;
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
    globalTribunal: "0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD",
    allo: "0x",
    arbitrator: "0x",
    passportScorer: "0x",
    isTestnet: true,
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
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0xc5b0c764cf8ab274cb1505a6532f0b16d0660463",
    passportScorer: "0xc137c30ac0f21ce75bb484e88fb8701024f82d25",
    isTestnet: true,
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
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x",
    passportScorer: "0xc137c30ac0f21ce75bb484e88fb8701024f82d25",
    isTestnet: true,
  },
  // 11155420: {
  //   name: optimismSepolia.name,
  //   icon: Optimism,
  //   explorer: "https://optimism-sepolia.blockscout.com",
  //   blockTime: 2,
  //   confirmations: 1, // 2
  //   isTestnet: true,
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
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0xd58ff588177f02cc535a0e235a4c002a17e27202",
    passportScorer: "0x57a9835b204dbcc101dbf981625a3625e8043b9c",
    isTestnet: false,
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
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0xb39dfa15f96055664179e8ecaa890f3fa26c21e9",
    passportScorer: "0x83bde2e2d8acaaad2d300da195df3cf86b234bdd",
    isTestnet: false,
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
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x7842e2d0dda2e64727c251382e9b1ee70fa33b94",
    passportScorer: "0xa71023bc64c9711c2037ab491de80fd74504bd55",
    isTestnet: false,
  },
  // 100: {
  //   name: gnosis.name,
  //   icon: GnosisGno,
  //   explorer: "https://gnosis.blockscout.com",
  //   blockTime: 5.2,
  //   confirmations: 4, // 4
  //   rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_GNOSIS!,
  //   subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_GNOSIS!,
  //   globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
  //   allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
  //   arbitrator: "0xc5b0c764cf8ab274cb1505a6532f0b16d0660463",
  //   passportScorer: "0xc137c30ac0f21ce75bb484e88fb8701024f82d25",
  //   isTestnet: false,
  // },
  // 1: {
  //   name: mainnet.name,
  //   icon: Ethereum,
  //   explorer: "https://eth.blockscout.com",
  //   blockTime: 12,
  //   confirmations: 3, // 3
  //   rpcUrl: process.env.NEXT_PUBLIC_RPC_URL_ETHEREUM!,
  //   subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_ETHEREUM!,
  //   globalTribunal: "0x1b8c7f06f537711a7caf6770051a43b4f3e69a7e",
  //   allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
  //   arbitrator: "0xc5b0c764cf8ab274cb1505a6532f0b16d0660463",
  //   passportScorer: "0xc137c30ac0f21ce75bb484e88fb8701024f82d25",
  //   isTestnet: false,
  // },
};

// export const chainConfigMap: { [key: number | string]: ChainData } = {};

// Fill deployed contract addresses
// Promise.all(
//   chains.map(async (chain) => {
//     const latestContracts = getRunLatestAddrs(chain.id);
//     if (!latestContracts) {
//       throw new Error(`No contract addresses found for chain ${chain.id}`);
//     }
//     const network = networks.find((x) => x.chainId === +chain.id);
//     if (!network) {
//       console.error(`No network found for chain ${chain.id}`);
//     } else {
//       chainConfigMap[chain.id] = {
//         ...chainDataMapWithoutContracts[chain.id],
//         allo: network.ENVS.ALLO_PROXY as Address,
//         passportScorer: latestContracts.proxyPassportScorer as Address,
//         arbitrator: latestContracts.proxySafeArbitrator as Address,
//         isTestnet: network.testnet,
//       };
//     }
//   }),
// ).then(() => console.debug("Contracts addresses loaded"));

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