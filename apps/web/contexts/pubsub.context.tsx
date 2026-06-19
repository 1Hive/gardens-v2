import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Realtime } from "ably";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { uniqueId } from "lodash-es";
import { toast } from "react-toastify";
import { useMediaQuery } from "usehooks-ts";
import { TransactionReceipt } from "viem";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { getConfigByChain } from "@/configs/chains";
import { CHANGE_EVENT_CHANNEL_NAME } from "@/globals";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useFlag } from "@/hooks/useFlag";
import { queryByChain } from "@/providers/queryByChain";
import { ChainId } from "@/types";
import { getEnvPublicClient } from "@/utils/publicClient";

// Define the shape of your context data
interface PubSubContextData {
  connected: boolean;
  /**
   * Subscribes to a channel, optionally filtering messages based on a flexible criteria.
   *
   * @param {Array|Object} filter - The filtering criteria.
   *   - If an array, each element is treated as an OR condition.
   *   - If an object, it represents an AND condition on message fields.
   *   - Nested arrays within the object act as OR conditions for the specific field.
   * @param {ChangeEventPayload} callback - The function to call when a matching message is received.
   *
   * @example
   * // Subscribe to messages with specific events or matching a pattern:
   * channel.subscribe(["event1", "event2", "pattern.*"], callback);
   *
   * @example
   * // Subscribe to messages where all specified fields match:
   * channel.subscribe({ field1: "value1", field2: "value2" }, callback);
   *
   * @example
   * // Subscribe to messages where a field contains any of the specified values:
   * channel.subscribe({ field1: ["value1", "value2", "value3"] }, callback);
   *
   * @example
   * // Combine multiple filtering layers:
   * channel.subscribe(
   *   [
   *     { field1: "value1", field2: ["value2", "value3"] },
   *     { field3: "value4" }
   *   ],
   *   callback
   * );
   */
  subscribe: (
    scope: ChangeEventScope[] | ChangeEventScope,
    onChangeEvent: (payload: ChangeEventPayload) => void,
  ) => string;
  unsubscribe: (subscriptionId: string) => void;
  publish: (payload: ChangeEventPayload) => void;
  publishAfterIndexed: (
    receipt: TransactionReceipt,
    payload: ChangeEventPayload,
    options?: PublishAfterIndexedOptions,
  ) => void;
  messages: ChangeEventPayload[];
  pendingIndexedPublishes: PendingIndexedPublish[];
}

interface IndexingLagContextData {
  latestIndexedBlocksByChain: Record<number, string>;
  routeIndexingLagByChain: Record<number, RouteIndexingLagStatus>;
}

export type SubscriptionId = string;

export type ChangeEventTopic =
  | "community"
  | "garden"
  | "pool"
  | "proposal"
  | "member"
  | "stream";

type Native = string | number | boolean | null | undefined;

export type ChangeEventScope = {
  topic: ChangeEventTopic;
  type?: ChangeEventPayload["type"] | ChangeEventPayload["type"][];
  containerId?:
    | ChangeEventPayload["containerId"]
    | ChangeEventPayload["containerId"][];
  function?: ChangeEventPayload["function"] | ChangeEventPayload["function"][];
  chainId?: ChangeEventPayload["chainId"] | ChangeEventPayload["chainId"][];
  id?: ChangeEventPayload["id"] | ChangeEventPayload["id"][];
} & { [key: string]: Native | Native[] };

export type ChangeEventPayload = {
  topic: ChangeEventTopic;
  type?: "add" | "update" | "delete";
  function?: string;
  chainId?: ChainId;
  containerId?: string | number;
  id?: string | number;
  silent?: boolean;
} & { [key: string]: Native };

export type ProposalOptimisticStatus =
  | "inactive"
  | "active"
  | "paused"
  | "cancelled"
  | "executed"
  | "disputed"
  | "rejected";

export type ProposalCreatedOptimistic = {
  kind: "proposal-created";
  strategyId: string;
  proposalNumber: string;
  proposalId?: string;
  metadataHash: string;
  beneficiary?: string;
  requestedAmount?: string;
  proposalType?: string;
  submitter?: string;
};

export type ProposalAllocationOptimistic = {
  kind: "proposal-allocation";
  strategyId: string;
  allocator: string;
  targets: {
    proposalId?: string;
    proposalNumber: string;
    amount: string;
  }[];
  deltas?: {
    proposalId?: string;
    proposalNumber: string;
    deltaSupport: string;
  }[];
};

export type ProposalStatusOptimistic = {
  kind: "proposal-status";
  strategyId: string;
  proposalId?: string;
  proposalNumber: string;
  status: ProposalOptimisticStatus;
};

export type CommunityMemberOptimistic = {
  kind: "community-member";
  communityId: string;
  memberAddress: string;
  isRegistered: boolean;
  stakedTokens?: string;
};

export type PoolGovernanceOptimistic = {
  kind: "pool-governance";
  strategyId: string;
  communityId?: string;
  memberAddress: string;
  isActivated: boolean;
  activatedPoints?: string;
  supportSnapshot?: {
    proposalId?: string;
    proposalNumber: string;
    amount: string;
  }[];
};

export type IndexedPublishOptimistic =
  | ProposalCreatedOptimistic
  | ProposalAllocationOptimistic
  | ProposalStatusOptimistic
  | CommunityMemberOptimistic
  | PoolGovernanceOptimistic;

export type PublishAfterIndexedOptions = {
  optimistic?: IndexedPublishOptimistic;
};

export type PendingIndexedPublish = {
  txHash: `0x${string}`;
  blockNumber: string;
  chainId: number;
  createdAt: number;
  publishPayload?: ChangeEventPayload;
  optimistic?: IndexedPublishOptimistic;
};

type LatestIndexedBlockResult = {
  _meta?: {
    block?: {
      number?: number | string | null;
    } | null;
    hasIndexingErrors?: boolean | null;
  } | null;
};

type SubgraphIndexingStatusResult = {
  indexingStatusForCurrentVersion?: {
    chains?: Array<{
      currentBlock?: {
        number?: number | string | null;
      } | null;
      finalBlock?: {
        number?: number | string | null;
      } | null;
      latestBlock?: {
        number?: number | string | null;
      } | null;
      chainHeadBlock?: {
        number?: number | string | null;
      } | null;
    } | null> | null;
  } | null;
};

