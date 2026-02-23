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
  base,
  celo,
  Chain,
  gnosis,
  optimism,
  optimismSepolia,
  polygon,
  sepolia,
} from "viem/chains";
import Subgraph from "../configs/subgraph.json";
import { BaseLogo } from "@/assets/BaseLogo";
import { CeloLogo } from "@/assets/CeloLogo";
import { GnosisLogo } from "@/assets/GnosisLogo";
import { ChainId } from "@/types";

type ChainIconProps = React.SVGProps<SVGSVGElement> & {
  chain: number | string;
};

export const CHAINS: Chain[] = [
  arbitrumSepolia,
  optimismSepolia,
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
  superfluidSubgraphUrl?: string;
  publishedSuperfluidSubgraphUrl?: string;
  superfluidExplorerUrl?: string;
  globalTribunal?: Address;
  arbitrator: Address;
  passportScorer: Address;
  goodDollar: Address;
  allo: Address;
  isTestnet: boolean;
  safePrefix?: string;
  alchemyApiBaseUrl?: string; // Optional, used for fetching NFTs
};

const SUBGRAPH_ARBSEP_VERSION = Subgraph.VERSION_ARBSEP;
const SUBGRAPH_OPSEP_VERSION = Subgraph.VERSION_OPSEP;
const SUBGRAPH_ETHSEP_VERSION = Subgraph.VERSION_ETHSEP;
const SUBGRAPH_PRODNET_VERSION = Subgraph.VERSION_PROD;

const getGatewayKey = () => {
  const serverKey =
    typeof window === "undefined" ? process.env.SERVER_SUBGRAPH_KEY : null;
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return serverKey || process.env.NEXT_PUBLIC_SUBGRAPH_KEY || "";
};

const getSuperfluidSubgraphUrls = (publishedId: string) => {
  const gatewayKey = getGatewayKey();
  return {
    publishedSuperfluidSubgraphUrl:
      gatewayKey ?
        `https://gateway.thegraph.com/api/${gatewayKey}/subgraphs/id/${publishedId}`
      : undefined,
  };
};

const getSuperfluidExplorerUrl = (networkSlug: string) =>
  `https://explorer.superfluid.org/${networkSlug}`;

