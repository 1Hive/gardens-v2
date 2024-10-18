import * as viemChains from "viem/chains";
import localhostLatest from "../../../../broadcast/DeployCV.s.sol/1337/run-latest.json";
import arbitrumSepoliaLatest from "../../../../broadcast/DeployCVMultiChain.s.sol/421614/run-latest.json";
// import optimismSepoliaLatest from "../../../../broadcast/DeployCVMultiChain.s.sol/11155420/run-latest.json";
import sepoliaLatest from "../../../../broadcast/DeployCVMultiChain.s.sol/11155111/run-latest.json";
// import optimismLatest from "../../../../broadcast/DeployCVMultiChain.s.sol/10/run-latest.json";
// import gnosisLatest from "../../../../broadcast/DeployCVMultiChain.s.sol/100/run-latest.json";
// import polygonLatest from "../../../../broadcast/DeployCVMultiChain.s.sol/137/run-latest.json";
import arbitrumLatest from "../../../../broadcast/DeployCVMultiChain.s.sol/42161/run-latest.json";
// import mainnetLatest from "../../../../broadcast/DeployCVMultiChain.s.sol/1/run-latest.json";
import { fromHex } from "viem";
import { argv } from "process";

const chainArg = argv[argv.length - 1];

export type RunLatest = typeof arbitrumSepoliaLatest;
export type Address = `0x${string}`;

const jsons: Record<number, any> = {
  [viemChains.localhost.id]: localhostLatest,
  [viemChains.arbitrumSepolia.id]: arbitrumSepoliaLatest,
  // [viemChains.optimismSepolia.id]: optimismSepoliaLatest,
  [viemChains.sepolia.id]: sepoliaLatest,

  // [viemChains.optimism.id]: optimismLatest,
  // [viemChains.gnosis.id]: gnosisLatest,
  // [viemChains.polygon.id]: polygonLatest,
  [viemChains.arbitrum.id]: arbitrumLatest
  // [viemChains.mainnet.id]: mainnetLatest
};

export type AddressChain = {
  chainId: number;
  blockNumber: number;
  token: Address;
  safe: Address;
  factory: Address;
  proxyFactory: Address;
  passportScorer: Address;
  proxyPassportScorer: Address;
  safeArbitrator: Address;
  proxySafeArbitrator: Address;
  strategyTemplate: Address;
  registryTemplate: Address;
  collateralVaultTemplate: Address;
};

export function extractAddr(runLatest: RunLatest): AddressChain {
  let factory: Address = "0x";
  let proxyFactory: Address = "0x";
  let token: Address = "0x";
  let safe: Address = "0x";
  let blockNumber: number = 0;
  let passportScorer: Address = "0x";
  let proxyPassportScorer: Address = "0x";
  let safeArbitrator: Address = "0x";
  let proxySafeArbitrator: Address = "0x";
  let strategyTemplate: Address = "0x";
  let registryTemplate: Address = "0x";
  let collateralVaultTemplate: Address = "0x";

  if (runLatest) {
    type Tx = (typeof txs)[0];

    const txs = runLatest.transactions;
    blockNumber = fromHex(
      runLatest.receipts[0].blockNumber as Address,
      "number"
    );

    for (const tx of txs) {
      if (!tx.contractName) {
        continue;
      }
      if (tx.contractName.includes("RegistryCommunityV")) {
        registryTemplate = tx.contractAddress as Address;
      } else if (tx.contractName.includes("RegistryFactoryV")) {
        factory = tx.contractAddress as Address;
      } else if (tx.contractName.includes("CollateralVault")) {
        collateralVaultTemplate = tx.contractAddress as Address;
      } else if (tx.contractName == "SafeProxy") {
        safe = tx.contractAddress as Address;
      } else if (tx.contractName.includes("CVStrategyV")) {
        strategyTemplate = tx.contractAddress as Address;
      } else if (
        tx.contractName == "lib/allo-v2/test/utils/MockERC20.sol:MockERC20"
      ) {
        token = tx.contractAddress as Address;
      } else if (tx.contractName == "TERC20") {
        token = tx.contractAddress as Address;
      } else if (tx.contractName == "PassportScorer") {
        passportScorer = tx.contractAddress as Address;
      } else if (tx.contractName == "GV2ERC20") {
        token = tx.contractAddress as Address;
      } else if (tx.contractName == "SafeArbitrator") {
        safeArbitrator = tx.contractAddress as Address;
      } else if (tx.contractName == "ERC1967Proxy") {
        // implementation always set before proxy in json
        let implementation = tx.arguments?.[0].toLowerCase();
        if (implementation === factory) {
          proxyFactory = tx.contractAddress as Address;
        } else if (implementation === passportScorer) {
          proxyPassportScorer = tx.contractAddress as Address;
        } else if (implementation === safeArbitrator) {
          proxySafeArbitrator = tx.contractAddress as Address;
        }
      }
    }
  }

  return {
    chainId: runLatest.chain,
    blockNumber,
    token,
    safe,
    factory,
    proxyFactory,
    passportScorer,
    proxyPassportScorer,
    safeArbitrator,
    proxySafeArbitrator,
    registryTemplate,
    strategyTemplate,
    collateralVaultTemplate
  };
}

export async function getRunLatestAddrs(
  chainId: number | string
): Promise<AddressChain | undefined> {
  let runLatest: RunLatest | undefined;

  const chain = Object.values(viemChains).find(
    (x) =>
      ("id" in x && x.id == chainId) ||
      ("network" in x && x.network === chainId)
  ) as viemChains.Chain;
  let result: AddressChain | undefined = undefined;

  let deployScript: string;
  if (chainId === viemChains.localhost.id) {
    deployScript = "DeployCV.s.sol";
  } else {
    deployScript = "DeployCVMultiChain.s.sol";
  }

  try {
    runLatest = jsons[chain.id as keyof typeof jsons];
  } catch (e) {
    console.error("Error importing run latest for chain", chain);
    throw e;
  }

  if (runLatest) {
    result = extractAddr(runLatest);
  } else {
    console.error("No run latest found for chain", chain);
  }
  return result;
}

getRunLatestAddrs(chainArg).then((latestAddress) =>
  console.debug({ latestAddress })
);
