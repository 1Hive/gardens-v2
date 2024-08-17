import {
  arbitrum,
  arbitrumSepolia,
  localhost,
  optimismSepolia,
  sepolia,
} from "viem/chains";
import { Address, getRunLatestAddrs } from "#/subgraph/src/scripts/last-addr";
import { getChain } from "@/configs/chainServer";

// read env variables
const ENV = process.env.NEXT_PUBLIC_ENV_GARDENS;

const envRpcUrlArbTestnet = process.env.NEXT_PUBLIC_RPC_URL_ARB_TESTNET;
const envRpcUrlOpTestnet = process.env.NEXT_PUBLIC_RPC_URL_OP_TESTNET;
const envRpcUrlEthSepoliaTestnet = process.env.NEXT_PUBLIC_RPC_URL_ETH_TESTNET;
const envRpcUrlArbitrum = process.env.NEXT_PUBLIC_RPC_URL_ARBITRUM;

export const isProd = ENV === "prod";

console.debug("isProd", isProd);

type RPCSubgraphAddr = {
  [key: number]: {
    rpcUrl?: string;
    subgraphUrl: string;
    strategyTemplate?: Address;
    passportScorer?: Address;
  };
};

let subgraphAddresses: RPCSubgraphAddr = {
  [localhost.id as number]: {
    rpcUrl: "http://127.0.0.1:8545",
    subgraphUrl: "http://localhost:8000/subgraphs/name/kamikazebr/gv2",
    passportScorer: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  },
  [arbitrumSepolia.id as number]: {
    rpcUrl: envRpcUrlArbTestnet,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_ARB_SEP ?? "",
  },
  [optimismSepolia.id as number]: {
    rpcUrl: envRpcUrlOpTestnet,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_OP_SEP ?? "",
  },
  [sepolia.id as number]: {
    rpcUrl: envRpcUrlEthSepoliaTestnet,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_ETH_SEP ?? "",
  },
  [arbitrum.id as number]: {
    rpcUrl: envRpcUrlArbitrum,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_ARBITRUM ?? "",
  },
};

export function getConfigByChain(chainId: number | string) {
  const currentChain = getChain(chainId);
  if (currentChain?.id) {
    return subgraphAddresses[currentChain.id];
  }
}

export type ContractsAddresses = (typeof subgraphAddresses)[number];
