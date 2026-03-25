#! /usr/bin/env node

import fs from "fs";
import path from "path";
import minimist from "minimist";
import {
  createPublicClient,
  decodeEventLog,
  http,
} from "viem";
import * as chains from "viem/chains";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../..");
const NETWORKS_PATH = path.join(ROOT, "pkg/contracts/config/networks.json");
const SUBGRAPH_CONFIG_DIR = path.join(ROOT, "pkg/subgraph/config");

const proposalCreatedEventAbi = [
  {
    type: "event",
    name: "ProposalCreated",
    inputs: [
      { name: "poolId", type: "uint256", indexed: false },
      { name: "proposalId", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
];

const PROPOSAL_CREATED_SIGNATURE = "ProposalCreated(uint256,uint256)";

const proposalCreatedWithEscrowEventAbi = [
  {
    type: "event",
    name: "ProposalCreated",
    inputs: [
      { name: "poolId", type: "uint256", indexed: false },
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "escrow", type: "address", indexed: false },
    ],
    anonymous: false,
  },
];

const PROPOSAL_CREATED_WITH_ESCROW_SIGNATURE =
  "ProposalCreated(uint256,uint256,address)";

const getProposalAbi = [
  {
    type: "function",
    name: "getProposal",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [
      { name: "submitter", type: "address" },
      { name: "beneficiary", type: "address" },
      { name: "requestedToken", type: "address" },
      { name: "requestedAmount", type: "uint256" },
      { name: "stakedAmount", type: "uint256" },
      { name: "proposalStatus", type: "uint8" },
      { name: "blockLast", type: "uint256" },
      { name: "convictionLast", type: "uint256" },
      { name: "threshold", type: "uint256" },
      { name: "voterStakedPoints", type: "uint256" },
      { name: "arbitrableConfigVersion", type: "uint256" },
      { name: "protocol", type: "uint256" },
    ],
  },
];

const getProposalMetadataPointerAbi = [
  {
    type: "function",
    name: "getProposalMetadataPointer",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
];

const getMetadataLegacyAbi = [
  {
    type: "function",
    name: "getMetadata",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "protocol", type: "uint256" },
          { name: "pointer", type: "string" },
        ],
      },
    ],
  },
];

const proposalsLegacyAbi = [
  {
    type: "function",
    name: "proposals",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "proposalId", type: "uint256" },
      { name: "requestedAmount", type: "uint256" },
      { name: "stakedAmount", type: "uint256" },
      { name: "convictionLast", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "submitter", type: "address" },
      { name: "requestedToken", type: "address" },
      { name: "blockLast", type: "uint256" },
      { name: "proposalStatus", type: "uint8" },
      {
        name: "metadata",
        type: "tuple",
        components: [
          { name: "protocol", type: "uint256" },
          { name: "pointer", type: "string" },
        ],
      },
      {
        name: "disputeInfo",
        type: "tuple",
        components: [
          { name: "challengeTimestamp", type: "uint256" },
          { name: "proposalId", type: "uint256" },
          { name: "challenger", type: "address" },
        ],
      },
      { name: "lastDisputeCompletion", type: "uint256" },
      { name: "arbitrableConfigVersion", type: "uint256" },
    ],
  },
];

const RPC_ENV_BY_NETWORK = {
  ethsepolia: ["RPC_URL_SEP_TESTNET"],
  arbsepolia: ["RPC_URL_ARB_TESTNET"],
  opsepolia: ["RPC_URL_OP_TESTNET"],
  arbitrum: ["RPC_URL_ARBITRUM", "RPC_URL_ARB"],
  optimism: ["RPC_URL_OPTIMISM", "RPC_URL_OPT"],
  polygon: ["RPC_URL_MATIC", "RPC_URL_POLYGON"],
  gnosis: ["RPC_URL_GNOSIS"],
  base: ["RPC_URL_BASE"],
  celo: ["RPC_URL_CELO"],
  mainnet: ["RPC_URL_ETHEREUM"],
};

const SUBGRAPH_CONFIG_FILE_BY_NETWORK = {
  ethsepolia: "ethsepolia.json",
  arbsepolia: "arbsepolia.json",
  opsepolia: "opsepolia.json",
  arbitrum: "arbitrum.json",
  optimism: "optimism.json",
  polygon: "matic.json",
  gnosis: "gnosis.json",
  base: "base.json",
  celo: "celo.json",
  mainnet: "mainnet.json",
};

