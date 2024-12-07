const viemChains = require("viem/chains");
const hash = require("object-hash");
const subgraphConfig = require("../../../../apps/web/configs/subgraph.json");

const localhostSubgraph = "http://localhost:8000/subgraphs/name/kamikazebr/gv2";
const arbitrumSepoliaSubgraph =
  "https://api.studio.thegraph.com/query/70985/gardens-v2---arbitrum-sepolia/" +
  subgraphConfig.VERSION_TESTNET;

const arbitrumSubgraph =
  "https://api.studio.thegraph.com/query/40931/gardens-v2---arbitrum/" +
  subgraphConfig.VERSION_PROD;
const maticSubgraph =
  "https://api.studio.thegraph.com/query/40931/gardens-v2---polygon/" +
  subgraphConfig.VERSION_PROD;
const optimismSubgraph =
  "https://api.studio.thegraph.com/query/40931/gardens-v2---optimism/" +
  subgraphConfig.VERSION_PROD;
const gnosisSubgraph =
  "https://api.studio.thegraph.com/query/40931/gardens-v2---gnosis/" +
  subgraphConfig.VERSION_PROD;

// @ts-ignore
const chainArg = process.argv[process.argv.length - 1];

const jsons = {
  // @ts-ignore
  [viemChains.localhost.id]: localhostSubgraph,
  // @ts-ignore
  [viemChains.arbitrumSepolia.id]: arbitrumSepoliaSubgraph,
  // [viemChains.optimismSepolia.id]: optimismSepoliaLatest,
  // [viemChains.sepolia.id]: sepoliaLatest,

  // @ts-ignore
  [viemChains.arbitrum.id]: arbitrumSubgraph,
  [viemChains.optimism.id]: optimismSubgraph,
  [viemChains.polygon.id]: maticSubgraph,
  [viemChains.gnosis.id]: gnosisSubgraph,
  // @ts-ignore
  // [viemChains.mainnet.id]: mainnetLatest
};

async function extractProxies(chainId) {
  let registryFactoryProxy;
  let registryCommunityProxies = [];
  let cvStrategiesProxies = [];
  let passportScorerProxy;

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
    console.error("No subgraph endpoint found for chain", chain);
    return;
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
  passportScorers {
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

  if (response.status !== 200) {
    console.error({
      status: response.status,
      statusText: response.statusText,
      response: await response.text(),
      url: response.url,
    });
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();

  if (!result.data) {
    throw new Error("Error in response: " + (await response.text()));
  }

  registryFactoryProxy = result.data.registryFactories?.[0]?.id;

  result.data.registryCommunities.forEach((community) => {
    registryCommunityProxies.push(community.id);
  });

  result.data.cvstrategies.forEach((strategy) => {
    cvStrategiesProxies.push(strategy.id);
  });

  passportScorerProxy = result.data.passportScorers?.[0]?.id;

  return {
    REGISTRY_FACTORY: registryFactoryProxy,
    REGISTRY_COMMUNITIES: registryCommunityProxies,
    CV_STRATEGIES: cvStrategiesProxies,
    PASSPORT_SCORER: passportScorerProxy,
  };
}

extractProxies(chainArg)
  .then((proxies) => {
    const json = JSON.stringify(
      { PROXIES: proxies, hash: hash(proxies) },
      null,
      2,
    );
    console.debug(json);
  })
  .catch((err) => console.error(err));