export type RouteIndexingLagStatus = {
  indexedBlock: string;
  comparisonBlock: string;
  lagBlocks: string;
  source: "subgraph-status" | "rpc";
};

const INDEXING_STORAGE_KEY = "gardens.pending-indexed-publishes.v1";
const INDEXING_TOAST_ID = "gardens-indexing-toast";
const INDEXING_PROBLEM_TOAST_ID = "gardens-indexing-problem-toast";
const INDEXING_TOAST_CLASS_NAME = "no-icon hidden opacity-50 md:block";
const INDEXING_TOAST_STYLE: React.CSSProperties = {
  width: "fit-content",
  marginLeft: "auto",
  marginBottom: "4.5rem",
};
export const INDEXING_PROBLEM_DELAY_MS = 60_000;
const INDEXING_POLL_INITIAL_DELAY_MS = 5000;
const INDEXING_POLL_MAX_DELAY_MS = 60000;
const INDEXING_POLL_BACKOFF_FACTOR = 2;
const ROUTE_INDEXING_POLL_INTERVAL_MS = 5 * 60_000;
const INDEXING_LOG_PREFIX = "[indexing]";
const SECONDS_PER_DAY = 86_400;
const LATEST_INDEXED_BLOCK_QUERY = `
  query LatestIndexedBlock {
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
  }
`;

const SUBGRAPH_INDEXING_STATUS_QUERY = `
  query IndexingStatusForCurrentVersion($subgraphName: String!) {
    indexingStatusForCurrentVersion(subgraphName: $subgraphName) {
      chains {
        currentBlock {
          number
        }
        finalBlock {
          number
        }
        latestBlock {
          number
        }
        chainHeadBlock {
          number
        }
      }
    }
  }
`;

const isRpcTransactionHash = (hash: unknown): hash is `0x${string}` =>
  typeof hash === "string" && /^0x[a-fA-F0-9]{64}$/.test(hash);

const toFiniteChainId = (chainId: unknown): number | null => {
  const parsedChainId =
    typeof chainId === "string" || typeof chainId === "number" ?
      Number(chainId)
    : NaN;
  return Number.isFinite(parsedChainId) ? parsedChainId : null;
};

const pendingKey = (record: Pick<PendingIndexedPublish, "chainId" | "txHash">) =>
  `${record.chainId}:${record.txHash.toLowerCase()}`;

const getLatestTxBlock = (records: PendingIndexedPublish[]) =>
  records.reduce<bigint | null>((latest, record) => {
    const blockNumber = BigInt(record.blockNumber);
    return latest == null || blockNumber > latest ? blockNumber : latest;
  }, null);

const getIndexingLagBlocks = (
  indexedBlock: string | undefined,
  records: PendingIndexedPublish[],
) => {
  if (!indexedBlock) return null;

  try {
    const latestTxBlock = getLatestTxBlock(records);
    if (latestTxBlock == null) return null;
    const lagBlocks = latestTxBlock - BigInt(indexedBlock);
    return lagBlocks > 0n ? lagBlocks : 0n;
  } catch (error) {
    console.debug(`${INDEXING_LOG_PREFIX} failed to calculate lag blocks`, {
      indexedBlock,
      records: records.map(summarizePendingRecord),
      error,
    });
    return null;
  }
};

const getIndexingLagTooltip = (lagBlocks: bigint | null) =>
  lagBlocks == null ?
    "Indexing is lagging behind"
  : `Indexing is lagging behind ${lagBlocks.toString()} ${
      lagBlocks === 1n ? "block" : "blocks"
    }`;

const parseBlockNumber = (value: number | string | null | undefined) => {
  if (value == null) return null;

  try {
    return BigInt(value);
  } catch (error) {
    console.debug(`${INDEXING_LOG_PREFIX} failed to parse block number`, {
      value,
      error,
    });
    return null;
  }
};

const getSubgraphStatusContext = (subgraphUrl: string) => {
  try {
    const url = new URL(subgraphUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 3 || parts[0] !== "query") {
      return null;
    }

    return {
      url: `${url.origin}/index-node/graphql`,
      subgraphName: parts[2],
    };
  } catch (error) {
    console.debug(`${INDEXING_LOG_PREFIX} failed to derive subgraph status url`, {
      subgraphUrl,
      error,
    });
    return null;
  }
};

export const getTransactionLabel = (count: number) =>
  count === 1 ? "1 transaction" : `${count} transactions`;

const getOneDayLagThresholdBlocks = (chainId: number) => {
  const blockTime = getConfigByChain(chainId)?.blockTime;
  if (blockTime == null || blockTime <= 0) {
    return null;
  }

  return BigInt(Math.ceil(SECONDS_PER_DAY / blockTime));
};

export const hasOneDayIndexingLag = ({
  chainId,
  currentChainRecords,
  latestIndexedBlock,
  routeIndexingLag,
}: {
  chainId: number;
  currentChainRecords: PendingIndexedPublish[];
  latestIndexedBlock?: string;
  routeIndexingLag?: RouteIndexingLagStatus;
}) => {
  const routeLagBlocks =
    routeIndexingLag ? parseBlockNumber(routeIndexingLag.lagBlocks) : null;
  const effectiveLagBlocks =
    currentChainRecords.length > 0 ?
      getIndexingLagBlocks(latestIndexedBlock, currentChainRecords)
    : routeLagBlocks;
  const oneDayLagThresholdBlocks = getOneDayLagThresholdBlocks(chainId);

  return (
    effectiveLagBlocks != null &&
    oneDayLagThresholdBlocks != null &&
    effectiveLagBlocks >= oneDayLagThresholdBlocks
  );
};

export function matchesChangeScope(
  payload: ChangeEventPayload | undefined,
  scope: ChangeEventScope[] | ChangeEventScope | undefined,
) {
  if (!payload || !scope) return true;
  const scopes = Array.isArray(scope) ? scope : [scope];

  return scopes.some((scopeObj) =>
    Object.entries(scopeObj).every(([key, scopeValue]) => {
      if (scopeValue == null) return true;
      const values = Array.isArray(scopeValue) ? scopeValue : [scopeValue];
      const payloadValue = payload[key];
      if (payloadValue == null) return false;

      return values.some(
        (value) =>
          value?.toString().toLowerCase() ===
          payloadValue.toString().toLowerCase(),
      );
    }),
  );
}

