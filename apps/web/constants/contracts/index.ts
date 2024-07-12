import {
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

export const isProd = ENV === "prod";

console.debug("isProd", isProd);

type RPCSubgraphAddr = {
  [key: number]: {
    rpcUrl?: string;
    subgraphUrl: string;
    strategyTemplate?: Address;
  };
};

let __subgraphAddresses: RPCSubgraphAddr = {
  [localhost.id as number]: {
    rpcUrl: `http://127.0.0.1:8545`,
    subgraphUrl: "http://localhost:8000/subgraphs/name/kamikazebr/gv2",
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
};

for (const chainId in __subgraphAddresses) {
  const chain = getChain(chainId);
  if (chain?.id) {
    const addrs = getRunLatestAddrs(chain.id);
    if (addrs) {
      __subgraphAddresses[chain.id].strategyTemplate = addrs.strategyTemplate;
    }
  }
}

function __getContractsAddrByChain(chainId: number | string) {
  const currentChain = getChain(chainId);
  if (currentChain?.id) {
    return __subgraphAddresses[currentChain.id];
  }
}

console.debug("env", ENV);
// console.log("envs", __contractsAddresses);
export type ContractsAddresses = (typeof __subgraphAddresses)[number];
export const getContractsAddrByChain = __getContractsAddrByChain; //@todo rename to configByChain instead
// export const contractsAddresses = __contractsAddresses;
