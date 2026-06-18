import {
  IndexedPublishOptimistic,
  PendingIndexedPublish,
  PoolGovernanceOptimistic,
  ProposalAllocationOptimistic,
  ProposalCreatedOptimistic,
  ProposalStatusOptimistic,
} from "@/contexts/pubsub.context";

const STATUS_CODE_BY_NAME: Record<ProposalStatusOptimistic["status"], number> =
  {
    inactive: 0,
    active: 1,
    paused: 2,
    cancelled: 3,
    executed: 4,
    disputed: 5,
    rejected: 6,
  };

type ProposalProjectorContext = {
  strategyId?: string | null;
  proposalId?: string | null;
  proposalNumber?: string | number | bigint | null;
  allocator?: string | null;
};

type StringRecord = Record<string, unknown>;
type PendingWithOptimistic<TOptimistic extends IndexedPublishOptimistic> =
  PendingIndexedPublish & {
    optimistic: TOptimistic;
  };

const isObject = (value: unknown): value is StringRecord =>
  !!value && typeof value === "object" && !Array.isArray(value);

const normalize = (value: unknown) => value?.toString().toLowerCase();

const proposalNumberFromId = (id: unknown) => {
  if (typeof id !== "string") return undefined;
  const parts = id.split("-");
  return parts[parts.length - 1];
};

const getProposalNumber = (proposal: StringRecord) =>
  proposal.proposalNumber?.toString() ?? proposalNumberFromId(proposal.id);

const getStrategyId = (proposal: StringRecord) => {
  if (isObject(proposal.strategy)) {
    return proposal.strategy.id?.toString();
  }
  return undefined;
};

const getProposalRecord = (value: StringRecord) => {
  if (isObject(value.proposal)) {
    return value.proposal;
  }
  return value;
};

const matchesStrategy = (
  strategyId: string,
  proposal: StringRecord,
  context: ProposalProjectorContext,
) => {
  const proposalStrategyId = getStrategyId(proposal) ?? context.strategyId;
  return normalize(proposalStrategyId) === normalize(strategyId);
};

const matchesProposal = (
  optimistic:
    | { proposalId?: string; proposalNumber: string }
    | ProposalAllocationOptimistic["targets"][number]
    | ProposalStatusOptimistic
    | ProposalCreatedOptimistic,
  proposal: StringRecord,
) => {
  const proposalNumber = getProposalNumber(proposal);
  const proposalId = proposal.id?.toString();
  return (
    normalize(proposalNumber) === normalize(optimistic.proposalNumber) ||
    (!!optimistic.proposalId &&
      normalize(proposalId) === normalize(optimistic.proposalId))
  );
};

export const getPendingProposalOptimistics = <
  TKind extends IndexedPublishOptimistic["kind"],
>(
  records: PendingIndexedPublish[],
  kind: TKind,
  context: Pick<ProposalProjectorContext, "strategyId" | "allocator">,
): PendingWithOptimistic<
  Extract<IndexedPublishOptimistic, { kind: TKind }>
