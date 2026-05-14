import { NextResponse } from "next/server";
import {
  Address,
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainConfigMap, getConfigByChain } from "@/configs/chains";
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
  config?: {
    proposalType?: string | number | null;
  } | null;
  proposals?: Array<{ id: string }> | null;
};

type ChainRunResult = {
  chainId: number | string;
  discoveredStrategies: number;
  sent: Array<{
    strategy: Address;
    txHash: `0x${string}`;
    gasUsed: string;
    effectiveGasPrice?: string;
    gasCostWei?: string;
    gasTokenSymbol?: string;
    gasTokenUsdPrice?: number;
    gasCostUsd?: number;
  }>;
  skipped: Array<{ strategy: Address; reason: string }>;
  error?: string;
};

const REBALANCE_KEEPER_ABI = parseAbi([
  "function rebalance()",
  "function proposalType() view returns (uint8)",
  "function lastRebalanceAt() view returns (uint256)",
  "function rebalanceCooldown() view returns (uint256)",
  "function isAuthorizedRebalanceCaller(address) view returns (bool)",
  "error UnauthorizedRebalanceCaller(address caller)",
  "error RebalanceCooldownActive(uint256 secondsRemaining)",
]);

const STRATEGY_PAGE_SIZE = 500;
const STREAMING_PROPOSAL_TYPE = 2;
const ACTIVE_STATUS = 1;
const DISPUTED_STATUS = 5;
const REBALANCE_KEEPER_EXCLUDED_CHAIN_IDS = new Set<number>([421614]);

const STRATEGY_QUERY = `
  query RebalanceCandidates($first: Int!, $skip: Int!) {
    cvstrategies(
      first: $first
      skip: $skip
      where: { isEnabled: true, archived: false }
    ) {
      id
      config {
        proposalType
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
): Promise<Address[]> {
  let skip = 0;
  const selected: Address[] = [];

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
        selected.push(strategy.id as Address);
      }
    }

    if (page.length < STRATEGY_PAGE_SIZE) break;
    skip += STRATEGY_PAGE_SIZE;
  }

  return Array.from(new Set(selected.map((x) => x.toLowerCase()))).map(
    (x) => x as Address,
  );
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
        sent: [],
        skipped: [],
      };
    }

    const block = await publicClient.getBlock({ blockTag: "latest" });
    const now = Number(block.timestamp);
    const sent: Array<{
      strategy: Address;
      txHash: `0x${string}`;
      gasUsed: string;
      effectiveGasPrice?: string;
      gasCostWei?: string;
      gasTokenSymbol?: string;
      gasTokenUsdPrice?: number;
      gasCostUsd?: number;
    }> = [];
    const skipped: Array<{ strategy: Address; reason: string }> = [];
    const gasTokenSymbol = getViemChain(chainId).nativeCurrency.symbol;
    let gasTokenUsdPrice: number | undefined;

    try {
      gasTokenUsdPrice = await getGasTokenUsdPrice({
        chainId: chainConfig.id,
        symbol: gasTokenSymbol,
      });
    } catch (error) {
      console.warn("rebalance-keeper: failed to fetch gas token usd price", {
        chainId: chainConfig.id,
        gasTokenSymbol,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }

    for (const strategy of strategies) {
      try {
        const proposalType = Number(
          await publicClient.readContract({
            address: strategy,
            abi: REBALANCE_KEEPER_ABI,
            functionName: "proposalType",
          }),
        );
        if (proposalType !== STREAMING_PROPOSAL_TYPE) {
          skipped.push({ strategy, reason: "not_streaming_pool" });
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
            reason: `unauthorized_rebalance_caller:${account.address}`,
          });
          continue;
        }

        const [lastRebalanceAt, cooldown] = await Promise.all([
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

        const nextRebalanceAt = Number(lastRebalanceAt) + Number(cooldown);
        const secondsLeft = nextRebalanceAt - now;
        if (Number(cooldown) > 0 && secondsLeft > minSecondsLeft) {
          skipped.push({ strategy, reason: `cooldown_active_${secondsLeft}s` });
          continue;
        }

        const simulation = await publicClient.simulateContract({
          account,
          address: strategy,
          abi: REBALANCE_KEEPER_ABI,
          functionName: "rebalance",
        });

        if (dryRun) {
          skipped.push({ strategy, reason: "dry_run" });
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
        const gasCostUsd =
          gasCostWei != null && gasTokenUsdPrice != null ?
            Number(
              (
                Number(formatEther(BigInt(gasCostWei))) * gasTokenUsdPrice
              ).toFixed(6),
            )
          : undefined;

        console.info("rebalance-keeper: rebalance transaction confirmed", {
          chainId: chainConfig.id,
          strategy,
          txHash: hash,
          gasUsed,
          effectiveGasPrice,
          gasCostWei,
          gasTokenSymbol,
          gasTokenUsdPrice,
          gasCostUsd,
        });

        sent.push({
          strategy,
          txHash: hash,
          gasUsed,
          effectiveGasPrice,
          gasCostWei,
          gasTokenSymbol,
          gasTokenUsdPrice,
          gasCostUsd,
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown_error";
        const normalizedReason =
          reason.includes("gas required exceeds allowance (0)") ?
            `${reason}\nHint: keeper ${account.address} has no native balance on chain ${chainConfig.id}. Fund this wallet to pay gas.`
          : reason;
        skipped.push({ strategy, reason: normalizedReason });
      }
    }

    return {
      chainId: chainConfig.id,
      discoveredStrategies: strategies.length,
      sent,
      skipped,
    };
  } catch (error) {
    return {
      chainId: String(chainId),
      discoveredStrategies: 0,
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
      gasCostUsd:
        acc.gasCostUsd +
        curr.sent.reduce((sum, tx) => sum + (tx.gasCostUsd ?? 0), 0),
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
    gasCostUsd: Number(totals.gasCostUsd.toFixed(6)),
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
        gasCostUsd: Number(totals.gasCostUsd.toFixed(6)),
      },
      results,
    },
    { status: totals.failedChains > 0 ? 207 : 200 },
  );
}
