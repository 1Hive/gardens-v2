import Ably from "ably";
import { NextResponse } from "next/server";
import {
  Address,
  PublicClient,
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ACTIVE_STATUS,
  DEFAULT_SIGNIFICANT_RATE_CHANGE_BPS,
  DISPUTED_STATUS,
  safeEvaluateRebalanceDecision,
} from "./rebalanceDecision";
import { chainConfigMap, getConfigByChain } from "@/configs/chains";
import { CHANGE_EVENT_CHANNEL_NAME } from "@/globals";
import { getGasTokenUsdPrice } from "@/services/coingecko";
import { ChainId } from "@/types";
import { getViemChain } from "@/utils/web3";

type Params = {
  params: Promise<{
    chain: string;
  }>;
};

type StrategyCandidate = {
  id: string;
  metadata?: {
    title?: string | null;
  } | null;
  registryCommunity?: {
    id?: string | null;
    communityName?: string | null;
  } | null;
  config?: {
    proposalType?: string | number | null;
  } | null;
  stream?: {
    updatedAt?: string | number | null;
  } | null;
  proposals?: Array<{ id: string }> | null;
};

type SelectedStrategyCandidate = {
  address: Address;
  title: string | null;
  communityAddress: Address | null;
  communityTitle: string | null;
  lastRebalanceAt: string | null;
  lastRebalanceDateTime: string | null;
};

type ChainRunResult = {
  chainId: number | string;
  discoveredStrategies: number;
  gasCostUsdTotal: number;
  sent: Array<{
    strategy: Address;
    title?: string | null;
    communityAddress?: Address | null;
    communityTitle?: string | null;
    uri?: string | null;
    lastRebalanceAt?: string | null;
    lastRebalanceDateTime?: string | null;
    rebalanceReason?: string;
    rebalanceError?: string;
    txHash: `0x${string}`;
    gasUsed: string;
    effectiveGasPrice?: string;
    gasCostWei?: string;
    gasTokenSymbol?: string;
    gasTokenUsdPrice?: number;
    gasCostUsd?: number;
  }>;
  skipped: Array<{
    strategy: Address;
    title?: string | null;
    communityAddress?: Address | null;
    communityTitle?: string | null;
    uri?: string | null;
    lastRebalanceAt?: string | null;
    lastRebalanceDateTime?: string | null;
    rebalanceError?: string;
    reason: string;
  }>;
  error?: string;
};

type ConfirmedRebalanceTx = ChainRunResult["sent"][number];

const REBALANCE_KEEPER_ABI = parseAbi([
  "function rebalance()",
  "function proposalType() view returns (uint8)",
  "function lastRebalanceAt() view returns (uint256)",
  "function rebalanceCooldown() view returns (uint256)",
  "function isAuthorizedRebalanceCaller(address) view returns (bool)",
  "function proposalCounter() view returns (uint256)",
  "function getPoolAmount() view returns (uint256)",
  "function totalPointsActivated() view returns (uint256)",
  "function cvParams() view returns (uint256 maxRatio, uint256 weight, uint256 decay, uint256 minThresholdPoints)",
  "function calculateThreshold(uint256 requestedAmount) view returns (uint256)",
  "function calculateProposalConviction(uint256 proposalId) view returns (uint256)",
  "function getProposal(uint256 proposalId) view returns (address submitter, address beneficiary, address requestedToken, uint256 requestedAmount, uint256 stakedAmount, uint8 proposalStatus, uint256 blockLast, uint256 convictionLast, uint256 threshold, uint256 voterStakedPoints, uint256 arbitrableConfigVersion, uint256 protocol)",
  "function streamingEscrow(uint256 proposalId) view returns (address)",
  "function streamingRatePerSecond() view returns (uint256)",
  "function superfluidToken() view returns (address)",
  "function superfluidGDA() view returns (address)",
  "error UnauthorizedRebalanceCaller(address caller)",
  "error RebalanceCooldownActive(uint256 secondsRemaining)",
]);

const SUPER_TOKEN_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
]);

const SUPERFLUID_POOL_ABI = parseAbi([
  "function getTotalFlowRate() view returns (int96)",
  "function getUnits(address memberAddr) view returns (uint128)",
  "function getMemberFlowRate(address memberAddr) view returns (int96)",
]);

const STREAMING_ESCROW_ABI = parseAbi([
  "function beneficiary() view returns (address)",
  "function disputed() view returns (bool)",
]);

