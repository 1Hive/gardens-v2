// read env variables
const ENV = process.env.NEXT_PUBLIC_ENV_GARDENS;

const envRpcUrlArbTestnet = process.env.NEXT_PUBLIC_RPC_URL_ARB_TESTNET;
const envRpcUrlOpTestnet = process.env.NEXT_PUBLIC_RPC_URL_OP_TESTNET;
const envRpcUrlEthSepoliaTestnet = process.env.NEXT_PUBLIC_RPC_URL_ETH_TESTNET;

import {
  Address,
  extractAddr,
  getRunLatestAddrs,
} from "#/subgraph/src/scripts/last-addr";
import { getChain } from "@/configs/chainServer";
import {
  arbitrumSepolia,
  localhost,
  optimismSepolia,
  sepolia,
} from "viem/chains";

export const isProd = ENV === "prod";

const envOrDefaultAddr = (env: string | undefined, def: Address) =>
  env ? (env as Address) : def;

console.log("isProd", isProd);

type RPCSubgraphAddr = {
  [key: number]: {
    rpcUrl?: string;
    subgraphUrl: string;
    strategyTemplate?: Address;
  };
};

let __contractsAddresses: RPCSubgraphAddr = {
  [localhost.id as number]: {
    rpcUrl: `http://127.0.0.1:8545`,
    subgraphUrl: "http://localhost:8000/subgraphs/name/kamikazebr/gv2",
  },
  [arbitrumSepolia.id as number]: {
    rpcUrl: envRpcUrlArbTestnet,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_ARB_SEP || "",
  },
  [optimismSepolia.id as number]: {
    rpcUrl: envRpcUrlOpTestnet,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_OP_SEP || "",
  },
  [sepolia.id as number]: {
    rpcUrl: envRpcUrlEthSepoliaTestnet,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_ETH_SEP || "",
  },
};

for (const chainId in __contractsAddresses) {
  const chain = getChain(chainId);
  if (chain?.id) {
    const addrs = getRunLatestAddrs(chain.id);
    if (addrs) {
      __contractsAddresses[chain.id].strategyTemplate = addrs.strategyTemplate;
    }
  }
}

function __getContractsAddrByChain(chainId: number | string) {
  const currentChain = getChain(chainId);
  if (currentChain?.id) {
    return __contractsAddresses[currentChain.id];
  }
}

console.log("env", ENV);
// console.log("envs", __contractsAddresses);
export type ContractsAddresses = (typeof __contractsAddresses)[number];
export const getContractsAddrByChain = __getContractsAddrByChain; //@todo rename to configByChain instead
// export const contractsAddresses = __contractsAddresses;
