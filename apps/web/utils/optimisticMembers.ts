import {
  CommunityMemberOptimistic,
  PendingIndexedPublish,
  PoolGovernanceOptimistic,
} from "@/contexts/pubsub.context";

type MemberProjectorContext = {
  communityId?: string | null;
  strategyId?: string | null;
  memberAddress?: string | null;
};

type StringRecord = Record<string, unknown>;

const isObject = (value: unknown): value is StringRecord =>
  !!value && typeof value === "object" && !Array.isArray(value);

const normalize = (value: unknown) => value?.toString().toLowerCase();

const isSame = (left: unknown, right: unknown) =>
  normalize(left) === normalize(right);

const memberAddressFromRecord = (value: StringRecord) =>
  value.memberAddress ?? value.id;

export const createMemberOptimisticProjector =
  (context: MemberProjectorContext) =>
  <TData>(data: TData | undefined, records: PendingIndexedPublish[]) => {
    const memberRecords = records
      .filter(
        (record) =>
          record.optimistic?.kind === "community-member" ||
          record.optimistic?.kind === "pool-governance",
      )
      .filter((record) => matchesContext(record.optimistic, context))
      .sort((a, b) => a.createdAt - b.createdAt);

    if (memberRecords.length === 0) return data;
    return patchValue(data, memberRecords, context) as TData | undefined;
  };

