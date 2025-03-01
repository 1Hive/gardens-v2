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
  base,
  Chain,
  gnosis,
  localhost,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";
import Subgraph from "../configs/subgraph.json";
import { BaseLogo } from "@/assets/BaseLogo";
import { ChainId } from "@/types";

type ChainIconProps = React.SVGProps<SVGSVGElement> & {
  chain: number | string;
};

export const CHAINS: Chain[] = [
  arbitrumSepolia,
  // optimismSepolia,
  sepolia,
  arbitrum,
  optimism,
  polygon,
  gnosis,
  base,
  // mainnet,
];

if (process.env.NODE_ENV === "development") {
  CHAINS.push(localhost);
}

type ChainData = {
  name: string;
  icon: FC;
  explorer: string;
  blockTime: number;
  confirmations: number;
  rpcUrl: string;
  subgraphUrl: string;
  publishedSubgraphUrl?: string;
  globalTribunal?: Address;
  arbitrator: Address;
  passportScorer: Address;
  allo: Address;
  isTestnet: boolean;
  safePrefix?: string;
};

const SUBGRAPH_TESTNET_VERSION = Subgraph.VERSION_TESTNET;
const SUBGRAPH_PRODNET_VERSION = Subgraph.VERSION_PROD;

const getSubgraphUrls = (
  publishedId: string,
  subgraphSlug: string,
  subgraphVersion: string,
  accountNumber: number = 102093,
) => {
  const versionedEndpoint = `https://api.studio.thegraph.com/query/${accountNumber}/${subgraphSlug}`;
  return {
    publishedSubgraphUrl:
      process.env.NEXT_PUBLIC_SUBGRAPH_KEY ?
        `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_SUBGRAPH_KEY}/subgraphs/id/${publishedId}`
      : undefined,
    subgraphUrl: `${versionedEndpoint}/${subgraphVersion}`,
  };
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
    explorer: "https://sepolia.arbiscan.io/",
    blockTime: 14,
    confirmations: 7,
    rpcUrl: process.env.RPC_URL_ARB_TESTNET!,
    ...getSubgraphUrls(
      "BfZYwhZ1rTb22Nah1u6YyXtUtAdgGNtZhW1EBb4mFzAU",
      "gardens-v2---arbitrum-sepolia",
      SUBGRAPH_TESTNET_VERSION,
      70985,
    ),
    globalTribunal: "0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x05EC011e0d8B4d2add98e1cc4AC7DF38a95EF4Ed",
    passportScorer: "0x2053E225672776deb23Af0A3EBa9CE2c87838a72",
    isTestnet: true,
  },
  // 11155111: {
  //   name: sepolia.name,
  //   icon: Ethereum,
  //   explorer: "https://eth-sepolia.blockscout.com",
  //   blockTime: 12,
  //   confirmations: 1, // 3
  //   rpcUrl: process.env.RPC_URL_ETH_TESTNET!,
  //   subgraphUrl: `${process.env.NEXT_PUBLIC_SUBGRAPH_URL_ETH_SEP?.replace("/version/latest", "")}/${SUBGRAPH_TESTNET_VERSION}`,
  //   globalTribunal: "0xc6Eaf449f79B081300F5317122B2Dff3f039ad0b",
  //   allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
  //   arbitrator: "0x",
  //   passportScorer: "0xc137c30ac0f21ce75bb484e88fb8701024f82d25",
  //   isTestnet: true,
  // },
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
    blockTime: 14,
    confirmations: 2, // 7
    rpcUrl: process.env.RPC_URL_ARBITRUM!,
    ...getSubgraphUrls(
      "9ejruFicuLT6hfuXNTnS8UCwxTWrHz4uinesdZu1dKmk",
      "gardens-v2---arbitrum",
      SUBGRAPH_PRODNET_VERSION,
    ),
    globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x10B469b23a47BC557daB81743af8A97Ef9e9f833",
    passportScorer: "0x8cd4bA4ad10d85A550fe45d567a49E49e1D23CE1",
    isTestnet: false,
    safePrefix: "arb1",
  },
  10: {
    name: optimism.name,
    icon: Optimism,
    explorer: "https://optimism.blockscout.com",
    blockTime: 14,
    confirmations: 2, // 2
    rpcUrl: process.env.RPC_URL_OPTIMISM!,
    ...getSubgraphUrls(
      "FmcVWeR9xdJyjM53DPuCvEdH24fSXARdq4K5K8EZRZVp",
      "gardens-v2---optimism",
      SUBGRAPH_PRODNET_VERSION,
    ),
    globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x01b415E97310611EF5fea5c0b43470F6217456aA",
    passportScorer: "0x084a5504dCFeac0ec3E10517247639e50c8DcFFd",
    isTestnet: false,
    safePrefix: "oeth",
  },
  137: {
    name: polygon.name,
    icon: Polygon,
    explorer: "https://polygon.blockscout.com",
    blockTime: 2.1,
    confirmations: 2, // 4
    rpcUrl: process.env.RPC_URL_MATIC!,
    ...getSubgraphUrls(
      "4vsznmRkUGm9DZFBwvC6PDvGPVfVLQcUUr5ExdTNZiUc",
      "gardens-v2---polygon",
      SUBGRAPH_PRODNET_VERSION,
    ),
    globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x8cb85C8FF0be6802AF7aE7462A44cD2a4103688e",
    passportScorer: "0x190Fa730E6FfC64Ebd0031bE59b3007cC9eE2bB3",
    isTestnet: false,
    safePrefix: "matic",
  },
  100: {
    name: gnosis.name,
    icon: GnosisGno,
    explorer: "https://gnosis.blockscout.com",
    blockTime: 5.2,
    confirmations: 2, // 4
    rpcUrl: process.env.RPC_URL_GNOSIS!,
    ...getSubgraphUrls(
      "ELGHrYhvJJQrYkVsYWS5iDuFpQ1p834Q2k2kBmUAVZAi",
      "gardens-v2---gnosis",
      SUBGRAPH_PRODNET_VERSION,
    ),
    globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x7dd4020A2344A9e039092F12e46ba4F1EF1e3c91",
    passportScorer: "0x20965C5C8a021ac6fFeD5dE7A402f7CEaC3b0A82",
    isTestnet: false,
    safePrefix: "gno",
  },
  8453: {
    name: base.name,
    icon: BaseLogo,
    explorer: "https://base.blockscout.com",
    blockTime: 2,
    confirmations: 2, // 4
    rpcUrl: process.env.RPC_URL_BASE!,
    ...getSubgraphUrls(
      "HAjsxiYJEkV8oDZgVTaJE9NQ2XzgqekFbY99tMGu53eJ",
      "gardens-v2---base",
      SUBGRAPH_PRODNET_VERSION,
    ),
    globalTribunal: "0x9a17De1f0caD0c592F656410997E4B685d339029",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x83bDE2E2D8AcAAad2D300DA195dF3cf86b234bdd",
    passportScorer: "0xb39dFA15F96055664179e8EcaA890f3FA26c21e9",
    isTestnet: false,
    safePrefix: "base",
  },
  // 1: {
  //   name: mainnet.name,
  //   icon: Ethereum,
  //   explorer: "https://eth.blockscout.com",
  //   blockTime: 12,
  //   confirmations: 3, // 3
  //   rpcUrl: process.env.RPC_URL_ETHEREUM!,
  //   subgraphUrl: `${process.env.NEXT_PUBLIC_SUBGRAPH_URL_ETHEREUM?.replace("/version/latest", "")}/${SUBGRAPH_PRODNET_VERSION}`,
  //   globalTribunal: "0x",
  //   allo: "0x",
  //   arbitrator: "0x",
  //   passportScorer: "0x",
  //   isTestnet: false,
  // },
};

console.debug("ChainConfigMap", chainConfigMap);

export function getConfigByChain(chainId: ChainId): ChainData | undefined {
  if (chainId in chainConfigMap) {
    return chainConfigMap[chainId];
  } else {
    return undefined;
  }
}

export function getChain(chainId: ChainId): Chain | undefined {
  return CHAINS.find((chain) => chain.id == chainId);
}

export const ChainIcon: FC<ChainIconProps> = ({ chain, ...props }) => {
  const numericChainId = Number(chain);
  const IconComponent = chainConfigMap[numericChainId]?.icon;
  return IconComponent ? <IconComponent {...props} /> : null;
};
