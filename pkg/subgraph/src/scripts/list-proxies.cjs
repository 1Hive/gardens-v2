const fs = require("fs");
const viemChains = require("viem/chains");
const hash = require("object-hash");
const subgraphConfig = require("../../../../apps/web/configs/subgraph.json");
const path = require("path");

const localhostSubgraph = "http://localhost:8000/subgraphs/name/kamikazebr/gv2";
const arbitrumSepoliaSubgraph =
  "https://api.studio.thegraph.com/query/70985/gardens-v2---arbitrum-sepolia/" +
  subgraphConfig.VERSION_ARBSEP;

const optimismSepoliaSubgraph =
  "https://api.studio.thegraph.com/query/70985/gardens-v-2-optimism-sepolia/" +
  subgraphConfig.VERSION_OPSEP;

const ethSepoliaSubgraph =
  "https://api.studio.thegraph.com/query/70985/gardens-v-2-sepolia/" +
    subgraphConfig.VERSION_ETHSEP;

const arbitrumSubgraph =
  "https://api.studio.thegraph.com/query/102093/gardens-v2---arbitrum/" +
  subgraphConfig.VERSION_PROD;
const maticSubgraph =
  "https://api.studio.thegraph.com/query/102093/gardens-v2---polygon/" +
  subgraphConfig.VERSION_PROD;
const optimismSubgraph =
  "https://api.studio.thegraph.com/query/102093/gardens-v2---optimism/" +
  subgraphConfig.VERSION_PROD;
const gnosisSubgraph =
  "https://api.studio.thegraph.com/query/102093/gardens-v2---gnosis/" +
  subgraphConfig.VERSION_PROD;
const baseSubgraph =
  "https://api.studio.thegraph.com/query/102093/gardens-v2---base/" +
  subgraphConfig.VERSION_PROD;

const celoSubgraph =
  "https://api.studio.thegraph.com/query/102093/gardens-v2---celo/" +
  subgraphConfig.VERSION_PROD;

// @ts-ignore
const chainArg = process.argv[process.argv.length - 1];

const jsons = {
  // @ts-ignore
  [viemChains.localhost.id]: localhostSubgraph,
  // @ts-ignore
  [viemChains.arbitrumSepolia.id]: arbitrumSepoliaSubgraph,
  [viemChains.optimismSepolia.id]: optimismSepoliaSubgraph,
  [viemChains.sepolia.id]: ethSepoliaSubgraph,

  // @ts-ignore
  [viemChains.arbitrum.id]: arbitrumSubgraph,
  [viemChains.optimism.id]: optimismSubgraph,
  [viemChains.polygon.id]: maticSubgraph,
  [viemChains.gnosis.id]: gnosisSubgraph,
  [viemChains.base.id]: baseSubgraph,
  [viemChains.celo.id]: celoSubgraph,
  // @ts-ignore
  // [viemChains.mainnet.id]: mainnetLatest
};

async function extractProxies(chainId) {
  let registryFactoryProxy;
  let registryCommunityProxies = [];
  let cvStrategiesProxies = [];

  let subgraphEndpoint;

  const chain = Object.values(viemChains).find(
    (x) =>
      ("id" in x && x.id == chainId) ||
      ("network" in x && x.network === chainId),
  );

  if (!chain) {
    throw new Error("Chain not found: " + chainId);
  }

  try {
    subgraphEndpoint = jsons[chain.id];
  } catch (e) {
    console.error("Error importing run latest for chain", chain);
    throw e;
  }

  if (!subgraphEndpoint) {
    throw `No subgraph endpoint found for chain: ${chain} `;
  }

  const query = `{
  registryFactories {
    id
  }
  registryCommunities {
    id
  }
  cvstrategies {
    id
  }
}`;

  console.debug("Querying subgraph", subgraphEndpoint);
  const response = await fetch(subgraphEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query,
    }),
  });

  const rawBody = await response.text();
  let result;

  try {
    result = JSON.parse(rawBody);
  } catch (error) {
    throw new Error(
      `Invalid JSON from subgraph (${response.status} ${response.statusText}): ${rawBody}`,
    );
  }

  if (response.status !== 200) {
    console.error({
      status: response.status,
      statusText: response.statusText,
      response: rawBody,
      url: response.url,
    });
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (!result.data || (Array.isArray(result.errors) && result.errors.length > 0)) {
    throw new Error(`Error in response: ${rawBody}`);
  }

  registryFactoryProxy = result.data.registryFactories?.[0]?.id;

  result.data.registryCommunities.forEach((community) => {
    registryCommunityProxies.push(community.id);
  });

  result.data.cvstrategies.forEach((strategy) => {
    cvStrategiesProxies.push(strategy.id);
  });

  return {
    REGISTRY_FACTORY: registryFactoryProxy,
    REGISTRY_COMMUNITIES: registryCommunityProxies,
    CV_STRATEGIES: cvStrategiesProxies,
  };
}

const networksPath = path.resolve(
  __dirname,
  "../../../../pkg/contracts/config/networks.json",
);
console.log(networksPath);

async function main() {
  if (fs.existsSync(networksPath)) {
    const networkJson = JSON.parse(fs.readFileSync(networksPath).toString());

    const netArray = networkJson["networks"];

    const netFound = netArray.find((net) => net.name == chainArg);
    if (!netFound) {
      console.error(`Network ${chainArg} not found in networks.json`);
      return;
    }
    const proxies = await extractProxies(netFound.chainId);
    netFound["PROXIES"] = proxies;
    netFound["hash"] = hash(proxies);

    // console.log(netArray)

    const netStringToSave = JSON.stringify(networkJson, null, 2);
    if (!netStringToSave || netStringToSave.trim() == "") {
      console.error("Error parsing json");
      return;
    }
    fs.writeFileSync(networksPath, netStringToSave);
  } else {
    console.error(`networks.json in path ${networksPath} don't exists`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