const VIEM_CHAIN_BY_ID = new Map(
  Object.values(chains)
    .filter((chain) => typeof chain === "object" && chain && "id" in chain)
    .map((chain) => [chain.id, chain])
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getChainClient(chainId, rpcUrl) {
  return createPublicClient({
    chain: VIEM_CHAIN_BY_ID.get(chainId),
    transport: http(rpcUrl, { batch: true }),
  });
}

function getSubgraphStartBlock(networkName) {
  const fileName = SUBGRAPH_CONFIG_FILE_BY_NETWORK[networkName];
  if (!fileName) return 0n;

  const filePath = path.join(SUBGRAPH_CONFIG_DIR, fileName);
  if (!fs.existsSync(filePath)) return 0n;

  const config = readJson(filePath);
  const registryFactory = config.dataSources.find(
    (source) => source.name === "RegistryFactory"
  );

  return BigInt(registryFactory?.startBlock ?? 0);
}

function getTargetNetworks(selected) {
  const networksJson = readJson(NETWORKS_PATH);
  const all = networksJson.networks.filter(
    (network) => network.PROXIES?.CV_STRATEGIES?.length
  );

  if (selected.length === 0) return all;

  const wanted = new Set(selected);
  return all.filter((network) => wanted.has(network.name));
}

function getStrategyFilter(rawValue) {
  return new Set(
    String(rawValue ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

function getRpcUrl(networkName) {
  const envNames = RPC_ENV_BY_NETWORK[networkName] ?? [];
  for (const envName of envNames) {
    if (process.env[envName]) {
      return process.env[envName];
    }
  }

  const fileName = SUBGRAPH_CONFIG_FILE_BY_NETWORK[networkName];
  if (!fileName) return null;

  const configPath = path.join(SUBGRAPH_CONFIG_DIR, fileName);
  if (!fs.existsSync(configPath)) return null;

  const { chainId } = readJson(configPath);
  const chain = VIEM_CHAIN_BY_ID.get(chainId);
  return chain?.rpcUrls?.default?.http?.[0] ?? null;
}

function shortenError(error) {
  if (error instanceof Error) {
    return error.message.split("\n")[0];
  }
  return String(error);
}

async function attemptReadContract({
  client,
  address,
  abi,
  functionName,
  args,
  blockNumber,
}) {
  try {
    const value = await client.readContract({
      address,
      abi,
      functionName,
      args,
      ...(blockNumber == null ? {} : { blockNumber }),
    });
    return { ok: true, value, error: null };
  } catch (error) {
    return { ok: false, value: null, error: shortenError(error) };
  }
}

function pickPointer(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return "";
}

async function collectProposalEvents(
  client,
  networkName,
  strategies,
  fromBlock,
  chunkSize
) {
  const items = [];
  const latestBlock = await client.getBlockNumber();

  for (const strategy of strategies) {
    console.log(`[${networkName}] scanning logs for ${strategy}`);
    for (const abi of [
      proposalCreatedEventAbi,
      proposalCreatedWithEscrowEventAbi,
    ]) {
      const event = abi[0];
      for (
        let rangeStart = fromBlock;
        rangeStart <= latestBlock;
        rangeStart += chunkSize + 1n
      ) {
        const rangeEnd =
          rangeStart + chunkSize > latestBlock
            ? latestBlock
            : rangeStart + chunkSize;

        const logs = await client.getLogs({
          address: strategy,
          event,
          fromBlock: rangeStart,
          toBlock: rangeEnd,
        });

        for (const log of logs) {
          const decoded = decodeEventLog({
            abi,
            data: log.data,
            topics: log.topics,
          });

          items.push({
            strategy,
            proposalNumber: decoded.args.proposalId,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber ?? 0n,
            logIndex: log.logIndex ?? 0,
            eventSignature:
              abi === proposalCreatedEventAbi
                ? PROPOSAL_CREATED_SIGNATURE
                : PROPOSAL_CREATED_WITH_ESCROW_SIGNATURE,
          });
        }
      }
    }
  }

  items.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
    if (a.logIndex !== b.logIndex) return a.logIndex - b.logIndex;
    if (a.strategy !== b.strategy) return a.strategy.localeCompare(b.strategy);
    if (a.proposalNumber !== b.proposalNumber) return a.proposalNumber < b.proposalNumber ? -1 : 1;
    return 0;
  });

  console.log(
    `[${networkName}] collected ${items.length} ProposalCreated logs across ${strategies.length} strategies`
  );

  return items;
}

async function diagnoseProposal(client, networkName, proposal) {
  const latestProposal = await attemptReadContract({
    client,
    address: proposal.strategy,
    abi: getProposalAbi,
    functionName: "getProposal",
    args: [proposal.proposalNumber],
  });

  const historicalProposal = await attemptReadContract({
    client,
    address: proposal.strategy,
    abi: getProposalAbi,
    functionName: "getProposal",
    args: [proposal.proposalNumber],
    blockNumber: proposal.blockNumber,
  });

  const latestCurrentPointerRead = await attemptReadContract({
    client,
    address: proposal.strategy,
    abi: getProposalMetadataPointerAbi,
    functionName: "getProposalMetadataPointer",
    args: [proposal.proposalNumber],
  });

  const historicalCurrentPointerRead = await attemptReadContract({
    client,
    address: proposal.strategy,
    abi: getProposalMetadataPointerAbi,
    functionName: "getProposalMetadataPointer",
    args: [proposal.proposalNumber],
    blockNumber: proposal.blockNumber,
  });

  const latestGetMetadataRead = await attemptReadContract({
    client,
    address: proposal.strategy,
    abi: getMetadataLegacyAbi,
    functionName: "getMetadata",
    args: [proposal.proposalNumber],
  });

  const historicalGetMetadataRead = await attemptReadContract({
    client,
    address: proposal.strategy,
    abi: getMetadataLegacyAbi,
    functionName: "getMetadata",
    args: [proposal.proposalNumber],
    blockNumber: proposal.blockNumber,
  });

  const latestLegacyProposalRead = await attemptReadContract({
    client,
    address: proposal.strategy,
    abi: proposalsLegacyAbi,
    functionName: "proposals",
    args: [proposal.proposalNumber],
  });

  const historicalLegacyProposalRead = await attemptReadContract({
    client,
    address: proposal.strategy,
    abi: proposalsLegacyAbi,
    functionName: "proposals",
    args: [proposal.proposalNumber],
    blockNumber: proposal.blockNumber,
  });

  const latestCurrentPointer = latestCurrentPointerRead.ok
    ? latestCurrentPointerRead.value
    : null;
  const historicalCurrentPointer = historicalCurrentPointerRead.ok
    ? historicalCurrentPointerRead.value
    : null;
  const latestGetMetadataPointer = latestGetMetadataRead.ok
    ? latestGetMetadataRead.value.pointer
    : null;
  const historicalGetMetadataPointer = historicalGetMetadataRead.ok
    ? historicalGetMetadataRead.value.pointer
    : null;
  const latestLegacyProposalPointer = latestLegacyProposalRead.ok
    ? latestLegacyProposalRead.value.metadata.pointer
    : null;
  const historicalLegacyProposalPointer = historicalLegacyProposalRead.ok
    ? historicalLegacyProposalRead.value.metadata.pointer
    : null;

  const latestFinalPointer = pickPointer(
    latestCurrentPointer,
    latestLegacyProposalPointer,
    latestGetMetadataPointer
  );
  const historicalFinalPointer = pickPointer(
    historicalCurrentPointer,
    historicalLegacyProposalPointer,
    historicalGetMetadataPointer
  );

  let status = "historical_empty";

  if (!historicalProposal.ok) {
    status = latestProposal.ok ? "historical_getProposal_error" : "getProposal_error";
  } else if (
    !historicalCurrentPointerRead.ok &&
    !historicalLegacyProposalRead.ok &&
    !historicalGetMetadataRead.ok
  ) {
    status = latestFinalPointer.length > 0
      ? "historical_revert_latest_ok"
      : "historical_revert";
  } else if (historicalFinalPointer.length > 0) {
    status = latestFinalPointer.length > 0 && historicalFinalPointer !== latestFinalPointer
      ? "historical_mismatch_latest"
      : "historical_ok";
  } else if (latestFinalPointer.length > 0) {
    status = "historical_empty_latest_ok";
  }

  return {
    network: networkName,
    strategy: proposal.strategy,
    proposalNumber: proposal.proposalNumber.toString(),
    blockNumber: proposal.blockNumber.toString(),
    txHash: proposal.txHash,
    eventSignature: proposal.eventSignature,
    latestGetProposal: latestProposal.ok ? "ok" : "reverted",
    latestGetProposalError: latestProposal.error,
    historicalGetProposal: historicalProposal.ok ? "ok" : "reverted",
    historicalGetProposalError: historicalProposal.error,
    latestCurrentPointer,
    latestCurrentPointerError: latestCurrentPointerRead.error,
    historicalCurrentPointer,
    historicalCurrentPointerError: historicalCurrentPointerRead.error,
    latestGetMetadataPointer,
    latestGetMetadataPointerError: latestGetMetadataRead.error,
    historicalGetMetadataPointer,
    historicalGetMetadataPointerError: historicalGetMetadataRead.error,
    latestLegacyProposalPointer,
    latestLegacyProposalError: latestLegacyProposalRead.error,
    historicalLegacyProposalPointer,
    historicalLegacyProposalError: historicalLegacyProposalRead.error,
    latestFinalPointer,
    historicalFinalPointer,
    status,
  };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (true) {
      const currentIndex = index;
      index += 1;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () =>
      worker()
    )
  );

  return results;
}

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: [
      "networks",
      "strategies",
      "out",
      "from-block",
      "concurrency",
      "log-chunk",
      "max-strategies",
      "max-proposals",
    ],
    boolean: ["include-testnets", "only-problems"],
    default: {
      networks: "",
      strategies: "",
      out: "",
      "from-block": "",
      concurrency: "8",
      "log-chunk": "2000",
      "max-strategies": "",
      "max-proposals": "",
      "include-testnets": true,
      "only-problems": false,
    },
  });

  const selectedNetworks = String(argv.networks)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const strategyFilter = getStrategyFilter(argv.strategies);

  let targetNetworks = getTargetNetworks(selectedNetworks);

  if (!argv["include-testnets"]) {
    targetNetworks = targetNetworks.filter(
      (network) =>
        !["ethsepolia", "arbsepolia", "opsepolia"].includes(network.name)
    );
  }

  const allResults = [];

  for (const network of targetNetworks) {
    const rpcUrl = getRpcUrl(network.name);
    if (!rpcUrl) {
      console.warn(
        `[${network.name}] skipped, missing ${(
          RPC_ENV_BY_NETWORK[network.name] ?? []
        ).join(" or ")}`
      );
      continue;
    }

    let strategies = network.PROXIES?.CV_STRATEGIES ?? [];
    if (strategyFilter.size > 0) {
      strategies = strategies.filter((strategy) =>
        strategyFilter.has(strategy.toLowerCase())
      );
    }
    const maxStrategies = Number(argv["max-strategies"]);
    if (Number.isFinite(maxStrategies) && maxStrategies > 0) {
      strategies = strategies.slice(0, maxStrategies);
    }
    if (strategies.length === 0) {
      console.warn(`[${network.name}] skipped, no strategies found`);
      continue;
    }

    const client = getChainClient(network.chainId, rpcUrl);
    const fromBlockArg = String(argv["from-block"]).trim();
    const fromBlock = fromBlockArg
      ? BigInt(fromBlockArg)
      : getSubgraphStartBlock(network.name);
    const logChunkSize = BigInt(Number(argv["log-chunk"]) || 2000);
    const proposals = await collectProposalEvents(
      client,
      network.name,
      strategies,
      fromBlock,
      logChunkSize
    );
    const maxProposals = Number(argv["max-proposals"]);
    const proposalsToDiagnose =
      Number.isFinite(maxProposals) && maxProposals > 0
        ? proposals.slice(0, maxProposals)
        : proposals;

    const results = await mapLimit(
      proposalsToDiagnose,
      Number(argv.concurrency) || 8,
      async (proposal, index) => {
        if (
          (index + 1) % 100 === 0 ||
          index === proposalsToDiagnose.length - 1
        ) {
          console.log(
            `[${network.name}] diagnosing ${index + 1}/${proposalsToDiagnose.length}`
          );
        }
        return diagnoseProposal(client, network.name, proposal);
      }
    );

    allResults.push(...results);
  }

  const filteredResults = argv["only-problems"]
    ? allResults.filter(
        (result) => result.status !== "historical_ok"
      )
    : allResults;

  const summary = filteredResults.reduce((acc, item) => {
    const key = `${item.network}:${item.status}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\nSummary");
  console.table(summary);

  const problems = filteredResults.filter(
    (item) =>
      item.status === "call_error" ||
      item.status === "historical_mismatch_latest" ||
      item.status === "historical_empty" ||
      item.status === "historical_empty_latest_ok" ||
      item.status === "historical_revert" ||
      item.status === "historical_revert_latest_ok" ||
      item.status === "historical_getProposal_error" ||
      item.status === "getProposal_error"
  );

  if (problems.length > 0) {
    console.log("\nProblems");
    console.table(
      problems.slice(0, 100).map((item) => ({
        network: item.network,
        strategy: item.strategy,
        proposalNumber: item.proposalNumber,
        blockNumber: item.blockNumber,
        historicalGetProposal: item.historicalGetProposal,
        status: item.status,
        historicalFinalPointer: item.historicalFinalPointer,
        latestFinalPointer: item.latestFinalPointer,
        historicalCurrentPointerError: item.historicalCurrentPointerError,
        historicalLegacyProposalError: item.historicalLegacyProposalError,
        historicalGetMetadataPointerError: item.historicalGetMetadataPointerError,
      }))
    );
  }

  if (argv.out) {
    fs.writeFileSync(argv.out, JSON.stringify(filteredResults, null, 2));
    console.log(`\nSaved ${filteredResults.length} rows to ${argv.out}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