const summarizePendingRecord = (record: PendingIndexedPublish) => ({
  key: pendingKey(record),
  txHash: record.txHash,
  blockNumber: record.blockNumber,
  chainId: record.chainId,
  topic: record.publishPayload?.topic,
  type: record.publishPayload?.type,
  function: record.publishPayload?.function,
  containerId: record.publishPayload?.containerId,
  id: record.publishPayload?.id,
  optimisticKind: record.optimistic?.kind,
});

function isSerializablePayload(payload: unknown): payload is ChangeEventPayload {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as ChangeEventPayload;
  return typeof candidate.topic === "string";
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isSerializableOptimistic(
  optimistic: unknown,
): optimistic is IndexedPublishOptimistic {
  if (!isStringRecord(optimistic) || typeof optimistic.kind !== "string") {
    return false;
  }

  if (optimistic.kind === "proposal-created") {
    return (
      typeof optimistic.strategyId === "string" &&
      typeof optimistic.proposalNumber === "string" &&
      typeof optimistic.metadataHash === "string"
    );
  }

  if (optimistic.kind === "proposal-allocation") {
    return (
      typeof optimistic.strategyId === "string" &&
      typeof optimistic.allocator === "string" &&
      Array.isArray(optimistic.targets)
    );
  }

  if (optimistic.kind === "proposal-status") {
    return (
      typeof optimistic.strategyId === "string" &&
      typeof optimistic.proposalNumber === "string" &&
      typeof optimistic.status === "string"
    );
  }

  if (optimistic.kind === "community-member") {
    return (
      typeof optimistic.communityId === "string" &&
      typeof optimistic.memberAddress === "string" &&
      typeof optimistic.isRegistered === "boolean"
    );
  }

  if (optimistic.kind === "pool-governance") {
    return (
      typeof optimistic.strategyId === "string" &&
      typeof optimistic.memberAddress === "string" &&
      typeof optimistic.isActivated === "boolean" &&
      (optimistic.supportSnapshot == null ||
        (Array.isArray(optimistic.supportSnapshot) &&
          optimistic.supportSnapshot.every(
            (item) =>
              item != null &&
              typeof item === "object" &&
              typeof item.proposalNumber === "string" &&
              typeof item.amount === "string" &&
              (!("proposalId" in item) ||
                item.proposalId == null ||
                typeof item.proposalId === "string"),
          )))
    );
  }

  return false;
}

function normalizeRecord(record: unknown): PendingIndexedPublish | null {
  if (!record || typeof record !== "object") return null;
  const candidate = record as PendingIndexedPublish;
  if (
    !isRpcTransactionHash(candidate.txHash) ||
    toFiniteChainId(candidate.chainId) == null ||
    candidate.blockNumber == null ||
    Number.isNaN(Number(candidate.blockNumber))
  ) {
    console.debug(`${INDEXING_LOG_PREFIX} dropping malformed stored record`, {
      record,
    });
    return null;
  }

  return {
    txHash: candidate.txHash,
    blockNumber: String(candidate.blockNumber),
    chainId: Number(candidate.chainId),
    createdAt:
      typeof candidate.createdAt === "number" ?
        candidate.createdAt
      : Date.now(),
    publishPayload:
      isSerializablePayload(candidate.publishPayload) ?
        candidate.publishPayload
      : undefined,
    optimistic:
      isSerializableOptimistic(candidate.optimistic) ?
        candidate.optimistic
      : undefined,
  };
}

function readPendingIndexedPublishes(): PendingIndexedPublish[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INDEXING_STORAGE_KEY);
    if (!raw) {
      console.debug(`${INDEXING_LOG_PREFIX} no pending records in storage`);
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.debug(`${INDEXING_LOG_PREFIX} storage payload is not an array`, {
        parsed,
      });
      return [];
    }
    const records = parsed
      .map(normalizeRecord)
      .filter((record): record is PendingIndexedPublish => record != null);
    console.info(`${INDEXING_LOG_PREFIX} restored pending records`, {
      count: records.length,
      records: records.map(summarizePendingRecord),
    });
    return records;
  } catch (error) {
    console.warn(
      `${INDEXING_LOG_PREFIX} failed to read pending indexed publishes`,
      error,
    );
    return [];
  }
}

function writePendingIndexedPublishes(records: PendingIndexedPublish[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INDEXING_STORAGE_KEY, JSON.stringify(records));
    console.debug(`${INDEXING_LOG_PREFIX} persisted pending records`, {
      count: records.length,
      records: records.map(summarizePendingRecord),
    });
  } catch (error) {
    console.warn(
      `${INDEXING_LOG_PREFIX} failed to persist pending indexed publishes`,
      error,
    );
  }
}

function arePendingIndexedPublishesEqual(
  left: PendingIndexedPublish[],
  right: PendingIndexedPublish[],
) {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return left.every((leftRecord, index) => {
    const rightRecord = right[index];
    return (
      rightRecord != null &&
      leftRecord.txHash === rightRecord.txHash &&
      leftRecord.blockNumber === rightRecord.blockNumber &&
      leftRecord.chainId === rightRecord.chainId &&
      leftRecord.createdAt === rightRecord.createdAt &&
      JSON.stringify(leftRecord.publishPayload) ===
        JSON.stringify(rightRecord.publishPayload) &&
      JSON.stringify(leftRecord.optimistic) ===
        JSON.stringify(rightRecord.optimistic)
    );
  });
}

