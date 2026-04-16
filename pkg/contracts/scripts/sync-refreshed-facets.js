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

async function getCode(rpcUrl, address) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getCode",
      params: [address, "latest"],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(`RPC error: ${payload.error.message || JSON.stringify(payload.error)}`);
  }

  return payload.result;
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