const getSubgraphUrls = (
  publishedId: string,
  subgraphSlug: string,
  subgraphVersion: string,
  accountNumber: number = 102093,
) => {
  const gatewayKey = getGatewayKey();
  const versionedEndpoint = `https://api.studio.thegraph.com/query/${accountNumber}/${subgraphSlug}`;
  return {
    publishedSubgraphUrl:
      gatewayKey ?
        `https://gateway.thegraph.com/api/${gatewayKey}/subgraphs/id/${publishedId}`
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
    blockTime: 12,
    confirmations: 2,
    rpcUrl: process.env.RPC_URL_ARB_TESTNET!,
    ...getSubgraphUrls(
      "BfZYwhZ1rTb22Nah1u6YyXtUtAdgGNtZhW1EBb4mFzAU",
      "gardens-v2---arbitrum-sepolia",
      SUBGRAPH_ARBSEP_VERSION,
      70985,
    ),
    superfluidExplorerUrl: getSuperfluidExplorerUrl("arbitrum-sepolia"),
    globalTribunal: "0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x49222C53695C77a0F8b78Eb42606B893E98DfE6a",
    passportScorer: "0x2053E225672776deb23Af0A3EBa9CE2c87838a72",
    goodDollar: "0x9DdE3cE47cC11ee04Ea1e2C440116B3De6f11Ed8",
    isTestnet: true,
  },
  11155420: {
    id: 11155420,
    name: optimismSepolia.name,
    icon: Optimism,
    explorer: "https://sepolia-optimism.etherscan.io/",
    blockTime: 2,
    confirmations: 1,
    rpcUrl: process.env.RPC_URL_OP_TESTNET!,
    ...getSubgraphUrls(
      "5B7swx86RJEpywgvS63kMLVx9U6RKfERfU5tWYnUuGXe",
      "gardens-v-2-optimism-sepolia",
      SUBGRAPH_OPSEP_VERSION,
      70985,
    ),
    superfluidSubgraphUrl:
      "https://subgraph-endpoints.superfluid.dev/optimism-sepolia/protocol-v1",
    superfluidExplorerUrl: getSuperfluidExplorerUrl("optimism-sepolia"),
    globalTribunal: "0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0xCcbAc15Eb0D8C241D4b6A74E650dE089c292D131",
    passportScorer: "0xe3DC6e82B599cD80904aCf0a3cd9f7401d92CC37",
    goodDollar: "0xb01AC9015E04ecC424E646eBAb32dfa7670Ae8a6",
    isTestnet: true,
  },
  11155111: {
    id: 11155111,
    name: sepolia.name,
    icon: Ethereum,
    explorer: "https://sepolia.etherscan.io/",
    blockTime: 12,
    confirmations: 1, // 3
    rpcUrl: process.env.RPC_URL_ETH_TESTNET!,
    ...getSubgraphUrls(
      "5xWqmgdaKXziaJg4EuV5pzWFCNmX2eRLsHKBissnbDNx",
      "gardens-v-2-sepolia",
      SUBGRAPH_ETHSEP_VERSION,
      70985,
    ),
    superfluidSubgraphUrl:
      "https://subgraph-endpoints.superfluid.dev/eth-sepolia/protocol-v1",
    superfluidExplorerUrl: getSuperfluidExplorerUrl("eth-sepolia"),
    globalTribunal: "0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x3678d8f5d4f04cb033b8ab4d85df384d0df9cb08",
    passportScorer: "0xd58ff588177f02cc535a0e235a4c002a17e27202",
    goodDollar: "0xa50ec350146e42b1ad15705da04c7cb6929e1f2a",
    isTestnet: true,
  },

  // Prodnets
  42161: {
    id: 42161,
    name: "Arbitrum",
    icon: Arbitrum,
    explorer: "https://arbiscan.io",
    blockTime: 12,
    confirmations: 2, // 7
    rpcUrl: process.env.RPC_URL_ARBITRUM!,
    ...getSubgraphUrls(
      "9ejruFicuLT6hfuXNTnS8UCwxTWrHz4uinesdZu1dKmk",
      "gardens-v2---arbitrum",
      SUBGRAPH_PRODNET_VERSION,
    ),
    ...getSuperfluidSubgraphUrls(
      "7hoLgMuj3LcWkUfH5iNWqVn69rmVbk4mrdgx1FX3sa3M",
    ),
    superfluidExplorerUrl: getSuperfluidExplorerUrl("arbitrum-one"),
    globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x1c62F449058BbeeD546823A1a581D28233f7A69c",
    passportScorer: "0x8cd4bA4ad10d85A550fe45d567a49E49e1D23CE1",
    goodDollar: "0x3015DC7D831D19786C726Ab1A49b30b31356f78D",
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
    ...getSuperfluidSubgraphUrls(
      "48YRvi7PHbX4RJChq4nF8DpmJGZxcvUgwfdf8QoHBXxT",
    ),
    superfluidExplorerUrl: getSuperfluidExplorerUrl("optimism-mainnet"),
    globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0xaf6628d7347fc4D65F1D5C69663C875a00c56d9F",
    passportScorer: "0x084a5504dCFeac0ec3E10517247639e50c8DcFFd",
    goodDollar: "0x5820D4e62A0EF69B1CCDAFB7729ACc8B0E93d845",
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
    ...getSuperfluidSubgraphUrls(
      "CvVf1MiypnZhwWZjbxMH9A8nR2qdcfTozC5DQ1cw4X9n",
    ),
    superfluidExplorerUrl: getSuperfluidExplorerUrl("matic"),
    globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x8D9EAed9D3D23EF30ADAA706c8352c5655AEd814",
    passportScorer: "0x190Fa730E6FfC64Ebd0031bE59b3007cC9eE2bB3",
    goodDollar: "0x7D08db0138fc0f0Dcc9C7120b301Ff07D3A7b300",
    isTestnet: false,
    safePrefix: "matic",
  },
  100: {
    id: 100,
    name: gnosis.name,
    icon: GnosisLogo,
    explorer: "https://gnosisscan.io",
    blockTime: 5.2,
    confirmations: 2, // 4
    rpcUrl: process.env.RPC_URL_GNOSIS!,
    ...getSubgraphUrls(
      "ELGHrYhvJJQrYkVsYWS5iDuFpQ1p834Q2k2kBmUAVZAi",
      "gardens-v2---gnosis",
      SUBGRAPH_PRODNET_VERSION,
    ),
    ...getSuperfluidSubgraphUrls(
      "CFe2JWsPy9eiT9B49m2E2gwxdCzWdm5kfYHRXi5VseXV",
    ),
    superfluidExplorerUrl: getSuperfluidExplorerUrl("xdai"),
    globalTribunal: "0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x92bc0af737f55FF7B677cd942Aafd52934Fc751d",
    passportScorer: "0x20965C5C8a021ac6fFeD5dE7A402f7CEaC3b0A82",
    goodDollar: "0x752dD2BE242c0A2944469331a463297ccAfC3A0E",
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
    ...getSuperfluidSubgraphUrls(
      "5P6vRdU8BQUKMSc9v5sVDMczBRvURyK7hnrQCKf24PXW",
    ),
    superfluidExplorerUrl: getSuperfluidExplorerUrl("base-mainnet"),
    globalTribunal: "0x9a17De1f0caD0c592F656410997E4B685d339029",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0xab98D1D6Ce18e537715126614278d1A4D26bbc7d",
    passportScorer: "0xb39dFA15F96055664179e8EcaA890f3FA26c21e9",
    goodDollar: "0xe86a28Aa50AD5750532f73b77375Ed0D5e23a330",
    isTestnet: false,
    safePrefix: "base",
  },
  42220: {
    id: 42220,
    name: celo.name,
    icon: CeloLogo,
    explorer: "https://celoscan.io/",
    blockTime: 1,
    confirmations: 4, // 4
    rpcUrl: process.env.RPC_URL_CELO!,
    ...getSubgraphUrls(
      "BsXEnGaXdj3CkGRn95bswGcv2mQX7m8kNq7M7WBxxPx8",
      "gardens-v2---celo",
      SUBGRAPH_PRODNET_VERSION,
    ),
    ...getSuperfluidSubgraphUrls(
      "DnAAo2aA676F8DYkcUPrRTgpH4smc1Yo7D7BnzC3ErBh",
    ),
    superfluidExplorerUrl: getSuperfluidExplorerUrl("celo"),
    globalTribunal: "0x9a17De1f0caD0c592F656410997E4B685d339029",
    allo: "0x1133eA7Af70876e64665ecD07C0A0476d09465a1",
    arbitrator: "0x83bDE2E2D8AcAAad2D300DA195dF3cf86b234bdd",
    passportScorer: "0xb39dfa15f96055664179e8ecaa890f3fa26c21e9",
    goodDollar: "0xABfa0Ed0142642651EBe8dd3f22acdd709782a61",
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
  return IconComponent != null ? <IconComponent {...props} /> : null;
};