const CFA_FORWARDER_ABI = parseAbi([
  "function getFlowrate(address token, address sender, address receiver) view returns (int96)",
]);

const STRATEGY_PAGE_SIZE = 500;
const STREAMING_PROPOSAL_TYPE = 2;
const USD_PRECISION = 6;
const USD_PRECISION_MULTIPLIER = 10 ** USD_PRECISION;
const WEI_PER_NATIVE_TOKEN = 10n ** 18n;
const REBALANCE_KEEPER_EXCLUDED_CHAIN_IDS = new Set<number>([421614]);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const GARDENS_APP_BASE_URL = "https://app.gardens.fund";

const CFA_V1_FORWARDER =
  "0xcfA132E353cB4E398080B9700609bb008eceB125" as Address;
const PROPOSAL_MULTICALL_CHUNK_SIZE = 75;

let ablyClient: Ably.Rest | null = null;
let hasWarnedMissingAblyKey = false;

const getAblyClient = () => {
  if (ablyClient != null) return ablyClient;

  const key = process.env.NEXT_ABLY_API_KEY;
  if (!key) {
    if (!hasWarnedMissingAblyKey) {
      console.warn(
        "rebalance-keeper: NEXT_ABLY_API_KEY is unset; stream updates will not be published",
      );
      hasWarnedMissingAblyKey = true;
    }
    return null;
  }

  // Ably.Rest uses plain HTTP requests, so reusing a client here is only to
  // avoid rebuilding it for every rebalance confirmation.
  ablyClient = new Ably.Rest({ key });
  return ablyClient;
};

const publishStreamRebalance = async ({
  chainId,
  strategy,
}: {
  chainId: ChainId;
  strategy: Address;
}) => {
  const client = getAblyClient();
  if (!client) return;

  await client.channels.get(CHANGE_EVENT_CHANNEL_NAME).publish("stream", {
    topic: "stream",
    function: "rebalance",
    containerId: strategy,
    chainId,
  });
};

const roundToUsdPrecision = (value: number) =>
  Math.round(value * USD_PRECISION_MULTIPLIER) / USD_PRECISION_MULTIPLIER;

const calculateGasCostUsd = ({
  gasCostWei,
  gasTokenUsdPrice,
}: {
  gasCostWei: bigint;
  gasTokenUsdPrice: number;
}) => {
  const gasTokenUsdScaled = BigInt(
    Math.round(gasTokenUsdPrice * USD_PRECISION_MULTIPLIER),
  );
  const gasCostUsdScaled =
    (gasCostWei * gasTokenUsdScaled + WEI_PER_NATIVE_TOKEN / 2n) /
    WEI_PER_NATIVE_TOKEN;

  return Number(gasCostUsdScaled) / USD_PRECISION_MULTIPLIER;
};

const normalizeTitle = (title: string | null | undefined) => {
  const trimmed = title?.trim();
  return trimmed === "" ? null : trimmed ?? null;
};

const normalizeTimestamp = (timestamp: string | number | null | undefined) => {
  if (timestamp == null) return null;
  const raw = String(timestamp).trim();
  return raw === "" ? null : raw;
};

const timestampToDateTime = (timestamp: string | number | null | undefined) => {
  const normalized = normalizeTimestamp(timestamp);
  if (normalized == null) return null;

  const seconds = Number(normalized);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;

  return new Date(seconds * 1000).toISOString();
};

const buildGardenUri = ({
  chainId,
  communityAddress,
  strategyAddress,
}: {
  chainId: number | string;
  communityAddress: Address | null;
  strategyAddress: Address;
}) =>
  communityAddress == null ? null : (
    `${GARDENS_APP_BASE_URL}/gardens/${chainId}/${communityAddress}/${strategyAddress}`
  );