>[] =>
  records
    .filter((record) => record.optimistic?.kind === kind)
    .filter((record) => {
      const optimistic = record.optimistic;
      if (!optimistic || !("strategyId" in optimistic)) return false;
      if (normalize(optimistic.strategyId) !== normalize(context.strategyId)) {
        return false;
      }
      if (
        optimistic.kind === "proposal-allocation" &&
        context.allocator &&
        normalize(optimistic.allocator) !== normalize(context.allocator)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.createdAt - b.createdAt) as PendingWithOptimistic<
    Extract<IndexedPublishOptimistic, { kind: TKind }>
  >[];

export const getLatestProposalCreation = (
  records: PendingIndexedPublish[],
  context: ProposalProjectorContext,
) =>
  getPendingProposalOptimistics(records, "proposal-created", context).find(
    (record) => {
      const optimistic = record.optimistic as ProposalCreatedOptimistic;
      return (
        normalize(optimistic.proposalNumber) ===
          normalize(context.proposalNumber) ||
        (!!context.proposalId &&
          normalize(optimistic.proposalId) === normalize(context.proposalId))
      );
    },
  );

export const hasPendingProposalAllocation = (
  records: PendingIndexedPublish[],
  context: Pick<ProposalProjectorContext, "strategyId" | "allocator">,
) =>
  getPendingProposalOptimistics(records, "proposal-allocation", context)
    .length > 0;

export const getOptimisticAllocationBaseline = (
  records: PendingIndexedPublish[],
  context: Pick<ProposalProjectorContext, "strategyId" | "allocator">,
) => {
  const baseline: Record<string, bigint> = {};
  getPendingProposalOptimistics(
    records,
    "proposal-allocation",
    context,
  ).forEach((record) => {
    const optimistic = record.optimistic as ProposalAllocationOptimistic;
    optimistic.targets.forEach((target) => {
      baseline[target.proposalNumber] = BigInt(target.amount);
    });
  });
  return baseline;
};

export const createProposalOptimisticProjector =
  (context: ProposalProjectorContext) =>
  <TData>(data: TData | undefined, records: PendingIndexedPublish[]) => {
    const proposalRecords = records
      .filter((record) => record.optimistic != null)
      .filter((record) => {
        const optimistic = record.optimistic;
        return (
          optimistic != null &&
          "strategyId" in optimistic &&
          normalize(optimistic.strategyId) === normalize(context.strategyId)
        );
      })
      .sort((a, b) => a.createdAt - b.createdAt);

    if (proposalRecords.length === 0) return data;
    return patchValue(data, proposalRecords, context) as TData | undefined;
  };

function patchValue(
  value: unknown,
  records: PendingIndexedPublish[],
  context: ProposalProjectorContext,
  key?: string,
): unknown {
  if (Array.isArray(value)) {
    return patchArray(value, records, context, key);
  }

  if (!isObject(value)) {
    return value;
  }

  const patchedChildren: StringRecord = {};
  Object.entries(value).forEach(([key, child]) => {
    patchedChildren[key] = patchValue(child, records, context, key);
  });

  return patchObject(patchedChildren, records, context);
}

function patchArray(
  value: unknown[],
  records: PendingIndexedPublish[],
  context: ProposalProjectorContext,
  key?: string,
) {
  let next = value.map((item) => patchValue(item, records, context));

  records.forEach((record) => {
    if (record.optimistic?.kind !== "proposal-created") return;
    const optimistic = record.optimistic;
    if (key !== "proposals") return;
    if (!isProposalArray(next, optimistic.strategyId)) return;
    if (
      next.some(
        (item) =>
          isObject(item) &&
          matchesProposal(optimistic, item) &&
          matchesStrategy(optimistic.strategyId, item, context),
      )
    ) {
      return;
    }
    next = [
      patchValue(createMinimalProposal(optimistic), records, context),
      ...next,
    ];
  });

  return next;
}

function patchObject(
  value: StringRecord,
  records: PendingIndexedPublish[],
  context: ProposalProjectorContext,
) {
  let next = { ...value };

  records.forEach((record) => {
    if (record.optimistic?.kind === "proposal-created") {
      next = patchCreatedProposalParentStrategy(next, record.optimistic);
    }
    if (record.optimistic?.kind === "proposal-status") {
      next = patchProposalStatus(next, record.optimistic, context);
    }
    if (record.optimistic?.kind === "pool-governance") {
      next = patchPoolGovernanceDeactivation(next, record.optimistic, context);
    }
    if (record.optimistic?.kind === "proposal-allocation") {
      next = patchProposalAllocation(next, record.optimistic, context);
    }
  });

  return next;
}

function patchCreatedProposalParentStrategy(
  value: StringRecord,
  optimistic: ProposalCreatedOptimistic,
) {
  if (
    !Array.isArray(value.proposals) ||
    normalize(value.id) !== normalize(optimistic.strategyId)
  ) {
    return value;
  }

  return {
    ...value,
    proposals: value.proposals.map((proposal) => {
      if (!isObject(proposal) || !matchesProposal(optimistic, proposal)) {
        return proposal;
      }

      return {
        ...proposal,
        strategy: {
          ...(isObject(proposal.strategy) ? proposal.strategy : {}),
          id: optimistic.strategyId,
          maxCVSupply:
            proposal.strategy && isObject(proposal.strategy) ?
              proposal.strategy.maxCVSupply ?? value.maxCVSupply ?? "0"
            : value.maxCVSupply ?? "0",
          totalEffectiveActivePoints:
            proposal.strategy && isObject(proposal.strategy) ?
              proposal.strategy.totalEffectiveActivePoints ??
              value.totalEffectiveActivePoints ??
              "0"
            : value.totalEffectiveActivePoints ?? "0",
        },
      };
    }),
  };
}

function patchPoolGovernanceDeactivation(
  value: StringRecord,
  optimistic: PoolGovernanceOptimistic,
  context: ProposalProjectorContext,
) {
  if (optimistic.isActivated) return value;
  if (normalize(optimistic.strategyId) !== normalize(context.strategyId)) {
    return value;
  }

  let next = value;

  if (hasProposalStakeShape(value)) {
    const snapshot = optimistic.supportSnapshot?.find((candidate) =>
      matchesProposal(candidate, value),
    );
    if (snapshot) {
      next = {
        ...next,
        stakedAmount: subtractDecimalStrings(value.stakedAmount, snapshot.amount),
      };
    }
  }

  if (
    Array.isArray(value.stakes) &&
    normalize(value.id) === normalize(optimistic.memberAddress)
  ) {
    next = {
      ...next,
      stakes: removeMemberStakesForStrategy(value.stakes, optimistic.strategyId),
    };
  }

  if (
    hasMemberStrategyShape(value) &&
    normalize(context.allocator) === normalize(optimistic.memberAddress) &&
    (!isObject(value.member) ||
      normalize(value.member.id) === normalize(optimistic.memberAddress))
  ) {
    next = {
      ...next,
      totalStakedPoints: "0",
    };
  }

  return next;
}

function patchProposalStatus(
  value: StringRecord,
  optimistic: ProposalStatusOptimistic,
  context: ProposalProjectorContext,
) {
  const proposal = getProposalRecord(value);
  if (
    !matchesProposal(optimistic, proposal) ||
    !matchesStrategy(optimistic.strategyId, proposal, context)
  ) {
    return value;
  }

  const statusCode = STATUS_CODE_BY_NAME[optimistic.status];
  if (isObject(value.proposal)) {
    return {
      ...value,
      proposal: {
        ...value.proposal,
        proposalStatus: statusCode,
      },
    };
  }

  return {
    ...value,
    proposalStatus: statusCode,
  };
}

function patchProposalAllocation(
  value: StringRecord,
  optimistic: ProposalAllocationOptimistic,
  context: ProposalProjectorContext,
) {
  const proposal = getProposalRecord(value);
  if (!matchesStrategy(optimistic.strategyId, proposal, context)) return value;

  const target = optimistic.targets.find((candidate) =>
    matchesProposal(candidate, proposal),
  );
  const delta = optimistic.deltas?.find((candidate) =>
    matchesProposal(candidate, proposal),
  );

  if (isObject(value.proposal) && target) {
    return {
      ...value,
      amount: target.amount,
    };
  }

  let next = value;
  if (target && hasMemberStakeShape(value)) {
    next = {
      ...next,
      amount: target.amount,
    };
  }

  if (delta && hasProposalStakeShape(value)) {
    next = {
      ...next,
      stakedAmount: addDecimalStrings(value.stakedAmount, delta.deltaSupport),
    };
  }

  if (hasMemberStrategyShape(value) && context.allocator) {
    const total = optimistic.targets.reduce(
      (acc, candidate) => acc + BigInt(candidate.amount),
      0n,
    );
    next = {
      ...next,
      totalStakedPoints: total.toString(),
    };
  }

  if (
    Array.isArray(value.stakes) &&
    (!context.allocator || normalize(value.id) === normalize(context.allocator))
  ) {
    next = {
      ...next,
      stakes: patchMemberAllocationStakes(value.stakes, optimistic, context),
    };
  }

  return next;
}

function patchMemberAllocationStakes(
  value: unknown[],
  optimistic: ProposalAllocationOptimistic,
  context: ProposalProjectorContext,
) {
  let next = value;

  optimistic.targets.forEach((target) => {
    const targetAmount = toBigInt(target.amount);
    let hasTarget = false;
    next = next.map((item) => {
      if (
        isObject(item) &&
        isObject(item.proposal) &&
        matchesProposal(target, item.proposal) &&
        matchesStrategy(optimistic.strategyId, item.proposal, context)
      ) {
        hasTarget = true;
        return {
          ...item,
          amount: target.amount,
        };
      }

      return item;
    });

    if (hasTarget || targetAmount === 0n) {
      return;
    }

    next = [createMinimalMemberStake(target, optimistic), ...next];
  });

  return next;
}

function hasProposalStakeShape(value: StringRecord) {
  return value.stakedAmount != null && value.proposalNumber != null;
}

function hasMemberStakeShape(value: StringRecord) {
  return value.amount != null && isObject(value.proposal);
}

function hasMemberStrategyShape(value: StringRecord) {
  return value.totalStakedPoints != null && value.activatedPoints != null;
}

function addDecimalStrings(value: unknown, delta: string) {
  try {
    return (BigInt(value?.toString() ?? "0") + BigInt(delta)).toString();
  } catch {
    return value;
  }
}

function subtractDecimalStrings(value: unknown, amount: string) {
  try {
    const next = BigInt(value?.toString() ?? "0") - BigInt(amount);
    return (next > 0n ? next : 0n).toString();
  } catch {
    return value;
  }
}

function toBigInt(value: unknown) {
  try {
    return BigInt(value?.toString() ?? "0");
  } catch {
    return 0n;
  }
}

function removeMemberStakesForStrategy(value: unknown[], strategyId: string) {
  return value.filter((item) => {
    if (!isObject(item) || !isObject(item.proposal)) return true;
    const proposal = item.proposal;
    const proposalStrategyId =
      isObject(proposal.strategy) ? proposal.strategy.id : undefined;
    if (proposalStrategyId == null) return false;
    return normalize(proposalStrategyId) !== normalize(strategyId);
  });
}

function isProposalArray(value: unknown[], strategyId: string) {
  return value.every(
    (item) =>
      !isObject(item) ||
      item.proposalNumber != null ||
      item.metadataHash != null ||
      normalize(getStrategyId(item)) === normalize(strategyId),
  );
}

function createMinimalProposal(optimistic: ProposalCreatedOptimistic) {
  const proposalId =
    optimistic.proposalId ??
    `${optimistic.strategyId.toLowerCase()}-${optimistic.proposalNumber}`;

  return {
    id: proposalId,
    proposalNumber: Number(optimistic.proposalNumber),
    metadataHash: optimistic.metadataHash,
    metadata: null,
    beneficiary: optimistic.beneficiary,
    requestedAmount: optimistic.requestedAmount ?? "0",
    requestedToken: null,
    proposalStatus: STATUS_CODE_BY_NAME.active,
    stakedAmount: "0",
    convictionLast: "0",
    createdAt: `${Math.floor(Date.now() / 1000)}`,
    executedAt: null,
    blockLast: "0",
    submitter: optimistic.submitter,
    strategy: {
      id: optimistic.strategyId,
    },
    proposalStream: null,
  };
}

function createMinimalMemberStake(
  target: ProposalAllocationOptimistic["targets"][number],
  optimistic: ProposalAllocationOptimistic,
) {
  const proposalId =
    target.proposalId ??
    `${optimistic.strategyId.toLowerCase()}-${target.proposalNumber}`;

  return {
    id: `${optimistic.allocator.toLowerCase()}-${proposalId.toLowerCase()}`,
    amount: target.amount,
    proposal: {
      id: proposalId,
      proposalNumber: Number(target.proposalNumber),
      proposalStatus: STATUS_CODE_BY_NAME.active,
      strategy: {
        id: optimistic.strategyId,
      },
    },
  };
}
