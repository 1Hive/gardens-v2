const viemChains = require("viem/chains");
const { fromHex } = require("viem");

const localhostSubgraph = "http://localhost:8000/subgraphs/name/kamikazebr/gv2";
const arbitrumSepoliaSubgraph =
  "https://api.studio.thegraph.com/query/70985/gv2-arbsepolia/version/latest";

const arbitrumSubgraph =
  "https://api.studio.thegraph.com/query/70985/gv2-arbitrum/version/latest";
const maticSubgraph =
  "https://api.studio.thegraph.com/query/70985/gv2-matic/version/latest";
const optimismSubgraph =
  "https://api.studio.thegraph.com/query/70985/gv2-optimism/version/latest";

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
  [viemChains.optimism.id]: optimismSubgraph,
  // [viemChains.gnosis.id]: gnosisLatest,
  // @ts-ignore
  [viemChains.polygon.id]: maticSubgraph,
  // @ts-ignore
  [viemChains.arbitrum.id]: arbitrumSubgraph,
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
}`;

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

  result.data.registryFactories.forEach((factory) => {
    registryFactoryProxy = factory.id;
  });

  result.data.registryCommunities.forEach((community) => {
    registryCommunityProxies.push(community.id);
  });

  result.data.cvstrategies.forEach((strategy) => {
    cvStrategiesProxies.push(strategy.id);
  });

  return {
    registryFactoryProxy,
    registryCommunityProxies,
    cvStrategiesProxies,
  };
}

extractProxies(chainArg)
  .then((proxies) => {
    console.debug({ proxies });
  })
  .catch((err) => console.error(err));
