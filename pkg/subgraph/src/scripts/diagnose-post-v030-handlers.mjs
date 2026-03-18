#! /usr/bin/env node

import fs from "fs";
import path from "path";
import minimist from "minimist";
import { createPublicClient, http } from "viem";
import * as chains from "viem/chains";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../..");
const NETWORKS_PATH = path.join(ROOT, "pkg/contracts/config/networks.json");
const SUBGRAPH_CONFIG_DIR = path.join(ROOT, "pkg/subgraph/config");

const RPC_ENV_BY_NETWORK = {
  arbitrum: ["RPC_URL_ARBITRUM", "RPC_URL_ARB"],
  optimism: ["RPC_URL_OPTIMISM", "RPC_URL_OPT"],
  polygon: ["RPC_URL_MATIC", "RPC_URL_POLYGON"],
  gnosis: ["RPC_URL_GNOSIS"],
  base: ["RPC_URL_BASE"],
  celo: ["RPC_URL_CELO"],
};

const SUBGRAPH_CONFIG_FILE_BY_NETWORK = {
  arbitrum: "arbitrum.json",
  optimism: "optimism.json",
  polygon: "matic.json",
  gnosis: "gnosis.json",
  base: "base.json",
  celo: "celo.json",
};

const VIEM_CHAIN_BY_ID = new Map(
  Object.values(chains)
    .filter((chain) => typeof chain === "object" && chain && "id" in chain)
    .map((chain) => [chain.id, chain])
);

const CV_STRATEGY_EVENTS = [
  {
    label: "InitializedCV4",
    abi: {
      type: "event",
      name: "InitializedCV4",
      inputs: [
        { indexed: false, name: "poolId", type: "uint256" },
        {
          indexed: false,
          name: "data",
          type: "tuple",
          components: [
            {
              name: "cvParams",
              type: "tuple",
              components: [
                { name: "maxRatio", type: "uint256" },
                { name: "weight", type: "uint256" },
                { name: "decay", type: "uint256" },
                { name: "minThresholdPoints", type: "uint256" },
              ],
            },
            { name: "pointSystem", type: "uint8" },
            { name: "proposalType", type: "uint8" },
            {
              name: "pointConfig",
              type: "tuple",
              components: [{ name: "maxAmount", type: "uint256" }],
            },
            {
              name: "arbitrableConfig",
              type: "tuple",
              components: [
                { name: "arbitrator", type: "address" },
                { name: "tribunalSafe", type: "address" },
                { name: "submitterCollateralAmount", type: "uint256" },
                { name: "challengerCollateralAmount", type: "uint256" },
                { name: "defaultRuling", type: "uint256" },
                { name: "defaultRulingTimeout", type: "uint256" },
              ],
            },
            { name: "registryCommunity", type: "address" },
            { name: "sybilScorer", type: "address" },
            { name: "superfluidToken", type: "address" },
            { name: "streamingRatePerSecond", type: "uint256" },
            { name: "initialAllowlist", type: "address[]" },
            { name: "gda", type: "address" },
            { name: "pool_admin", type: "uint256" },
          ],
        },
      ],
      anonymous: false,
    },
  },
  {
    label: "SuperfluidPoolCreated",
    abi: {
      type: "event",
      name: "SuperfluidPoolCreated",
      inputs: [
        { indexed: true, name: "gda", type: "address" },
        { indexed: true, name: "superfluidToken", type: "address" },
        { indexed: false, name: "maxStreamingRate", type: "uint256" },
      ],
      anonymous: false,
    },
  },
  {
    label: "SuperfluidStreamingRateUpdated",
    abi: {
      type: "event",
      name: "SuperfluidStreamingRateUpdated",
      inputs: [{ indexed: false, name: "streamingRatePerSecond", type: "uint256" }],
      anonymous: false,
    },
  },
  {
    label: "StreamRateUpdated",
    abi: {
      type: "event",
      name: "StreamRateUpdated",
      inputs: [
        { indexed: true, name: "gda", type: "address" },
        { indexed: false, name: "flowRate", type: "uint256" },
      ],
      anonymous: false,
    },
  },
  {
    label: "StreamMemberUnitUpdated",
    abi: {
      type: "event",
      name: "StreamMemberUnitUpdated",
      inputs: [
        { indexed: true, name: "escrow", type: "address" },
        { indexed: false, name: "memberUnits", type: "int96" },
      ],
      anonymous: false,
    },
  },
  {
    label: "EscrowStreamStopped",
    abi: {
      type: "event",
      name: "EscrowStreamStopped",
      inputs: [
        { indexed: true, name: "escrow", type: "address" },
        { indexed: false, name: "gda", type: "address" },
      ],
      anonymous: false,
    },
  },
];

const REGISTRY_FACTORY_EVENTS = [
  {
    label: "StreamingEscrowFactorySet",
    abi: {
      type: "event",
      name: "StreamingEscrowFactorySet",
      inputs: [{ indexed: false, name: "factory", type: "address" }],
      anonymous: false,
    },
  },
];