const readBigintEnv = (key: string, fallback: bigint) => {
  const raw = process.env[key];
  if (raw == null || raw.trim() === "") return fallback;
  try {
    const parsed = BigInt(raw);
    return parsed >= 0n ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const getCvParam = (
  cvParams: unknown,
  index: number,
  key: "maxRatio" | "weight" | "decay" | "minThresholdPoints",
) => {
  const tuple = cvParams as Record<string, unknown> & Array<unknown>;
  return BigInt((tuple[key] ?? tuple[index] ?? 0) as bigint | number | string);
};

const getProposalStatus = (proposal: unknown) => {
  const tuple = proposal as Record<string, unknown> & Array<unknown>;
  return Number(tuple.proposalStatus ?? tuple[5] ?? -1);
};

type MulticallResult = {
  status: "success" | "failure";
  result?: unknown;
  error?: Error;
};

const requireMulticallResult = (result: MulticallResult, label: string) => {
  if (result.status !== "success") {
    throw new Error(`${label}_read_failed`);
  }

  return result.result;
};

const optionalMulticallBigInt = (result: MulticallResult) => {
  if (result.status !== "success" || result.result == null) return undefined;
  return BigInt(result.result as bigint);
};

async function multicallInChunks({
  publicClient,
  contracts,
  chunkSize = PROPOSAL_MULTICALL_CHUNK_SIZE,
}: {
  publicClient: PublicClient;
  contracts: Array<{
    address: Address;
    abi:
      | typeof REBALANCE_KEEPER_ABI
      | typeof SUPER_TOKEN_ABI
      | typeof SUPERFLUID_POOL_ABI
      | typeof STREAMING_ESCROW_ABI
      | typeof CFA_FORWARDER_ABI;
    functionName: string;
    args?: readonly unknown[];
  }>;
  chunkSize?: number;
}) {
  const results: MulticallResult[] = [];

  for (let index = 0; index < contracts.length; index += chunkSize) {
    const chunk = contracts.slice(index, index + chunkSize);
    const chunkResults = await publicClient.multicall({
      allowFailure: true,
      contracts: chunk as any,
    });
    results.push(...(chunkResults as MulticallResult[]));
  }

  return results;
}

async function shouldRunRebalance({
  publicClient,
  strategy,
}: {
  publicClient: PublicClient;
  strategy: Address;
}): Promise<{ shouldRun: boolean; reason?: string; error?: string }> {
  const thresholdBps = readBigintEnv(
    "STREAMING_REBALANCE_SIGNIFICANT_RATE_CHANGE_BPS",
    DEFAULT_SIGNIFICANT_RATE_CHANGE_BPS,
  );

  try {
    const strategyReads = await publicClient.multicall({
      allowFailure: true,
      contracts: [
        {
          address: strategy,
          abi: REBALANCE_KEEPER_ABI,
          functionName: "proposalCounter",
        },
        {
          address: strategy,
          abi: REBALANCE_KEEPER_ABI,
          functionName: "getPoolAmount",
        },
        {
          address: strategy,
          abi: REBALANCE_KEEPER_ABI,
          functionName: "totalPointsActivated",
        },
        {
          address: strategy,
          abi: REBALANCE_KEEPER_ABI,
          functionName: "cvParams",
        },
        {
          address: strategy,
          abi: REBALANCE_KEEPER_ABI,
          functionName: "calculateThreshold",
          args: [0n],
        },
        {
          address: strategy,
          abi: REBALANCE_KEEPER_ABI,
          functionName: "streamingRatePerSecond",
        },
        {
          address: strategy,
          abi: REBALANCE_KEEPER_ABI,
          functionName: "superfluidToken",
        },
        {
          address: strategy,
          abi: REBALANCE_KEEPER_ABI,
          functionName: "superfluidGDA",
        },
      ] as const,
    });
    const [
      proposalCounterResult,
      poolAmountResult,
      totalPointsActivatedResult,
      cvParamsResult,
      thresholdResult,
      streamingRatePerSecondResult,
      superfluidTokenResult,
      superfluidGDAResult,
    ] = strategyReads as MulticallResult[];
    const proposalCounter = requireMulticallResult(
      proposalCounterResult,
      "proposal_counter",
    );
    const poolAmount = requireMulticallResult(poolAmountResult, "pool_amount");
    const totalPointsActivated = requireMulticallResult(
      totalPointsActivatedResult,
      "total_points_activated",
    );
    const cvParams = requireMulticallResult(cvParamsResult, "cv_params");
    const threshold = requireMulticallResult(thresholdResult, "threshold");
    const streamingRatePerSecond = requireMulticallResult(
      streamingRatePerSecondResult,
      "streaming_rate",
    );
    const superfluidToken = requireMulticallResult(
      superfluidTokenResult,
      "superfluid_token",
    );
    const superfluidGDA = requireMulticallResult(
      superfluidGDAResult,
      "superfluid_gda",
    );

    const superTokenAddress = superfluidToken as Address;
    const gdaAddress = superfluidGDA as Address;
    if (superTokenAddress === ZERO_ADDRESS || gdaAddress === ZERO_ADDRESS) {
      return { shouldRun: false, reason: "streaming_not_configured" };
    }

    const [currentTotalFlowRateResult, superTokenBalanceResult] =
      (await publicClient.multicall({
        allowFailure: true,
        contracts: [
          {
            address: gdaAddress,
            abi: SUPERFLUID_POOL_ABI,
            functionName: "getTotalFlowRate",
          },
          {
            address: superTokenAddress,
            abi: SUPER_TOKEN_ABI,
            functionName: "balanceOf",
            args: [strategy],
          },
        ] as const,
      })) as MulticallResult[];

    const currentTotalFlowRate =
      optionalMulticallBigInt(currentTotalFlowRateResult) ?? 0n;
    const superTokenBalance =
      optionalMulticallBigInt(superTokenBalanceResult) ?? 0n;

    const proposalCount = Number(proposalCounter);
    if (proposalCount === 0) {
      return currentTotalFlowRate === 0n ?
          { shouldRun: false, reason: "no_proposals" }
        : { shouldRun: true, reason: "no_proposals_stop_flow" };
    }

    if (BigInt(poolAmount as bigint) === 0n && currentTotalFlowRate === 0n) {
      return { shouldRun: false, reason: "pool_empty_zero_flow" };
    }

    const decay = getCvParam(cvParams, 2, "decay");
    const proposalContracts = Array.from(
      { length: proposalCount },
      (_, index) => BigInt(index + 1),
    ).flatMap((proposalId) => [
      {
        address: strategy,
        abi: REBALANCE_KEEPER_ABI,
        functionName: "getProposal",
        args: [proposalId],
      },
      {
        address: strategy,
        abi: REBALANCE_KEEPER_ABI,
        functionName: "streamingEscrow",
        args: [proposalId],
      },
      {
        address: strategy,
        abi: REBALANCE_KEEPER_ABI,
        functionName: "calculateProposalConviction",
        args: [proposalId],
      },
    ]);
    const proposalResults = await multicallInChunks({
      publicClient,
      contracts: proposalContracts,
    });

    const proposalSnapshots: Array<{
      escrow: Address;
      status: number;
      conviction: bigint;
    }> = [];

    for (let index = 0; index < proposalCount; index++) {
      const resultIndex = index * 3;
      const proposal = requireMulticallResult(
        proposalResults[resultIndex],
        `proposal_${index + 1}`,
      );
      const escrowAddress = requireMulticallResult(
        proposalResults[resultIndex + 1],
        `proposal_${index + 1}_escrow`,
      );
      const conviction = requireMulticallResult(
        proposalResults[resultIndex + 2],
        `proposal_${index + 1}_conviction`,
      );
      const escrow = escrowAddress as Address;
      if (escrow === ZERO_ADDRESS) continue;

      proposalSnapshots.push({
        escrow,
        status: getProposalStatus(proposal),
        conviction: BigInt(conviction as bigint),
      });
    }

    const memberResults = await multicallInChunks({
      publicClient,
      contracts: proposalSnapshots.flatMap((proposal) => [
        {
          address: gdaAddress,
          abi: SUPERFLUID_POOL_ABI,
          functionName: "getUnits",
          args: [proposal.escrow],
        },
        {
          address: gdaAddress,
          abi: SUPERFLUID_POOL_ABI,
          functionName: "getMemberFlowRate",
          args: [proposal.escrow],
        },
      ]),
    });

    const escrowStateResults = await multicallInChunks({
      publicClient,
      contracts: proposalSnapshots.flatMap((proposal) => [
        {
          address: proposal.escrow,
          abi: STREAMING_ESCROW_ABI,
          functionName: "beneficiary",
        },
        {
          address: proposal.escrow,
          abi: STREAMING_ESCROW_ABI,
          functionName: "disputed",
        },
      ]),
    });

    const escrowOutflowContracts = proposalSnapshots.flatMap(
      (proposal, index) => {
        const beneficiaryResult = escrowStateResults[index * 2];
        const beneficiary =
          (
            beneficiaryResult?.status === "success" &&
            beneficiaryResult.result != null &&
            isAddress(String(beneficiaryResult.result))
          ) ?
            (beneficiaryResult.result as Address)
          : null;

        return beneficiary == null || beneficiary === ZERO_ADDRESS ?
            []
          : [
              {
                address: CFA_V1_FORWARDER,
                abi: CFA_FORWARDER_ABI,
                functionName: "getFlowrate",
                args: [superTokenAddress, proposal.escrow, beneficiary],
              },
            ];
      },
    );
    const escrowOutflowResults = await multicallInChunks({
      publicClient,
      contracts: escrowOutflowContracts,
    });
    let escrowOutflowResultIndex = 0;

    return safeEvaluateRebalanceDecision(
      {
        // Candidate discovery already filters enabled strategies. The internal
        // _isStrategyEnabled selector is not exposed on every strategy diamond.
        isStrategyEnabled: true,
        proposalCount,
        poolAmount: BigInt(poolAmount as bigint),
        totalPointsActivated: BigInt(totalPointsActivated as bigint),
        decay,
        threshold: BigInt(threshold as bigint),
        streamingRatePerSecond: BigInt(streamingRatePerSecond as bigint),
        superTokenBalance,
        currentTotalFlowRate,
        hasStreamingConfig: true,
        thresholdBps,
        proposals: proposalSnapshots.map((proposal, index) => {
          const beneficiaryResult = escrowStateResults[index * 2];
          const disputedResult = escrowStateResults[index * 2 + 1];
          const hasReadableBeneficiary =
            beneficiaryResult?.status === "success" &&
            beneficiaryResult.result != null &&
            isAddress(String(beneficiaryResult.result)) &&
            beneficiaryResult.result !== ZERO_ADDRESS;
          const currentOutflowRate =
            hasReadableBeneficiary ?
              optionalMulticallBigInt(
                escrowOutflowResults[escrowOutflowResultIndex++],
              ) ?? 0n
            : undefined;

          return {
            status: proposal.status,
            conviction: proposal.conviction,
            currentUnits:
              optionalMulticallBigInt(memberResults[index * 2]) ?? 0n,
            currentFlowRate:
              optionalMulticallBigInt(memberResults[index * 2 + 1]) ?? 0n,
            currentOutflowRate,
            escrowDisputed:
              disputedResult?.status === "success" ?
                Boolean(disputedResult.result)
              : undefined,
            hasEscrow: true,
          };
        }),
      },
      (error) => {
        console.warn("rebalance-keeper: decision failed, rebalancing safely", {
          strategy,
          error: error instanceof Error ? error.message : "unknown_error",
        });
        console.warn(
          "rebalance-keeper: preflight failed, falling back to simulate",
          {
            strategy,
            error: message,
          },
        );
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.warn(
      "rebalance-keeper: preflight failed, falling back to simulate",
      {
        strategy,
        error: message,
      },
    );
    return { shouldRun: true, reason: "preflight_failed", error: message };
  }
}

const STRATEGY_QUERY = `
  query RebalanceCandidates($first: Int!, $skip: Int!) {
    cvstrategies(
      first: $first
      skip: $skip
      where: { isEnabled: true, archived: false }
    ) {
      id
      metadata {
        title
      }
      registryCommunity {
        id
        communityName
      }
      config {
        proposalType
      }
      stream {
        updatedAt
      }
      proposals(first: 1, where: { proposalStatus_in: [${ACTIVE_STATUS}, ${DISPUTED_STATUS}] }) {
        id
      }
    }
  }
`;

async function querySubgraph<T>(
  url: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Subgraph HTTP error (${res.status})`);
  }
  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };
  const errors = json.errors ?? [];
  if (errors.length > 0) {
    throw new Error(
      `Subgraph query failed: ${errors.map((e) => e.message).join("; ")}`,
    );
  }
  if (json.data == null) {
    throw new Error("Subgraph response missing data");
  }
  return json.data;
}

async function fetchStrategyCandidates(
  primaryUrl: string,
  fallbackUrl?: string,
): Promise<SelectedStrategyCandidate[]> {
  let skip = 0;
  const selected = new Map<string, SelectedStrategyCandidate>();

  // Retry the same page on fallback if primary fails.
  const fetchPage = async (offset: number) => {
    const vars = { first: STRATEGY_PAGE_SIZE, skip: offset };
    try {
      return await querySubgraph<{ cvstrategies: StrategyCandidate[] }>(
        primaryUrl,
        STRATEGY_QUERY,
        vars,
      );
    } catch (error) {
      if (!fallbackUrl || fallbackUrl === primaryUrl) throw error;
      return querySubgraph<{ cvstrategies: StrategyCandidate[] }>(
        fallbackUrl,
        STRATEGY_QUERY,
        vars,
      );
    }
  };

  while (true) {
    const data = await fetchPage(skip);
    const page = data.cvstrategies ?? [];
    if (!page.length) break;

    for (const strategy of page) {
      const proposalType = Number(strategy.config?.proposalType ?? -1);
      const hasActiveOrDisputed = (strategy.proposals?.length ?? 0) > 0;
      if (
        proposalType === STREAMING_PROPOSAL_TYPE &&
        hasActiveOrDisputed &&
        isAddress(strategy.id)
      ) {
        const address = strategy.id.toLowerCase() as Address;
        const communityAddress =
          (
            strategy.registryCommunity?.id != null &&
            isAddress(strategy.registryCommunity.id)
          ) ?
            (strategy.registryCommunity.id.toLowerCase() as Address)
          : null;
        selected.set(address, {
          address,
          title: normalizeTitle(strategy.metadata?.title),
          communityAddress,
          communityTitle: normalizeTitle(
            strategy.registryCommunity?.communityName,
          ),
          lastRebalanceAt: normalizeTimestamp(strategy.stream?.updatedAt),
          lastRebalanceDateTime: timestampToDateTime(
            strategy.stream?.updatedAt,
          ),
        });
      }
    }

    if (page.length < STRATEGY_PAGE_SIZE) break;
    skip += STRATEGY_PAGE_SIZE;
  }

  return Array.from(selected.values());
}

async function runKeeperForChain({
  chainId,
  privateKey,
  dryRun,
  minSecondsLeft,
}: {
  chainId: ChainId;
  privateKey: string;
  dryRun: boolean;
  minSecondsLeft: number;
}): Promise<ChainRunResult> {
  const chainConfig = getConfigByChain(chainId);
  if (!chainConfig) {
    return {
      chainId: String(chainId),
      discoveredStrategies: 0,
      gasCostUsdTotal: 0,
      sent: [],
      skipped: [],
      error: `Unsupported chain: ${String(chainId)}`,
    };
  }

  try {
    const publicClient = createPublicClient({
      chain: getViemChain(chainId),
      transport: http(chainConfig.rpcUrl),
    });
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: getViemChain(chainId),
      transport: http(chainConfig.rpcUrl),
    });

    const subgraphPrimary =
      chainConfig.publishedSubgraphUrl ?? chainConfig.subgraphUrl;
    const subgraphFallback =
      chainConfig.subgraphUrl && chainConfig.subgraphUrl !== subgraphPrimary ?
        chainConfig.subgraphUrl
      : undefined;

    const strategies = await fetchStrategyCandidates(
      subgraphPrimary,
      subgraphFallback,
    );
    if (!strategies.length) {
      return {
        chainId: chainConfig.id,
        discoveredStrategies: 0,
        gasCostUsdTotal: 0,
        sent: [],
        skipped: [],
      };
    }

    const block = await publicClient.getBlock({ blockTag: "latest" });
    const now = Number(block.timestamp);
    const sent: ConfirmedRebalanceTx[] = [];
    const skipped: ChainRunResult["skipped"] = [];
    let gasCostUsdTotal = 0;
    const gasTokenSymbol = getViemChain(chainId).nativeCurrency.symbol;
    let gasTokenUsdPrice: number | undefined;

    if (!chainConfig.isTestnet) {
      try {
        gasTokenUsdPrice = await getGasTokenUsdPrice({
          chainId: chainConfig.id,
          symbol: gasTokenSymbol,
        });
      } catch (error) {
        console.warn("rebalance-keeper: failed to fetch gas token usd price", {
          chainId: chainConfig.id,
          gasTokenSymbol,
          impact: "rebalance will continue without USD gas cost enrichment",
          error:
            error instanceof Error ?
              { name: error.name, message: error.message, stack: error.stack }
            : error,
        });
      }
    } else {
      console.info("rebalance-keeper: skipping testnet gas USD enrichment", {
        chainId: chainConfig.id,
        gasTokenSymbol,
      });
    }

    for (const strategyCandidate of strategies) {
      const {
        address: strategy,
        title,
        communityAddress,
        communityTitle,
        lastRebalanceAt,
        lastRebalanceDateTime,
      } = strategyCandidate;
      const strategyResponseContext = {
        title,
        communityAddress,
        communityTitle,
        lastRebalanceAt,
        lastRebalanceDateTime,
        uri: buildGardenUri({
          chainId: chainConfig.id,
          communityAddress,
          strategyAddress: strategy,
        }),
      };
      try {
        const proposalType = Number(
          await publicClient.readContract({
            address: strategy,
            abi: REBALANCE_KEEPER_ABI,
            functionName: "proposalType",
          }),
        );
        if (proposalType !== STREAMING_PROPOSAL_TYPE) {
          skipped.push({
            strategy,
            ...strategyResponseContext,
            reason: "not_streaming_pool",
          });
          continue;
        }

        const isAuthorizedCaller = await publicClient.readContract({
          address: strategy,
          abi: REBALANCE_KEEPER_ABI,
          functionName: "isAuthorizedRebalanceCaller",
          args: [account.address],
        });
        if (!isAuthorizedCaller) {
          skipped.push({
            strategy,
            ...strategyResponseContext,
            reason: `unauthorized_rebalance_caller:${account.address}`,
          });
          continue;
        }

        const [contractLastRebalanceAt, cooldown] = await Promise.all([
          publicClient.readContract({
            address: strategy,
            abi: REBALANCE_KEEPER_ABI,
            functionName: "lastRebalanceAt",
          }),
          publicClient.readContract({
            address: strategy,
            abi: REBALANCE_KEEPER_ABI,
            functionName: "rebalanceCooldown",
          }),
        ]);

        const nextRebalanceAt =
          Number(contractLastRebalanceAt) + Number(cooldown);
        const secondsLeft = nextRebalanceAt - now;
        if (Number(cooldown) > 0 && secondsLeft > minSecondsLeft) {
          skipped.push({
            strategy,
            ...strategyResponseContext,
            reason: `cooldown_active_${secondsLeft}s`,
          });
          continue;
        }

        const rebalanceNeed = await shouldRunRebalance({
          publicClient,
          strategy,
        });
        if (!rebalanceNeed.shouldRun) {
          skipped.push({
            strategy,
            ...strategyResponseContext,
            rebalanceError: rebalanceNeed.error,
            reason: rebalanceNeed.reason ?? "rebalance_noop",
          });
          continue;
        }

        const simulation = await publicClient.simulateContract({
          account,
          address: strategy,
          abi: REBALANCE_KEEPER_ABI,
          functionName: "rebalance",
        });

        if (dryRun) {
          skipped.push({
            strategy,
            ...strategyResponseContext,
            rebalanceError: rebalanceNeed.error,
            reason: "dry_run",
          });
          continue;
        }

        const hash = await walletClient.writeContract(simulation.request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const gasUsed = receipt.gasUsed.toString();
        const effectiveGasPrice = receipt.effectiveGasPrice?.toString();
        const gasCostWei =
          receipt.effectiveGasPrice != null ?
            (receipt.gasUsed * receipt.effectiveGasPrice).toString()
          : undefined;
        const confirmedTx: ConfirmedRebalanceTx = {
          strategy,
          ...strategyResponseContext,
          rebalanceReason: rebalanceNeed.reason,
          rebalanceError: rebalanceNeed.error,
          txHash: hash,
          gasUsed,
          effectiveGasPrice,
          gasCostWei,
          gasTokenSymbol,
        };

        try {
          const gasCostWeiValue =
            gasCostWei != null ? BigInt(gasCostWei) : undefined;
          const gasCostUsd =
            gasCostWeiValue != null && gasTokenUsdPrice != null ?
              calculateGasCostUsd({
                gasCostWei: gasCostWeiValue,
                gasTokenUsdPrice,
              })
            : undefined;

          if (gasTokenUsdPrice != null) {
            confirmedTx.gasTokenUsdPrice = gasTokenUsdPrice;
          }
          if (gasCostUsd != null) {
            confirmedTx.gasCostUsd = gasCostUsd;
            gasCostUsdTotal += gasCostUsd;
          }
        } catch (error) {
          console.warn(
            "rebalance-keeper: failed to enrich confirmed rebalance transaction",
            {
              chainId: chainConfig.id,
              strategy,
              txHash: hash,
              error: error instanceof Error ? error.message : "unknown_error",
            },
          );
        }

        console.info("rebalance-keeper: rebalance transaction confirmed", {
          chainId: chainConfig.id,
          ...confirmedTx,
        });

        try {
          await publishStreamRebalance({
            chainId: chainConfig.id,
            strategy,
          });
        } catch (error) {
          console.warn("rebalance-keeper: failed to publish stream update", {
            chainId: chainConfig.id,
            strategy,
            txHash: hash,
            error: error instanceof Error ? error.message : "unknown_error",
          });
        }

        sent.push(confirmedTx);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown_error";
        const normalizedReason =
          reason.includes("gas required exceeds allowance (0)") ?
            `${reason}\nHint: keeper ${account.address} has no native balance on chain ${chainConfig.id}. Fund this wallet to pay gas.`
          : reason;
        skipped.push({
          strategy,
          ...strategyResponseContext,
          reason: normalizedReason,
        });
      }
    }

    return {
      chainId: chainConfig.id,
      discoveredStrategies: strategies.length,
      gasCostUsdTotal: roundToUsdPrecision(gasCostUsdTotal),
      sent,
      skipped,
    };
  } catch (error) {
    return {
      chainId: String(chainId),
      discoveredStrategies: 0,
      gasCostUsdTotal: 0,
      sent: [],
      skipped: [],
      error: error instanceof Error ? error.message : "unknown_error",
    };
  }
}

export async function GET(req: Request, { params }: Params) {
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "");
  if (apiKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { chain: chainParam } = await params;
  const isAllChains =
    chainParam.toLowerCase() === "all" ||
    chainParam.toLowerCase() === "all-chains";
  const chainId = /^\d+$/.test(chainParam) ? Number(chainParam) : chainParam;

  const privateKey =
    process.env.STREAMING_REBALANCER_PK ?? process.env.KEEPER_WALLET_PK;
  if (!privateKey) {
    return NextResponse.json(
      {
        error:
          "Missing keeper private key env var (STREAMING_REBALANCER_PK / KEEPER_WALLET_PK)",
      },
      { status: 500 },
    );
  }

  const requestUrl = new URL(req.url);
  const dryRun = requestUrl.searchParams.get("dryRun") === "1";
  const minSecondsLeft = Number(
    requestUrl.searchParams.get("minSecondsLeft") ?? "3",
  );

  const chainIds =
    isAllChains ?
      Array.from(
        new Set(
          Object.values(chainConfigMap)
            .map((cfg) => cfg.id)
            .filter(
              (id): id is number =>
                typeof id === "number" &&
                !REBALANCE_KEEPER_EXCLUDED_CHAIN_IDS.has(id),
            ),
        ),
      )
    : [chainId as ChainId];

  const results = await Promise.all(
    chainIds.map((id) =>
      runKeeperForChain({
        chainId: id as ChainId,
        privateKey,
        dryRun,
        minSecondsLeft,
      }),
    ),
  );

  const totals = results.reduce(
    (acc, curr) => ({
      discoveredStrategies:
        acc.discoveredStrategies + curr.discoveredStrategies,
      sentTxs: acc.sentTxs + curr.sent.length,
      gasUsed:
        acc.gasUsed +
        curr.sent.reduce((sum, tx) => sum + BigInt(tx.gasUsed), 0n),
      gasCostUsd: acc.gasCostUsd + curr.gasCostUsdTotal,
      skipped: acc.skipped + curr.skipped.length,
      failedChains: acc.failedChains + (curr.error ? 1 : 0),
    }),
    {
      discoveredStrategies: 0,
      sentTxs: 0,
      gasUsed: 0n,
      gasCostUsd: 0,
      skipped: 0,
      failedChains: 0,
    },
  );

  console.info("rebalance-keeper: completed run", {
    mode: isAllChains ? "all_chains" : "single_chain",
    dryRun,
    discoveredStrategies: totals.discoveredStrategies,
    sentTxs: totals.sentTxs,
    gasUsed: totals.gasUsed.toString(),
    gasCostUsd: roundToUsdPrecision(totals.gasCostUsd),
    skipped: totals.skipped,
    failedChains: totals.failedChains,
  });

  return NextResponse.json(
    {
      message:
        totals.sentTxs > 0 ?
          "Rebalance keeper completed."
        : "No rebalance tx sent after preflight checks.",
      mode: isAllChains ? "all_chains" : "single_chain",
      dryRun,
      totals: {
        ...totals,
        gasUsed: totals.gasUsed.toString(),
        gasCostUsd: roundToUsdPrecision(totals.gasCostUsd),
      },
      results,
    },
    { status: totals.failedChains > 0 ? 207 : 200 },
  );
}
