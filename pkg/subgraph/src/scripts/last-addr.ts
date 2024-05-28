import {
  arbitrumSepolia,
  localhost,
  optimismSepolia,
  sepolia,
} from "viem/chains";
import runLatestArbSep from "../../../../broadcast/DeployCVArbSepolia.s.sol/421614/run-latest.json" assert { type: "json" };
import runLatestEthSep from "../../../../broadcast/DeployCVMultiChain.s.sol/11155111/run-latest.json" assert { type: "json" };
// import runLatestLocal from "../../../../broadcast/DeployCV.s.sol/1337/run-latest.json" assert { type: "json" };

export type RunLatest =
  // | typeof runLatestLocal
  typeof runLatestArbSep | typeof runLatestEthSep;
export type Address = `0x${string}`;
// export type AddressOrUndefined = Address | undefined;
// console.log(runLatest);
// return;

export type AddressChain = {
  token: Address;
  safe: Address;
  factory: Address;
  registryCommunity: Address;
  strategyTemplate: Address;
};
export function extractAddr(runLatest: RunLatest): AddressChain {
  let registryCommunity: Address = "0x";
  let factory: Address = "0x";
  let token: Address = "0x";
  let safe: Address = "0x";
  let strategyTemplate: Address = "0x";

  if (runLatest) {
    const txs = runLatest.transactions;

    for (const tx of txs) {
      if (!tx.contractName) {
        continue;
      }

      if (tx.contractName == "RegistryCommunity") {
        registryCommunity = tx.contractAddress as Address;
      } else if (
        tx.contractName ==
        "pkg/contracts/src/RegistryCommunity.sol:RegistryCommunity"
      ) {
        registryCommunity = tx.contractAddress as Address;
      } else if (tx.contractName == "RegistryFactory") {
        factory = tx.contractAddress as Address;
      } else if (tx.contractName == "SafeProxy") {
        safe = tx.contractAddress as Address;
      } else if (tx.contractName == "CVStrategy") {
        strategyTemplate = tx.contractAddress as Address;
      } else if (
        tx.contractName == "lib/allo-v2/test/utils/MockERC20.sol:MockERC20"
      ) {
        token = tx.contractAddress as Address;
      } else if (tx.contractName == "TERC20") {
        token = tx.contractAddress as Address;
      } else if (tx.contractName == "GV2ERC20") {
        token = tx.contractAddress as Address;
      }
    }
  }
  return {
    token,
    safe,
    factory,
    registryCommunity,
    strategyTemplate,
  };
}

export function getRunLatestAddrs(chain: number): AddressChain | undefined {
  let runLatest: any | undefined;

  switch (chain) {
    case localhost.id:
      // runLatest = runLatestLocal;
      break;
    case arbitrumSepolia.id:
      runLatest = runLatestArbSep;
      break;
    case sepolia.id:
      runLatest = runLatestEthSep;
      break;
  }
  let result: AddressChain | undefined = undefined;
  if (runLatest) {
    result = extractAddr(runLatest!);
  }
  return result;
}
const chainArg = process.argv[process.argv.length - 1];
let defaultChain: number = sepolia.id;

switch (chainArg) {
  case "local":
    defaultChain = localhost.id;
    break;
  case "arbsep":
    defaultChain = arbitrumSepolia.id;
    break;
  case "ethsep":
    defaultChain = sepolia.id;
    break;
  case "opsep":
    defaultChain = optimismSepolia.id;
    break;
}

const data = getRunLatestAddrs(defaultChain);

console.log(data);