const GLOBAL_PAUSE_EVENTS = [
  {
    label: "ContractPaused",
    abi: {
      type: "event",
      name: "ContractPaused",
      inputs: [
        { indexed: true, name: "target", type: "address" },
        { indexed: false, name: "until", type: "uint256" },
      ],
      anonymous: false,
    },
  },
  {
    label: "ContractUnpaused",
    abi: {
      type: "event",
      name: "ContractUnpaused",
      inputs: [{ indexed: true, name: "target", type: "address" }],
      anonymous: false,
    },
  },
  {
    label: "SelectorPaused",
    abi: {
      type: "event",
      name: "SelectorPaused",
      inputs: [
        { indexed: true, name: "target", type: "address" },
        { indexed: true, name: "selector", type: "bytes4" },
        { indexed: false, name: "until", type: "uint256" },
      ],
      anonymous: false,
    },
  },
  {
    label: "SelectorUnpaused",
    abi: {
      type: "event",
      name: "SelectorUnpaused",
      inputs: [
        { indexed: true, name: "target", type: "address" },
        { indexed: true, name: "selector", type: "bytes4" },
      ],
      anonymous: false,
    },
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getSubgraphConfig(networkName) {
  const file = SUBGRAPH_CONFIG_FILE_BY_NETWORK[networkName];
  return readJson(path.join(SUBGRAPH_CONFIG_DIR, file));
}

function getRpcUrl(networkName) {
  for (const envName of RPC_ENV_BY_NETWORK[networkName] ?? []) {
    if (process.env[envName]) return process.env[envName];
  }

  const { chainId } = getSubgraphConfig(networkName);
  const chain = VIEM_CHAIN_BY_ID.get(chainId);
  return chain?.rpcUrls?.default?.http?.[0] ?? null;
}

function getClient(chainId, rpcUrl) {
  return createPublicClient({
    chain: VIEM_CHAIN_BY_ID.get(chainId),
    transport: http(rpcUrl, { batch: true }),
  });
}

async function countLogsForAddress(client, address, fromBlock, event, chunkSize) {
  const latestBlock = await client.getBlockNumber();
  let count = 0;
  let firstBlock = null;
  let lastBlock = null;

  for (let start = fromBlock; start <= latestBlock; start += chunkSize + 1n) {
    const end = start + chunkSize > latestBlock ? latestBlock : start + chunkSize;
    const logs = await client.getLogs({
      address,
      event,
      fromBlock: start,
      toBlock: end,
    });

    if (logs.length > 0) {
      count += logs.length;
      firstBlock = firstBlock ?? logs[0].blockNumber ?? start;
      lastBlock = logs[logs.length - 1].blockNumber ?? end;
    }
  }

  return { count, firstBlock, lastBlock };
}

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ["networks", "log-chunk", "max-strategies", "out"],
    default: {
      networks: "arbitrum,optimism,polygon,gnosis,base,celo",
      "log-chunk": "5000",
      "max-strategies": "",
      out: "",
    },
  });

  const selected = String(argv.networks)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const networksJson = readJson(NETWORKS_PATH);
  const results = [];

  for (const networkName of selected) {
    const network = networksJson.networks.find((item) => item.name === networkName);
    if (!network) continue;

    const rpcUrl = getRpcUrl(networkName);
    if (!rpcUrl) {
      console.warn(`[${networkName}] skipped, missing RPC URL`);
      continue;
    }

    const config = getSubgraphConfig(networkName);
    const client = getClient(network.chainId, rpcUrl);
    const chunkSize = BigInt(Number(argv["log-chunk"]) || 5000);
    const maxStrategies = Number(argv["max-strategies"]);
    const strategies = Number.isFinite(maxStrategies) && maxStrategies > 0
      ? (network.PROXIES?.CV_STRATEGIES ?? []).slice(0, maxStrategies)
      : network.PROXIES?.CV_STRATEGIES ?? [];

    const registryFactoryAddress = config.dataSources.find(
      (source) => source.name === "RegistryFactory"
    )?.address;
    const registryFactoryStart = BigInt(
      config.dataSources.find((source) => source.name === "RegistryFactory")?.startBlock ?? 0
    );
    const pauseControllerAddress = config.dataSources.find(
      (source) => source.name === "GlobalPauseController"
    )?.address;
    const pauseControllerStart = BigInt(
      config.dataSources.find((source) => source.name === "GlobalPauseController")?.startBlock ?? 0
    );

    console.log(`[${networkName}] scanning post-v0.3.0 handler events`);

    if (
      registryFactoryAddress &&
      registryFactoryAddress !== "0x0000000000000000000000000000000000000000"
    ) {
      for (const event of REGISTRY_FACTORY_EVENTS) {
        const stats = await countLogsForAddress(
          client,
          registryFactoryAddress,
          registryFactoryStart,
          event.abi,
          chunkSize
        );
        results.push({
          network: networkName,
          scope: "RegistryFactory",
          address: registryFactoryAddress,
          event: event.label,
          ...stats,
        });
      }
    }

    if (
      pauseControllerAddress &&
      pauseControllerAddress !== "0x0000000000000000000000000000000000000000"
    ) {
      for (const event of GLOBAL_PAUSE_EVENTS) {
        const stats = await countLogsForAddress(
          client,
          pauseControllerAddress,
          pauseControllerStart,
          event.abi,
          chunkSize
        );
        results.push({
          network: networkName,
          scope: "GlobalPauseController",
          address: pauseControllerAddress,
          event: event.label,
          ...stats,
        });
      }
    }

    for (const strategy of strategies) {
      for (const event of CV_STRATEGY_EVENTS) {
        const stats = await countLogsForAddress(
          client,
          strategy,
          registryFactoryStart,
          event.abi,
          chunkSize
        );
        if (stats.count > 0) {
          results.push({
            network: networkName,
            scope: "CVStrategy",
            address: strategy,
            event: event.label,
            ...stats,
          });
        }
      }
    }
  }

  console.table(
    results.map((row) => ({
      network: row.network,
      scope: row.scope,
      event: row.event,
      address: row.address,
      count: row.count,
      firstBlock: row.firstBlock?.toString() ?? "",
      lastBlock: row.lastBlock?.toString() ?? "",
    }))
  );

  if (argv.out) {
    fs.writeFileSync(argv.out, JSON.stringify(results, null, 2));
    console.log(`Saved ${results.length} rows to ${argv.out}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
