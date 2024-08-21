const viemChains = require("viem/chains");
const localhostLatest = require("../../../../broadcast/DeployCV.s.sol/1337/run-latest.json");
const arbitrumSepoliaLatest = require("../../../../broadcast/DeployCVMultiChain.s.sol/421614/run-latest.json");
// const optimismSepoliaLatest = require("../../../../broadcast/DeployCVMultiChain.s.sol/11155420/run-latest.json");
const sepoliaLatest = require("../../../../broadcast/DeployCVMultiChain.s.sol/11155111/run-latest.json");
const optimismLatest = require("../../../../broadcast/DeployCVMultiChain.s.sol/10/run-latest.json");
// const gnosisLatest = require("../../../../broadcast/DeployCVMultiChain.s.sol/100/run-latest.json");
const polygonLatest = require("../../../../broadcast/DeployCVMultiChain.s.sol/137/run-latest.json");
const arbitrumLatest = require("../../../../broadcast/DeployCVMultiChain.s.sol/42161/run-latest.json");
// const mainnetLatest = require("../../../../broadcast/DeployCVMultiChain.s.sol/1/run-latest.json");
const { fromHex } = require("viem");

const chainArg = process.argv[process.argv.length - 1];

const jsons = {
  [viemChains.localhost.id]: localhostLatest,
  [viemChains.arbitrumSepolia.id]: arbitrumSepoliaLatest,
  // [viemChains.optimismSepolia.id]: optimismSepoliaLatest,
  [viemChains.sepolia.id]: sepoliaLatest,

  [viemChains.optimism.id]: optimismLatest,
  // [viemChains.gnosis.id]: gnosisLatest,
  [viemChains.polygon.id]: polygonLatest,
  [viemChains.arbitrum.id]: arbitrumLatest,
  // [viemChains.mainnet.id]: mainnetLatest
};

function extractAddr(runLatest) {
  let factory = "0x";
  let proxyFactory = "0x";
  let token = "0x";
  let safe = "0x";
  let blockNumber = 0;
  let passportScorer = "0x";
  let proxyPassportScorer = "0x";
  let safeArbitrator = "0x";
  let proxySafeArbitrator = "0x";
  let strategyTemplate = "0x";
  let registryTemplate = "0x";
  let collateralVaultTemplate = "0x";

  if (runLatest) {
    const txs = runLatest.transactions;
    blockNumber = fromHex(runLatest.receipts[0].blockNumber, "number");

    for (const tx of txs) {
      if (!tx.contractName) {
        continue;
      }
      if (tx.contractName.includes("RegistryCommunityV")) {
        registryTemplate = tx.contractAddress;
      } else if (tx.contractName.includes("RegistryFactoryV")) {
        factory = tx.contractAddress;
      } else if (tx.contractName.includes("CollateralVault")) {
        collateralVaultTemplate = tx.contractAddress;
      } else if (tx.contractName == "SafeProxy") {
        safe = tx.contractAddress;
      } else if (tx.contractName.includes("CVStrategyV")) {
        strategyTemplate = tx.contractAddress;
      } else if (
        tx.contractName == "lib/allo-v2/test/utils/MockERC20.sol:MockERC20"
      ) {
        token = tx.contractAddress;
      } else if (tx.contractName == "TERC20") {
        token = tx.contractAddress;
      } else if (tx.contractName == "PassportScorer") {
        passportScorer = tx.contractAddress;
      } else if (tx.contractName == "GV2ERC20") {
        token = tx.contractAddress;
      } else if (tx.contractName == "SafeArbitrator") {
        safeArbitrator = tx.contractAddress;
      } else if (tx.contractName == "ERC1967Proxy") {
        // implementation always set before proxy in json
        let implementation = tx.arguments?.[0].toLowerCase();
        if (implementation === factory) {
          proxyFactory = tx.contractAddress;
        } else if (implementation === passportScorer) {
          proxyPassportScorer = tx.contractAddress;
        } else if (implementation === safeArbitrator) {
          proxySafeArbitrator = tx.contractAddress;
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
    collateralVaultTemplate,
  };
}

function getRunLatestAddrs(chainId) {
  let runLatest;

  const chain = Object.values(viemChains).find(
    (x) =>
      ("id" in x && x.id === chainId) ||
      ("network" in x && x.network === chainId),
  );

  if (!chain) {
    throw new Error("Chain not found: " + chainId);
  }

  let result = undefined;

  try {
    runLatest = jsons[chain.id];
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

try {
  const latestAddress = getRunLatestAddrs(chainArg);
  console.debug({ latestAddress });
} catch (error) {
  console.error(error);
}

module.exports = { getRunLatestAddrs };