function IndexingToast({
  count,
  isProblem,
}: {
  count: number;
  isProblem: boolean;
}) {
  const transactionLabel = getTransactionLabel(count);

  return (
    <div className="flex flex-row items-center gap-3 px-3 py-1.5">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          isProblem ? "tooltip tooltip-right" : ""
        }`}
        data-tip={isProblem ? "Indexing problem" : undefined}
      >
        {isProblem ?
          <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
        : <LoadingSpinner size="loading-sm" />}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="text-sm font-semibold text-neutral-content dark:text-neutral-inverted-content">
          Indexing
        </div>
        <div className="text-xs text-neutral-content dark:text-neutral-inverted-content">
          {transactionLabel}
        </div>
      </div>
    </div>
  );
}

function IndexingToastClearButton({
  closeToast,
}: {
  closeToast?: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        closeToast?.(event);
      }}
      className="btn btn-ghost btn-xs mr-2 h-auto min-h-0 rounded border border-transparent px-2 py-1 text-xs font-semibold leading-none text-neutral-content hover:border-neutral-soft-content/60 hover:bg-transparent hover:text-neutral-inverted-content"
    >
      Clear
    </button>
  );
}

function IndexingProblemToast({ lagBlocks }: { lagBlocks: bigint | null }) {
  const lagTooltip = getIndexingLagTooltip(lagBlocks);

  return (
    <div className="flex min-w-0 flex-row items-start gap-3 px-3 py-1.5">
      <div className="tooltip tooltip-right mt-0.5" data-tip={lagTooltip}>
        <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="text-sm font-semibold">Indexing problem detected</div>
        <a
          href="https://status.thegraph.com/"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium underline underline-offset-2"
        >
          Check The Graph status
        </a>
      </div>
    </div>
  );
}

// Create the context with an initial default value (optional)
const PubSubContext = createContext<PubSubContextData | undefined>(undefined);
const IndexingLagContext = createContext<IndexingLagContextData | undefined>(
  undefined,
);

// Helper hook for consuming the context
export function usePubSubContext() {
  const context = useContext(PubSubContext);
  if (!context) {
    throw new Error(
      "⚡ WS: usePubSubContext must be used within a WebSocketProvider",
    );
  }
  return context;
}

export function useIndexingLagContext() {
  const context = useContext(IndexingLagContext);
  if (!context) {
    throw new Error(
      "⚡ WS: useIndexingLagContext must be used within a WebSocketProvider",
    );
  }
  return context;
}

export function PubSubProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChangeEventPayload[]>([]);
  const [connected, setConnected] = useState(false);
  const [pendingIndexedPublishes, setPendingIndexedPublishes] = useState<
    PendingIndexedPublish[]
  >([]);
  const [latestIndexedBlocksByChain, setLatestIndexedBlocksByChain] = useState<
    Record<number, string>
  >({});
  const [routeIndexingLagByChain, setRouteIndexingLagByChain] = useState<
    Record<number, RouteIndexingLagStatus>
  >({});
  const [indexingPollCompletedAtByChain, setIndexingPollCompletedAtByChain] =
    useState<Record<number, number>>({});
  const chainId = useChainIdFromPath();
  const isMobileViewport = useMediaQuery("(max-width: 767px)");
  const skipPublished = useFlag("skipPublished");
  const indexingPollInFlight = useRef(false);
  const isProgrammaticIndexingToastDismiss = useRef(false);
  const shownIndexingProblemEpisodeByChain = useRef<Record<number, string>>({});
  const [indexingProblemCheckTick, setIndexingProblemCheckTick] = useState(0);

  const ablyClient = useMemo(
    () =>
      new Realtime({
        authUrl: "/api/ably-auth",
        queryTime: true,
        authMethod: "POST",
      }),
    [],
  );

  const subscriptionsMap = useRef(
    new Map<
      SubscriptionId,
      {
        scopes: ChangeEventScope[];
        onChangeEvent: (payload: ChangeEventPayload) => void;
      }
    >(),
  );

  useEffect(() => {
    ablyClient.channels.get(CHANGE_EVENT_CHANNEL_NAME).subscribe((message) => {
      console.debug("⚡ WS: sub message", {
        message,
        reDispatch: () => {
          dispatch(message.data as ChangeEventPayload);
        },
      });
      const data = message.data as ChangeEventPayload;
      setMessages((prevMessages) => [...prevMessages, data]);
      dispatch(data);
    });

    return () => {
      ablyClient.channels.get(CHANGE_EVENT_CHANNEL_NAME).unsubscribe();
    };
  }, []);

  const subMap = subscriptionsMap.current;

  const setAndPersistPendingIndexedPublishes = useCallback(
    (
      updater:
        | PendingIndexedPublish[]
        | ((
            records: PendingIndexedPublish[],
          ) => PendingIndexedPublish[]),
    ) => {
      setPendingIndexedPublishes((current) => {
        const next =
          typeof updater === "function" ? updater(current) : updater;
        if (arePendingIndexedPublishesEqual(current, next)) {
          console.debug(
            `${INDEXING_LOG_PREFIX} pending records unchanged, skipping state update`,
            {
              count: current.length,
              records: current.map(summarizePendingRecord),
            },
          );
          return current;
        }
        console.debug(`${INDEXING_LOG_PREFIX} pending records state update`, {
          previousCount: current.length,
          nextCount: next.length,
          previousRecords: current.map(summarizePendingRecord),
          nextRecords: next.map(summarizePendingRecord),
        });
        writePendingIndexedPublishes(next);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const restored = readPendingIndexedPublishes();
    console.info(`${INDEXING_LOG_PREFIX} provider restored storage`, {
      count: restored.length,
      records: restored.map(summarizePendingRecord),
    });
    setPendingIndexedPublishes(restored);
    if (restored.length > 0) {
      writePendingIndexedPublishes(restored);
    }
  }, []);

  useEffect(() => {
    ablyClient.connection.on("connected", () => {
      console.debug("⚡ WS: connected");
      setConnected(true);
    });

    ablyClient.connection.on("disconnected", (ev) => {
      console.debug("⚡ WS: disconnected", ev);
      setConnected(false);
      const normalCloseReason = 10000;
      if (ev.reason?.code !== normalCloseReason) {
        console.debug("⚡ WS: lost connection, reconnecting...", {
          reason: ev.reason,
        });
      }
    });
  }, []);

  const dispatch = (pubPayload: ChangeEventPayload) => {
    subMap.forEach(({ scopes, onChangeEvent }) => {
      if (
        scopes.find((scopeObj) => {
          return Object.keys(scopeObj).every((key) => {
            if (!Array.isArray(scopeObj[key])) {
              scopeObj[key] = [scopeObj[key] as Native];
            }

            return (scopeObj[key] as Native[]).find((scopeItem) => {
              return (
                pubPayload[key] === undefined ||
                scopeItem?.toString().toLowerCase() ===
                  pubPayload[key]?.toString().toLowerCase()
              );
            });
          });
        })
      ) {
        onChangeEvent(pubPayload);
      }
    });
  };

  const subscribe = useCallback(
    (
      scope: ChangeEventScope[] | ChangeEventScope,
      onChangeEvent: (payload: ChangeEventPayload) => void,
    ) => {
      const subscriptionId = uniqueId();
      console.debug(`⚡ WS: subscribe ${subscriptionId}`, scope);
      subMap.set(subscriptionId, {
        scopes: (Array.isArray(scope) ? scope : [scope]) as ChangeEventScope[],
        onChangeEvent,
      });
      return subscriptionId;
    },
    [],
  );

  const unsubscribe = useCallback((subscriptionId: SubscriptionId) => {
    console.debug(
      `⚡ WS: unsubscribe ${subscriptionId}`,
      subMap.get(subscriptionId)?.scopes,
    );
    subMap.delete(subscriptionId);
  }, []);

  const publish = useCallback(
    (payload: ChangeEventPayload) => {
      payload = {
        ...payload,
        chainId: +(payload.chainId ?? chainId ?? "NaN"),
      };
      console.debug("⚡ WS: publish", payload);
      ablyClient.channels
        .get(CHANGE_EVENT_CHANNEL_NAME)
        .publish(payload.topic, payload);
    },
    [ablyClient.channels, chainId],
  );

  const publishAfterIndexed = useCallback(
    (
      receipt: TransactionReceipt,
      payload: ChangeEventPayload,
      options?: PublishAfterIndexedOptions,
    ) => {
      const resolvedChainId = toFiniteChainId(payload.chainId ?? chainId);
      console.info(`${INDEXING_LOG_PREFIX} publishAfterIndexed called`, {
        txHash: receipt.transactionHash,
        receiptBlockNumber: receipt.blockNumber?.toString(),
        payloadChainId: payload.chainId,
        routeChainId: chainId,
        resolvedChainId,
        payload,
        optimistic: options?.optimistic,
      });
      if (
        !isRpcTransactionHash(receipt.transactionHash) ||
        resolvedChainId == null ||
        receipt.blockNumber == null
      ) {
        console.warn(
          `${INDEXING_LOG_PREFIX} cannot queue indexed publish, publishing silently now`,
          {
            hasValidHash: isRpcTransactionHash(receipt.transactionHash),
            hasResolvedChainId: resolvedChainId != null,
            hasBlockNumber: receipt.blockNumber != null,
            receipt,
            payload,
          },
        );
        publish({ ...payload, silent: true });
        return;
      }

      const record: PendingIndexedPublish = {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber.toString(),
        chainId: resolvedChainId,
        createdAt: Date.now(),
        publishPayload: {
          ...payload,
          chainId: resolvedChainId,
        },
        optimistic: options?.optimistic,
      };

      console.info(`${INDEXING_LOG_PREFIX} queued pending indexed publish`, {
        record: summarizePendingRecord(record),
      });

      setAndPersistPendingIndexedPublishes((records) => {
        const recordsMap = new Map(
          records.map((pendingRecord) => [
            pendingKey(pendingRecord),
            pendingRecord,
          ]),
        );
        recordsMap.set(pendingKey(record), record);
        return [...recordsMap.values()];
      });
    },
    [chainId, publish, setAndPersistPendingIndexedPublishes],
  );

  const fetchLatestIndexedBlockForChain = useCallback(
    async (targetChainId: number) => {
      const config = getConfigByChain(targetChainId);
      if (!config?.subgraphUrl) {
        console.warn(`${INDEXING_LOG_PREFIX} missing subgraph config`, {
          chainId: targetChainId,
        });
        return null;
      }

      console.debug(`${INDEXING_LOG_PREFIX} querying latest indexed block`, {
        chainId: targetChainId,
        subgraphUrl:
          skipPublished || !config.publishedSubgraphUrl ?
            config.subgraphUrl
          : config.publishedSubgraphUrl,
        skipPublished,
      });
      const result = await queryByChain<LatestIndexedBlockResult>(
        config,
        LATEST_INDEXED_BLOCK_QUERY,
        {},
        undefined,
        skipPublished,
      );
      const resolvedResult =
        result.error && !skipPublished && config.publishedSubgraphUrl ?
          await queryByChain<LatestIndexedBlockResult>(
            config,
            LATEST_INDEXED_BLOCK_QUERY,
            {},
            undefined,
            true,
          )
        : result;

      if (result.error && resolvedResult !== result) {
        console.warn(
          `${INDEXING_LOG_PREFIX} latest indexed block query failed through published subgraph, retried hosted`,
          {
            chainId: targetChainId,
            error: result.error,
          },
        );
      }

      if (resolvedResult.error) {
        console.warn(`${INDEXING_LOG_PREFIX} latest indexed block query failed`, {
          chainId: targetChainId,
          error: resolvedResult.error,
        });
        return null;
      }

      if (resolvedResult.data?._meta?.hasIndexingErrors) {
        console.warn(`${INDEXING_LOG_PREFIX} subgraph reports errors`, {
          chainId: targetChainId,
        });
      }

      const indexedBlock = resolvedResult.data?._meta?.block?.number;
      if (indexedBlock == null || Number.isNaN(Number(indexedBlock))) {
        console.warn(
          `${INDEXING_LOG_PREFIX} latest indexed block missing from response`,
          {
            chainId: targetChainId,
            data: resolvedResult.data,
          },
        );
        return null;
      }

      console.info(`${INDEXING_LOG_PREFIX} latest indexed block`, {
        chainId: targetChainId,
        indexedBlock: indexedBlock.toString(),
        hasIndexingErrors: resolvedResult.data?._meta?.hasIndexingErrors,
      });
      return BigInt(indexedBlock);
    },
    [skipPublished],
  );

  const fetchRouteIndexingLagForChain = useCallback(
    async (targetChainId: number) => {
      const indexedBlock = await fetchLatestIndexedBlockForChain(targetChainId);
      if (indexedBlock == null) {
        return null;
      }

      const config = getConfigByChain(targetChainId);
      if (!config?.subgraphUrl) {
        return null;
      }

      const statusContext = getSubgraphStatusContext(config.subgraphUrl);
      if (statusContext) {
        try {
          const statusResult = await queryByChain<
            SubgraphIndexingStatusResult,
            { subgraphName: string }
          >(
            config,
            SUBGRAPH_INDEXING_STATUS_QUERY,
            {
              subgraphName: statusContext.subgraphName,
            },
            {
              url: statusContext.url,
            },
            true,
          );

          if (!statusResult.error) {
            const statusChain =
              statusResult.data?.indexingStatusForCurrentVersion?.chains?.find(
                (chain) => chain != null,
              ) ?? null;
            const statusIndexedBlock =
              parseBlockNumber(statusChain?.currentBlock?.number) ?? indexedBlock;
            const comparisonBlock =
              parseBlockNumber(statusChain?.finalBlock?.number) ??
              parseBlockNumber(statusChain?.chainHeadBlock?.number) ??
              parseBlockNumber(statusChain?.latestBlock?.number);

            if (
              comparisonBlock != null &&
              comparisonBlock >= statusIndexedBlock
            ) {
              return {
                indexedBlock: statusIndexedBlock,
                comparisonBlock,
                lagBlocks: comparisonBlock - statusIndexedBlock,
                source: "subgraph-status" as const,
              };
            }
          } else {
            console.debug(
              `${INDEXING_LOG_PREFIX} subgraph status query unavailable, falling back to rpc`,
              {
                chainId: targetChainId,
                error: statusResult.error,
              },
            );
          }
        } catch (error) {
          console.debug(
            `${INDEXING_LOG_PREFIX} subgraph status query failed, falling back to rpc`,
            {
              chainId: targetChainId,
              error,
            },
          );
        }
      }

      try {
        const currentBlock = await getEnvPublicClient(targetChainId).getBlockNumber();
        if (currentBlock < indexedBlock) {
          return null;
        }

        return {
          indexedBlock,
          comparisonBlock: currentBlock,
          lagBlocks: currentBlock - indexedBlock,
          source: "rpc" as const,
        };
      } catch (error) {
        console.warn(`${INDEXING_LOG_PREFIX} failed to fetch chain head block`, {
          chainId: targetChainId,
          error,
        });
        return null;
      }
    },
    [fetchLatestIndexedBlockForChain],
  );

  useEffect(() => {
    const routeChainId = toFiniteChainId(chainId);
    if (routeChainId == null) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;
    const pollRouteIndexingLag = async () => {
      const status = await fetchRouteIndexingLagForChain(routeChainId);
      if (cancelled) {
        return;
      }

      if (status != null) {
        setLatestIndexedBlocksByChain((current) => ({
          ...current,
          [routeChainId]: status.indexedBlock.toString(),
        }));
        setRouteIndexingLagByChain((current) => ({
          ...current,
          [routeChainId]: {
            indexedBlock: status.indexedBlock.toString(),
            comparisonBlock: status.comparisonBlock.toString(),
            lagBlocks: status.lagBlocks.toString(),
            source: status.source,
          },
        }));
        setIndexingPollCompletedAtByChain((current) => ({
          ...current,
          [routeChainId]: Date.now(),
        }));
      }

      timeoutId = window.setTimeout(() => {
        void pollRouteIndexingLag();
      }, ROUTE_INDEXING_POLL_INTERVAL_MS);
    };

    void pollRouteIndexingLag();

    return () => {
      cancelled = true;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [chainId, fetchRouteIndexingLagForChain]);

  useEffect(() => {
    if (pendingIndexedPublishes.length === 0) {
      console.debug(`${INDEXING_LOG_PREFIX} polling idle, no pending records`);
      return;
    }

    let cancelled = false;
    let pollAttempt = 0;
    let timeoutId: number | undefined;

    const getNextPollDelay = () =>
      Math.min(
        INDEXING_POLL_INITIAL_DELAY_MS *
          INDEXING_POLL_BACKOFF_FACTOR ** pollAttempt,
        INDEXING_POLL_MAX_DELAY_MS,
      );

    const scheduleNextPoll = () => {
      if (cancelled) return;
      const delay = getNextPollDelay();
      console.debug(`${INDEXING_LOG_PREFIX} scheduling next poll`, {
        delay,
        pollAttempt,
      });
      pollAttempt += 1;
      timeoutId = window.setTimeout(pollIndexedBlocks, delay);
    };

    const pollIndexedBlocks = async () => {
      if (indexingPollInFlight.current) {
        console.debug(`${INDEXING_LOG_PREFIX} poll skipped, already in flight`);
        scheduleNextPoll();
        return;
      }
      indexingPollInFlight.current = true;
      const pendingChainIds = [
        ...new Set(pendingIndexedPublishes.map((record) => record.chainId)),
      ];

      try {
        const indexedBlocks = new Map<number, bigint>();
        console.info(`${INDEXING_LOG_PREFIX} poll started`, {
          pendingCount: pendingIndexedPublishes.length,
          chainIds: pendingChainIds,
          records: pendingIndexedPublishes.map(summarizePendingRecord),
        });

        await Promise.all(
          pendingChainIds.map(async (pendingChainId) => {
            const indexedBlock =
              await fetchLatestIndexedBlockForChain(pendingChainId);
            if (indexedBlock != null) {
              indexedBlocks.set(pendingChainId, indexedBlock);
            }
          }),
        );

        if (cancelled || indexedBlocks.size === 0) {
          console.debug(`${INDEXING_LOG_PREFIX} poll ended without block data`, {
            cancelled,
            indexedBlocksCount: indexedBlocks.size,
          });
          return;
        }

        setLatestIndexedBlocksByChain((current) => {
          const next = { ...current };
          indexedBlocks.forEach((indexedBlock, indexedChainId) => {
            next[indexedChainId] = indexedBlock.toString();
          });
          return next;
        });

        setAndPersistPendingIndexedPublishes((records) => {
          const remaining: PendingIndexedPublish[] = [];

          records.forEach((record) => {
            const indexedBlock = indexedBlocks.get(record.chainId);
            if (
              indexedBlock == null ||
              indexedBlock < BigInt(record.blockNumber)
            ) {
              console.info(`${INDEXING_LOG_PREFIX} record still waiting`, {
                record: summarizePendingRecord(record),
                indexedBlock: indexedBlock?.toString(),
                targetBlock: record.blockNumber,
              });
              remaining.push(record);
              return;
            }

            console.info(`${INDEXING_LOG_PREFIX} record indexed`, {
              record: summarizePendingRecord(record),
              indexedBlock: indexedBlock.toString(),
              targetBlock: record.blockNumber,
            });
            if (record.publishPayload) {
              console.info(`${INDEXING_LOG_PREFIX} releasing silent publish`, {
                record: summarizePendingRecord(record),
                payload: {
                  ...record.publishPayload,
                  chainId: record.chainId,
                  silent: true,
                },
              });
              publish({
                ...record.publishPayload,
                chainId: record.chainId,
                silent: true,
              });
            } else {
              console.debug(
                `${INDEXING_LOG_PREFIX} indexed record has no payload`,
                {
                  record: summarizePendingRecord(record),
                },
              );
            }
          });

          return remaining;
        });
      } catch (error) {
        console.warn(
          `${INDEXING_LOG_PREFIX} failed to poll latest indexed block`,
          error,
        );
      } finally {
        if (!cancelled && pendingChainIds.length > 0) {
          const completedAt = Date.now();
          setIndexingPollCompletedAtByChain((current) => {
            const next = { ...current };
            pendingChainIds.forEach((pendingChainId) => {
              next[pendingChainId] = completedAt;
            });
            return next;
          });
        }
        console.debug(`${INDEXING_LOG_PREFIX} poll finished`);
        indexingPollInFlight.current = false;
        scheduleNextPoll();
      }
    };

    void pollIndexedBlocks();

    return () => {
      cancelled = true;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    pendingIndexedPublishes,
    publish,
    fetchLatestIndexedBlockForChain,
    setAndPersistPendingIndexedPublishes,
  ]);

  useEffect(() => {
    const routeChainId = toFiniteChainId(chainId);
    const dismissIndexingToast = () => {
      if (!toast.isActive(INDEXING_TOAST_ID)) {
        isProgrammaticIndexingToastDismiss.current = false;
        return;
      }
      isProgrammaticIndexingToastDismiss.current = true;
      toast.dismiss(INDEXING_TOAST_ID);
    };

    if (isMobileViewport) {
      console.info(`${INDEXING_LOG_PREFIX} toast hidden on mobile viewport`, {
        routeChainId: chainId,
        pendingCount: pendingIndexedPublishes.length,
      });
      dismissIndexingToast();
      return;
    }

    if (routeChainId == null) {
      console.info(
        `${INDEXING_LOG_PREFIX} toast hidden, route has no chain id`,
        {
          routeChainId: chainId,
          pendingCount: pendingIndexedPublishes.length,
        },
      );
      dismissIndexingToast();
      return;
    }

    const currentChainRecords = pendingIndexedPublishes.filter(
      (record) => record.chainId === routeChainId,
    );
    const currentChainCount = currentChainRecords.length;

    if (currentChainCount === 0) {
      console.info(
        `${INDEXING_LOG_PREFIX} toast hidden, no pending records for route chain`,
        {
          routeChainId,
          totalPendingCount: pendingIndexedPublishes.length,
          allRecords: pendingIndexedPublishes.map(summarizePendingRecord),
        },
      );
      dismissIndexingToast();
      return;
    }

    const hasExceededProblemDelay = currentChainRecords.some(
      (record) => Date.now() - record.createdAt >= INDEXING_PROBLEM_DELAY_MS,
    );
    const content = (
      <IndexingToast count={currentChainCount} isProblem={hasExceededProblemDelay} />
    );
    const clearCurrentChain = () => {
      if (isProgrammaticIndexingToastDismiss.current) {
        isProgrammaticIndexingToastDismiss.current = false;
        console.debug(
          `${INDEXING_LOG_PREFIX} toast closed programmatically, keeping records`,
          { routeChainId },
        );
        return;
      }

      console.info(`${INDEXING_LOG_PREFIX} toast dismissed by user`, {
        routeChainId,
        clearedCount: currentChainCount,
      });
      setAndPersistPendingIndexedPublishes((records) =>
        records.filter((record) => record.chainId !== routeChainId),
      );
    };

    if (toast.isActive(INDEXING_TOAST_ID)) {
      console.info(`${INDEXING_LOG_PREFIX} toast updated`, {
        routeChainId,
        currentChainCount,
        latestIndexedBlock: latestIndexedBlocksByChain[routeChainId],
        isProblem: hasExceededProblemDelay,
      });
      toast.update(INDEXING_TOAST_ID, {
        render: content,
        type: "info",
        position: "bottom-right",
        closeButton: ({
          closeToast,
        }: {
          closeToast?: (event: React.MouseEvent<HTMLElement>) => void;
        }) => <IndexingToastClearButton closeToast={closeToast} />,
        closeOnClick: false,
        className: INDEXING_TOAST_CLASS_NAME,
        onClick: undefined,
        onClose: clearCurrentChain,
        style: INDEXING_TOAST_STYLE,
      });
    } else {
      console.info(`${INDEXING_LOG_PREFIX} toast shown`, {
        routeChainId,
        currentChainCount,
        latestIndexedBlock: latestIndexedBlocksByChain[routeChainId],
        isProblem: hasExceededProblemDelay,
      });
      toast.info(content, {
        toastId: INDEXING_TOAST_ID,
        position: "bottom-right",
        autoClose: false,
        closeOnClick: false,
        closeButton: ({
          closeToast,
        }: {
          closeToast?: (event: React.MouseEvent<HTMLElement>) => void;
        }) => <IndexingToastClearButton closeToast={closeToast} />,
        icon: false,
        className: INDEXING_TOAST_CLASS_NAME,
        onClose: clearCurrentChain,
        style: INDEXING_TOAST_STYLE,
      });
    }
  }, [
    chainId,
    isMobileViewport,
    indexingProblemCheckTick,
    latestIndexedBlocksByChain,
    pendingIndexedPublishes,
    setAndPersistPendingIndexedPublishes,
  ]);

  useEffect(() => {
    const routeChainId = toFiniteChainId(chainId);
    let timeoutId: number | undefined;

    const dismissProblemToast = () => {
      if (toast.isActive(INDEXING_PROBLEM_TOAST_ID)) {
        toast.dismiss(INDEXING_PROBLEM_TOAST_ID);
      }
    };

    if (isMobileViewport) {
      dismissProblemToast();
      return;
    }

    if (routeChainId == null) {
      dismissProblemToast();
      return;
    }

    const currentChainRecords = pendingIndexedPublishes.filter(
      (record) => record.chainId === routeChainId,
    );
    const routeIndexingLag = routeIndexingLagByChain[routeChainId];
    const routeLagBlocks =
      routeIndexingLag ? parseBlockNumber(routeIndexingLag.lagBlocks) : null;
    const hasPendingRecords = currentChainRecords.length > 0;
    const effectiveLagBlocks =
      hasPendingRecords ?
        getIndexingLagBlocks(
          latestIndexedBlocksByChain[routeChainId],
          currentChainRecords,
        )
      : routeLagBlocks;
    const oneDayLagThresholdBlocks = getOneDayLagThresholdBlocks(routeChainId);
    const hasOneDayLag = hasOneDayIndexingLag({
      chainId: routeChainId,
      currentChainRecords,
      latestIndexedBlock: latestIndexedBlocksByChain[routeChainId],
      routeIndexingLag,
    });

    if (!hasPendingRecords && !hasOneDayLag) {
      delete shownIndexingProblemEpisodeByChain.current[routeChainId];
      dismissProblemToast();
      return;
    }

    const now = Date.now();
    const oldestCreatedAt =
      hasPendingRecords ?
        Math.min(...currentChainRecords.map((record) => record.createdAt))
      : null;
    const lastPollCompletedAt =
      indexingPollCompletedAtByChain[routeChainId] ?? 0;
    const hasPollCompletedAfterOldestRecord =
      oldestCreatedAt != null && lastPollCompletedAt >= oldestCreatedAt;
    const waitMs = oldestCreatedAt != null ? now - oldestCreatedAt : null;
    const remainingMs =
      waitMs != null ? INDEXING_PROBLEM_DELAY_MS - waitMs : null;
    const episodeKey =
      hasPendingRecords ?
        `${routeChainId}:pending:${oldestCreatedAt}`
      : `${routeChainId}:lag:${routeIndexingLag?.comparisonBlock ?? "unknown"}:${routeIndexingLag?.lagBlocks ?? "unknown"}`;
    const hasShownCurrentEpisode =
      shownIndexingProblemEpisodeByChain.current[routeChainId] === episodeKey;

    if (
      hasPendingRecords &&
      remainingMs != null &&
      remainingMs > 0 &&
      !hasOneDayLag
    ) {
      dismissProblemToast();
      timeoutId = window.setTimeout(() => {
        setIndexingProblemCheckTick((tick) => tick + 1);
      }, remainingMs);
      return () => {
        if (timeoutId != null) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    if (hasPendingRecords && !hasPollCompletedAfterOldestRecord && !hasOneDayLag) {
      console.info(
        `${INDEXING_LOG_PREFIX} problem toast waiting for block poll chance`,
        {
          routeChainId,
          oldestCreatedAt,
          lastPollCompletedAt,
          currentChainCount: currentChainRecords.length,
          hasOneDayLag,
        },
      );
      dismissProblemToast();
      timeoutId = window.setTimeout(() => {
        setIndexingProblemCheckTick((tick) => tick + 1);
      }, 1_000);
      return () => {
        if (timeoutId != null) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    if (hasShownCurrentEpisode) {
      if (toast.isActive(INDEXING_PROBLEM_TOAST_ID)) {
        toast.update(INDEXING_PROBLEM_TOAST_ID, {
          render: <IndexingProblemToast lagBlocks={effectiveLagBlocks} />,
          type: "warning",
          position: "top-right",
          autoClose: false,
          icon: false,
          closeButton: true,
          closeOnClick: false,
        });
      }
      return;
    }

    shownIndexingProblemEpisodeByChain.current[routeChainId] = episodeKey;

    if (toast.isActive(INDEXING_PROBLEM_TOAST_ID)) {
      toast.update(INDEXING_PROBLEM_TOAST_ID, {
        render: <IndexingProblemToast lagBlocks={effectiveLagBlocks} />,
        type: "warning",
        position: "top-right",
        autoClose: false,
        icon: false,
        closeButton: true,
        closeOnClick: false,
      });
      console.info(`${INDEXING_LOG_PREFIX} problem toast updated`, {
        routeChainId,
        episodeKey,
        currentChainCount: currentChainRecords.length,
        lagBlocks: effectiveLagBlocks?.toString(),
        oneDayLagThresholdBlocks: oneDayLagThresholdBlocks?.toString(),
        triggeredBy:
          !hasPendingRecords ? "background-lag"
          : hasOneDayLag ? "one-day-lag"
          : "delay",
      });
      return;
    }

    console.info(`${INDEXING_LOG_PREFIX} problem toast shown`, {
      routeChainId,
      episodeKey,
      currentChainCount: currentChainRecords.length,
      lagBlocks: effectiveLagBlocks?.toString(),
      oneDayLagThresholdBlocks: oneDayLagThresholdBlocks?.toString(),
      triggeredBy:
        !hasPendingRecords ? "background-lag"
        : hasOneDayLag ? "one-day-lag"
        : "delay",
    });
    toast.warning(<IndexingProblemToast lagBlocks={effectiveLagBlocks} />, {
      toastId: INDEXING_PROBLEM_TOAST_ID,
      position: "top-right",
      autoClose: false,
      icon: false,
      closeButton: true,
      closeOnClick: false,
    });
  }, [
    chainId,
    isMobileViewport,
    indexingPollCompletedAtByChain,
    indexingProblemCheckTick,
    latestIndexedBlocksByChain,
    pendingIndexedPublishes,
    routeIndexingLagByChain,
  ]);

  const value = useMemo(
    () => ({
      connected,
      subscribe,
      unsubscribe,
      publish,
      publishAfterIndexed,
      messages,
      pendingIndexedPublishes,
    }),
    [
      connected,
      messages,
      pendingIndexedPublishes,
      publish,
      publishAfterIndexed,
      subscribe,
      unsubscribe,
    ],
  );

  const indexingLagValue = useMemo(
    () => ({
      latestIndexedBlocksByChain,
      routeIndexingLagByChain,
    }),
    [latestIndexedBlocksByChain, routeIndexingLagByChain],
  );

  return (
    <PubSubContext.Provider value={value}>
      <IndexingLagContext.Provider value={indexingLagValue}>
        {children}
      </IndexingLagContext.Provider>
    </PubSubContext.Provider>
  );
}
