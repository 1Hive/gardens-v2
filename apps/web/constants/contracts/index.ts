// read env variables
const ENV = process.env.NEXT_PUBLIC_ENV_GARDENS;

const envAlloAddress = process.env.NEXT_PUBLIC_ALLO_ADDRESS_ARB_SEPOLIA;

const envRegistryGardensAddArbSep =
  process.env.NEXT_PUBLIC_REGISTRY_GARDENS_ADDR_ARB_SEPOLIA;

const envAlloRegistryAddArbSep =
  process.env.NEXT_PUBLIC_ALLO_REGISTRY_ADDR_ARB_SEPOLIA;

const envPoolAdminAddressArbSepolia =
  process.env.NEXT_PUBLIC_POOL_ADMIN_ADDR_ARB_SEPOLIA;

const envCouncilSafeAddressArbSepolia =
  process.env.NEXT_PUBLIC_COUNCIL_SAFE_ADDR_ARB_SEPOLIA;

const envRpcUrlArbTestnet = process.env.NEXT_PUBLIC_RPC_URL_ARB_TESTNET;
const envRpcUrlOpTestnet = process.env.NEXT_PUBLIC_RPC_URL_OP_TESTNET;

const envTokenAddressArbSepolia =
  process.env.NEXT_PUBLIC_TOKEN_ADDR_ARB_SEPOLIA;

const envTokenNativeAddressArbSepolia =
  process.env.NEXT_PUBLIC_TOKEN_NATIVE_ADDR_ARB_SEPOLIA;

const envConfirmationsRequired =
  process.env.NEXT_PUBLIC_CONFIRMATIONS_REQUIRED || 1;

import {
  Address,
  // AddressOrUndefined as AddressOrUndefined,
  extractAddr,
} from "#/subgraph/src/scripts/last-addr";
import { chains, getChain } from "@/configs/chainServer";
import { arbitrumSepolia, localhost, optimismSepolia } from "viem/chains";

let runLatestLocal = undefined as any;
let runLatestArbSepolia = undefined as any;
let runLatestOpSepolia = undefined as any;
try {
  runLatestLocal = require("#/../broadcast/DeployCV.s.sol/1337/run-latest.json");
} catch (error) {
  console.log("error LatestLocal ignored");
}
try {
  runLatestArbSepolia = require("#/../broadcast/DeployCVArbSepolia.s.sol/421614/run-latest.json");
} catch (error) {
  console.log("error ArbSepolia ignored");
}
try {
  runLatestOpSepolia = require("#/../broadcast/DeployCVOpSepolia.s.sol/11155420/run-latest.json");
} catch (error) {
  console.log("error OpSepolia ignored");
}
export const isProd = ENV === "prod";
export const confirmationsRequired = Number(envConfirmationsRequired);

const envOrDefaultAddr = (env: string | undefined, def: Address) =>
  env ? (env as Address) : def;

console.log("isProd", isProd);
function getContractsAddresses(runLatest: any) {
  // let addrs = extractAddr(runLatest);

  let __contractsAddresses = {
    // ...addrs,
    // allo: `${envAlloAddress}` as Address,
    // tokenNative: `${envTokenNativeAddressArbSepolia}` as Address,
    // token: envOrDefaultAddr(envTokenAddressArbSepolia, addrs.token),
    // registryCommunity: envOrDefaultAddr(
    //   envRegistryGardensAddArbSep,
    //   addrs.registryCommunity,
    // ),
    // registry: `${envAlloRegistryAddArbSep}` as `0x${string}`,
    // poolID: `${envPoolId}`,
  };
  return __contractsAddresses;
}

let __contractsAddresses = {
  [localhost.id as number]: {
    ...getContractsAddresses(runLatestLocal),
    rpcUrl: `http://127.0.0.1:8545`,
    subgraphUrl: "http://localhost:8000/subgraphs/name/kamikazebr/gv2",
  },
  [arbitrumSepolia.id as number]: {
    ...getContractsAddresses(runLatestArbSepolia),
    rpcUrl: envRpcUrlArbTestnet,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_ARB_SEP || "",
  },
  [optimismSepolia.id as number]: {
    ...getContractsAddresses(runLatestOpSepolia),
    rpcUrl: envRpcUrlOpTestnet,
    subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL_OP_SEP || "",
  },
};

function __getContractsAddrByChain(chain: number | string) {
  const currentChain = getChain(chain);
  if (currentChain?.id) {
    return __contractsAddresses[currentChain.id];
  }
}

console.log("env", ENV);
// console.log("envs", __contractsAddresses);
export type ContractsAddresses = (typeof __contractsAddresses)[number];
export const getContractsAddrByChain = __getContractsAddrByChain; //@todo rename to configByChain instead
// export const contractsAddresses = __contractsAddresses;
