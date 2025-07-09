import React, { FC } from "react";
import {
  Arbitrum,
  GnosisGno,
  Optimism,
  Polygon,
} from "@thirdweb-dev/chain-icons";
import { Address } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  celo,
  Chain,
  gnosis,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";
import Subgraph from "../configs/subgraph.json";
import { BaseLogo } from "@/assets/BaseLogo";
import { CeloLogo } from "@/assets/CeloLogo";
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
  celo,
  // mainnet,
];

// if (process.env.NODE_ENV === "development") {
//   CHAINS.push(localhost);
// }

export type ChainData = {
  id: number;
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
  alchemyApiBaseUrl?: string; // Optional, used for fetching NFTs
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
  // 1337: {
  //   name: localhost.name,
  //   icon: Ethereum,
  //   explorer: "",
  //   blockTime: 0.23,
  //   confirmations: 1,
  //   rpcUrl: "http://127.0.0.1:8545",
  //   subgraphUrl: "http://localhost:8000/subgraphs/name/kamikazebr/gv2",
  //   globalTribunal: "0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD",
  //   allo: "0x",
  //   arbitrator: "0x",
  //   passportScorer: "0x",
  //   isTestnet: true,
  // },
  421614: {
    id: 421614,
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
    arbitrator: "0x49222C53695C77a0F8b78Eb42606B893E98DfE6a",
    passportScorer: "0x2053E225672776deb23Af0A3EBa9CE2c87838a72",
    isTestnet: true,
  },
  // 11155111: {
  //   id: 11155111,
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
    id: 42161,
    name: "Arbitrum",
    icon: Arbitrum,
    explorer: "https://arbiscan.io",
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
    arbitrator: "0x1c62F449058BbeeD546823A1a581D28233f7A69c",
    passportScorer: "0x8cd4bA4ad10d85A550fe45d567a49E49e1D23CE1",
    isTestnet: false,
    safePrefix: "arb1",
  },
  10: {
    id: 10,
    name: "Optimism",
    icon: Optimism,
    explorer: "http://optimistic.etherscan.io",
    blockTime: 2,
    confirmations: 2, // 2
    rpcUrl: process.env.RPC_URL_OPTIMISM!,
    ...getSubgraphUrls(
      "FmcVWeR9xdJyjM53DPuCvEdH24fSXARdq4K5K8EZRZVp",
      "gardens-v2---optimism",
      SUBGRAPH_PRODNET_VERSION,
    ),
    globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0xaf6628d7347fc4D65F1D5C69663C875a00c56d9F",
    passportScorer: "0x084a5504dCFeac0ec3E10517247639e50c8DcFFd",
    isTestnet: false,
    safePrefix: "oeth",
  },
  137: {
    id: 137,
    name: polygon.name,
    icon: Polygon,
    explorer: "https://polygonscan.com",
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
    arbitrator: "0x8D9EAed9D3D23EF30ADAA706c8352c5655AEd814",
    passportScorer: "0x190Fa730E6FfC64Ebd0031bE59b3007cC9eE2bB3",
    isTestnet: false,
    safePrefix: "matic",
  },
  100: {
    id: 100,
    name: gnosis.name,
    icon: GnosisGno,
    explorer: "https://gnosisscan.io",
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
    arbitrator: "0x92bc0af737f55FF7B677cd942Aafd52934Fc751d",
    passportScorer: "0x20965C5C8a021ac6fFeD5dE7A402f7CEaC3b0A82",
    isTestnet: false,
    safePrefix: "gno",
  },
  8453: {
    id: 8453,
    name: base.name,
    icon: BaseLogo,
    explorer: "https://basescan.org",
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
    arbitrator: "0xab98D1D6Ce18e537715126614278d1A4D26bbc7d",
    passportScorer: "0xb39dFA15F96055664179e8EcaA890f3FA26c21e9",
    isTestnet: false,
    safePrefix: "base",
  },
  42220: {
    id: 42220,
    name: celo.name,
    icon: CeloLogo,
    explorer: "https://celoscan.io/",
    blockTime: 3.8,
    confirmations: 4, // 4
    rpcUrl: process.env.RPC_URL_CELO!,
    ...getSubgraphUrls(
      "BsXEnGaXdj3CkGRn95bswGcv2mQX7m8kNq7M7WBxxPx8",
      "gardens-v2---celo",
      SUBGRAPH_PRODNET_VERSION,
    ),
    globalTribunal: "0x9a17De1f0caD0c592F656410997E4B685d339029",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x83bDE2E2D8AcAAad2D300DA195dF3cf86b234bdd",
    passportScorer: "0xb39dfa15f96055664179e8ecaa890f3fa26c21e9",
    isTestnet: false,
    safePrefix: "celo",
  },
  // 1: {
  //   id: 1,
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
