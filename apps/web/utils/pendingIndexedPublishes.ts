import type {
  ChangeEventPayload,
  IndexedPublishOptimistic,
  PendingIndexedPublish,
} from "@/contexts/pubsub.context";

const INDEXING_LOG_PREFIX = "[indexing]";

const isRpcTransactionHash = (hash: unknown): hash is `0x${string}` =>
  typeof hash === "string" && /^0x[a-fA-F0-9]{64}$/.test(hash);

const toFiniteChainId = (chainId: unknown): number | null => {
  const parsedChainId =
    typeof chainId === "string" || typeof chainId === "number" ?
      Number(chainId)
    : NaN;
  return Number.isFinite(parsedChainId) ? parsedChainId : null;
};

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

export function normalizePendingIndexedPublishRecord(
  record: unknown,
): PendingIndexedPublish | null {
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
