#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const facetKeyByContractName = {
  DiamondLoupeFacet: "DIAMOND_LOUPE",
  CVAdminFacet: "CV_ADMIN",
  CVAllocationFacet: "CV_ALLOCATION",
  CVDisputeFacet: "CV_DISPUTE",
  CVPauseFacet: "CV_PAUSE",
  CVPowerFacet: "CV_POWER",
  CVProposalFacet: "CV_PROPOSAL",
  CVSyncPowerFacet: "CV_SYNC_POWER",
  CVStreamingFacet: "CV_STREAMING",
  CommunityAdminFacet: "COMMUNITY_ADMIN",
  CommunityMemberFacet: "COMMUNITY_MEMBER",
  CommunityPauseFacet: "COMMUNITY_PAUSE",
  CommunityPoolFacet: "COMMUNITY_POOL",
  CommunityPowerFacet: "COMMUNITY_POWER",
  CommunityStrategyFacet: "COMMUNITY_STRATEGY",
};

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

async function rpcCall(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload;
}

async function getCode(rpcUrl, address) {
  const payload = await rpcCall(rpcUrl, "eth_getCode", [address, "latest"]);
  if (payload.error) throw new Error(`RPC error: ${payload.error.message || JSON.stringify(payload.error)}`);
  return payload.result;
}

async function readRelease(rpcUrl, factory, selector) {
  const payload = await rpcCall(rpcUrl, "eth_call", [{ to: factory, data: selector }, "latest"]);
  if (payload.error) {
    if (/revert|function selector was not recognized/i.test(payload.error.message || "")) return null;
    throw new Error(`Cannot check factory routing: ${payload.error.message || JSON.stringify(payload.error)}`);
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(payload.result || "")) {
    throw new Error(`Invalid factory release response: ${payload.result}`);
  }
  return `0x${payload.result.slice(-40)}`.toLowerCase();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const network = args.network;
  const chainId = args["chain-id"];
  const rpcUrl = args["rpc-url"];
  const minMtimeMs = args["min-mtime-ms"] ? Number(args["min-mtime-ms"]) : 0;

  if (!network) throw new Error("--network is required");
  if (!chainId) throw new Error("--chain-id is required");
  if (!rpcUrl) throw new Error("--rpc-url is required");
  if (Number.isNaN(minMtimeMs)) throw new Error("--min-mtime-ms must be a number");

  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const networksJsonPath = args["networks-json"] || path.join(repoRoot, "pkg/contracts/config/networks.json");
  const broadcastPath =
    args["broadcast-path"]
    || path.join(repoRoot, "broadcast", "RefreshFacetSnapshots.s.sol", String(chainId), "run-latest.json");

  if (!fs.existsSync(broadcastPath)) {
    console.log(`No broadcast artifact found at ${broadcastPath}; skipping ${network}.`);
    return;
  }

  const broadcastStats = fs.statSync(broadcastPath);
  if (minMtimeMs > 0 && broadcastStats.mtimeMs <= minMtimeMs) {
    console.log(`No fresh RefreshFacetSnapshots artifact for ${network}; skipping config sync.`);
    return;
  }

  const broadcastJson = JSON.parse(fs.readFileSync(broadcastPath, "utf8"));
  const transactions = Array.isArray(broadcastJson.transactions) ? broadcastJson.transactions : [];
  const pendingUpdates = new Map();

  for (const transaction of transactions) {
    const facetKey = facetKeyByContractName[transaction.contractName];
    if (!facetKey || !transaction.contractAddress) {
      continue;
    }

    pendingUpdates.set(facetKey, transaction.contractAddress);
  }

  if (pendingUpdates.size === 0) {
    console.log(`No facet deployments recorded for ${network}; skipping config sync.`);
    return;
  }

  const verifiedUpdates = [];
  for (const [facetKey, contractAddress] of pendingUpdates.entries()) {
    const code = await getCode(rpcUrl, contractAddress);
    if (!code || code === "0x") {
      console.log(`Skipping ${network} ${facetKey}: ${contractAddress} has no live code.`);
      continue;
    }

    verifiedUpdates.push([facetKey, contractAddress]);
  }

  if (verifiedUpdates.length === 0) {
    console.log(`No live facet deployments verified for ${network}; skipping config sync.`);
    return;
  }

  const networksJson = JSON.parse(fs.readFileSync(networksJsonPath, "utf8"));
  const networkConfig = networksJson.networks.find((entry) => entry.name === network);
  if (!networkConfig) {
    throw new Error(`Network ${network} not found in ${networksJsonPath}`);
  }
  if (Number(chainId) !== networkConfig.chainId) {
    throw new Error(`Chain ID ${chainId} does not match ${network} config`);
  }
  const chainResponse = await rpcCall(rpcUrl, "eth_chainId", []);
  if (chainResponse.error || Number(chainResponse.result) !== networkConfig.chainId) {
    throw new Error(`RPC chain ID does not match ${network} config`);
  }

  const factory = networkConfig.PROXIES?.REGISTRY_FACTORY;
  if (!factory) throw new Error(`Missing ${network} factory proxy`);
  const releases = await Promise.all([
    readRelease(rpcUrl, factory, "0xbd922b1c"), // strategyImplementation()
    readRelease(rpcUrl, factory, "0x8e4254f4"), // communityImplementation()
  ]);
  if (releases.filter((release) => release === null).length === 1) {
    throw new Error(`Cannot determine ${network} routing state: factory release getters disagree`);
  }
  if (releases.some((release) => release && release !== "0x0000000000000000000000000000000000000000")) {
    console.log(`${network} uses shared routing; deployed facets are candidates until a factory release executes:`);
    for (const [facetKey, contractAddress] of verifiedUpdates) {
      console.log(`  ${facetKey}: ${contractAddress}`);
    }
    console.log("Active FACETS config was not changed. Prepare a shared release for these candidates.");
    return;
  }

  networkConfig.FACETS ||= {};

  let changed = 0;
  for (const [facetKey, contractAddress] of verifiedUpdates) {
    if (networkConfig.FACETS[facetKey] === contractAddress) {
      continue;
    }

    networkConfig.FACETS[facetKey] = contractAddress;
    changed += 1;
    console.log(`Synced ${network} ${facetKey} -> ${contractAddress}`);
  }

  if (changed === 0) {
    console.log(`Facet config already matches verified live deployments for ${network}.`);
    return;
  }

  fs.writeFileSync(networksJsonPath, `${JSON.stringify(networksJson, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