export const getPendingPoolGovernanceActivation = (
  records: PendingIndexedPublish[],
  context: Pick<MemberProjectorContext, "strategyId" | "memberAddress"> & {
    chainId?: number | string | null;
  },
) => {
  const latestGovernanceRecord = records
    .filter((record) => {
      const optimistic = record.optimistic;
      if (optimistic?.kind !== "pool-governance") return false;
      if (!isSame(optimistic.strategyId, context.strategyId)) return false;
      if (
        context.memberAddress &&
        !isSame(optimistic.memberAddress, context.memberAddress)
      ) {
        return false;
      }
      if (context.chainId != null && !isSame(record.chainId, context.chainId)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  return latestGovernanceRecord?.optimistic?.kind === "pool-governance" ?
      latestGovernanceRecord.optimistic.isActivated
    : undefined;
};

export const getPendingPoolGovernanceActivatedPoints = (
  records: PendingIndexedPublish[],
  context: Pick<MemberProjectorContext, "strategyId" | "memberAddress"> & {
    chainId?: number | string | null;
  },
) => {
  const latestGovernanceRecord = records
    .filter((record) => {
      const optimistic = record.optimistic;
      if (optimistic?.kind !== "pool-governance") return false;
      if (!isSame(optimistic.strategyId, context.strategyId)) return false;
      if (
        context.memberAddress &&
        !isSame(optimistic.memberAddress, context.memberAddress)
      ) {
        return false;
      }
      if (context.chainId != null && !isSame(record.chainId, context.chainId)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  if (latestGovernanceRecord?.optimistic?.kind !== "pool-governance") {
    return undefined;
  }

  const optimistic = latestGovernanceRecord.optimistic;
  if (!optimistic.isActivated) return 0n;
  try {
    const activatedPoints = BigInt(optimistic.activatedPoints ?? 0);
    return activatedPoints > 0n ? activatedPoints : 1n;
  } catch {
    return 1n;
  }
};

function matchesContext(
  optimistic: PendingIndexedPublish["optimistic"],
  context: MemberProjectorContext,
) {
  if (optimistic?.kind === "community-member") {
    return (
      isSame(optimistic.communityId, context.communityId) &&
      (!context.memberAddress ||
        isSame(optimistic.memberAddress, context.memberAddress))
    );
  }

  if (optimistic?.kind === "pool-governance") {
    return (
      isSame(optimistic.strategyId, context.strategyId) &&
      (!context.memberAddress ||
        isSame(optimistic.memberAddress, context.memberAddress))
    );
  }

  return false;
}

function patchValue(
  value: unknown,
  records: PendingIndexedPublish[],
  context: MemberProjectorContext,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => patchValue(item, records, context));
  }

  if (!isObject(value)) {
    return value;
  }

  const patchedChildren: StringRecord = {};
  Object.entries(value).forEach(([key, child]) => {
    patchedChildren[key] = patchValue(child, records, context);
  });

  return patchObject(patchedChildren, records, context);
}

function patchArray(
  value: unknown[] | undefined,
  records: PendingIndexedPublish[],
  context: MemberProjectorContext,
) {
  let next = (value ?? []).map((item) => patchValue(item, records, context));

  records.forEach((record) => {
    if (record.optimistic?.kind === "community-member") {
      next = patchCommunityMembersArray(next, record.optimistic, context);
    }
    if (record.optimistic?.kind === "pool-governance") {
      next = patchMemberStrategiesArray(next, record.optimistic, context);
    }
  });

  return next;
}

function patchObject(
  value: StringRecord,
  records: PendingIndexedPublish[],
  context: MemberProjectorContext,
) {
  let next = { ...value };

  records.forEach((record) => {
    if (record.optimistic?.kind === "community-member") {
      next = patchCommunityMembershipObject(next, record.optimistic, context);
    }
    if (record.optimistic?.kind === "pool-governance") {
      next = patchPoolGovernanceObject(next, record.optimistic, context);
    }
  });

  return next;
}

function patchCommunityMembershipObject(
  value: StringRecord,
  optimistic: CommunityMemberOptimistic,
  context: MemberProjectorContext,
): StringRecord {
  if ("member" in value && value.member == null && context.memberAddress) {
    return patchCommunityMembershipObject(
      {
        ...value,
        member: {
          id: context.memberAddress.toLowerCase(),
          stakes: [],
          memberCommunity: [],
        },
      },
      optimistic,
      context,
    );
  }

  if (isObject(value.member)) {
    return {
      ...value,
      member: patchCommunityMembershipObject(value.member, optimistic, context),
    };
  }

  if (isObject(value.registryCommunity)) {
    return {
      ...value,
      registryCommunity: patchCommunityMembershipObject(
        value.registryCommunity,
        optimistic,
        context,
      ),
    };
  }

  if (Array.isArray(value.memberCommunity)) {
    const memberCommunity = patchMemberCommunityArray(
      value.memberCommunity,
      optimistic,
    );
    return {
      ...value,
      memberCommunity,
    };
  }

  if (
    Array.isArray(value.members) &&
    isSame(optimistic.communityId, context.communityId)
  ) {
    const members = patchCommunityMembersArray(
      value.members,
      optimistic,
      context,
    );
    return {
      ...value,
      members,
      ...(value.membersCount != null ?
        { membersCount: members.length.toString() }
      : {}),
    };
  }

  if (
    value.membersCount != null &&
    Array.isArray(value.members) &&
    isSame(optimistic.communityId, context.communityId)
  ) {
    return {
      ...value,
      membersCount: value.members.length.toString(),
    };
  }

  return value;
}

function patchPoolGovernanceObject(
  value: StringRecord,
  optimistic: PoolGovernanceOptimistic,
  context: MemberProjectorContext,
) {
  let next = { ...value };

  if (isObject(value.memberStrategy)) {
    next.memberStrategy = patchMemberStrategy(value.memberStrategy, optimistic);
  }

  if (
    "memberStrategy" in value &&
    value.memberStrategy == null &&
    context.memberAddress &&
    context.strategyId &&
    isSame(optimistic.memberAddress, context.memberAddress)
  ) {
    next.memberStrategy = patchMemberStrategy(
      {
        id: `${context.memberAddress.toLowerCase()}-${context.strategyId.toLowerCase()}`,
        totalStakedPoints: "0",
        activatedPoints: "0",
        strategy: { id: context.strategyId },
        member: { id: context.memberAddress.toLowerCase() },
      },
      optimistic,
    );
  }

  if (Array.isArray(value.memberStrategies)) {
    next.memberStrategies = patchMemberStrategiesArray(
      value.memberStrategies,
      optimistic,
      context,
    );
  }

  if (next.activatedPoints != null && next.totalStakedPoints != null) {
    return patchMemberStrategy(next, optimistic);
  }

  return next;
}

function patchCommunityMembersArray(
  value: unknown[],
  optimistic: CommunityMemberOptimistic,
  context: MemberProjectorContext,
) {
  const withoutMember = value.filter(
    (item) =>
      !isObject(item) ||
      !isSame(memberAddressFromRecord(item), optimistic.memberAddress),
  );

  if (!optimistic.isRegistered) return withoutMember;

  return [
    {
      memberAddress: optimistic.memberAddress.toLowerCase(),
      stakedTokens: optimistic.stakedTokens ?? "0",
      id: optimistic.memberAddress.toLowerCase(),
    },
    ...withoutMember,
  ];
}

function patchMemberStrategiesArray(
  value: unknown[],
  optimistic: PoolGovernanceOptimistic,
  context: MemberProjectorContext,
) {
  const withoutMember = value.filter(
    (item) =>
      !isObject(item) ||
      !isObject(item.member) ||
      !isSame(item.member.id, optimistic.memberAddress),
  );

  if (!optimistic.isActivated) {
    return withoutMember;
  }

  const found = value.some(
    (item) =>
      isObject(item) &&
      isObject(item.member) &&
      isSame(item.member.id, optimistic.memberAddress),
  );

  const patched = value.map((item) =>
    isObject(item) && isObject(item.member) && isSame(item.member.id, optimistic.memberAddress) ?
      patchMemberStrategy(item, optimistic)
    : item,
  );

  if (found || !context.strategyId) return patched;

  return [
    {
      id: `${optimistic.memberAddress.toLowerCase()}-${context.strategyId.toLowerCase()}`,
      activatedPoints: getOptimisticActivatedPoints(optimistic),
      totalStakedPoints: "0",
      member: {
        id: optimistic.memberAddress.toLowerCase(),
        memberCommunity: [
          {
            memberAddress: optimistic.memberAddress.toLowerCase(),
            isRegistered: true,
          },
        ],
      },
    },
    ...patched,
  ];
}

function patchMemberCommunityArray(
  value: unknown[],
  optimistic: CommunityMemberOptimistic,
) {
  const patched = value.filter(
    (item) =>
      !isObject(item) ||
      !isObject(item.registryCommunity) ||
      !isSame(item.registryCommunity.id, optimistic.communityId),
  );

  return [
    {
      stakedTokens:
        optimistic.isRegistered ? optimistic.stakedTokens ?? "0" : "0",
      isRegistered: optimistic.isRegistered,
      registryCommunity: {
        id: optimistic.communityId,
      },
    },
    ...patched,
  ];
}

function patchMemberStrategy(
  value: StringRecord,
  optimistic: PoolGovernanceOptimistic,
) {
  if (isObject(value.member) && !isSame(value.member.id, optimistic.memberAddress)) {
    return value;
  }

  const activatedPoints = getOptimisticActivatedPoints(optimistic);

  return {
    ...value,
    activatedPoints,
  };
}

function getOptimisticActivatedPoints(optimistic: PoolGovernanceOptimistic) {
  if (!optimistic.isActivated) return "0";
  try {
    const activatedPoints = BigInt(optimistic.activatedPoints ?? 0);
    return activatedPoints > 0n ? activatedPoints.toString() : "1";
  } catch {
    return "1";
  }
}
