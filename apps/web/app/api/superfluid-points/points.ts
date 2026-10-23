export const STREAMING_POOL_PROPOSAL_TYPE = "2";
export const STREAMING_POOL_ACTIVITY_MULTIPLIER = 3;

// Keep the accumulator exact across pages: large historical credits and their
// reversals must not erase the smaller valid credits between them.
export const accumulatePointEvent = (total: bigint, points: number): bigint => {
  if (!Number.isFinite(points) || !Number.isInteger(points)) {
    throw new Error(`Invalid integer points event: ${points}`);
  }
  return total + BigInt(points);
};

// Convert only after the complete event history has been summed. Refuse an
// unsafe remaining balance before the route can send any adjustments.
export const toSafePointTotal = (total: bigint, context: string): number => {
  const limit = BigInt(Number.MAX_SAFE_INTEGER);
  if (total > limit || total < -limit) {
    throw new Error(`Unsafe points balance for ${context}: ${total}`);
  }
  return Number(total);
};

// Validate the complete run before its first batch is submitted. Two safe
// balances can still produce an unsafe adjustment when their signs differ.
export const validatePointAdjustments = (
  events: ReadonlyArray<{
    event: string;
    payload: { account: string; points: number };
  }>,
) => {
  for (const { event, payload } of events) {
    if (!Number.isSafeInteger(payload.points)) {
      throw new Error(
        `Unsafe points adjustment for ${payload.account} ${event}: ${payload.points}`,
      );
    }
  }
};

type ProposalType = string | number | null | undefined;

export type CampaignWalletPointInput = {
  address: string;
  fundUsd: number;
  streamUsd: number;
  governanceStakePoints: number;
  farcasterPoints: number;
};

export type CampaignWalletPointTarget = CampaignWalletPointInput & {
  fundPoints: number;
  streamPoints: number;
  governanceStakePoints: number;
  farcasterPoints: number;
  totalPoints: number;
};

export const getPoolActivityMultiplier = (proposalType: ProposalType) =>
  String(proposalType) === STREAMING_POOL_PROPOSAL_TYPE ?
    STREAMING_POOL_ACTIVITY_MULTIPLIER
  : 1;

export const shouldCountDirectFunding = ({
  proposalType,
  sameAsUnderlying,
}: {
  proposalType: ProposalType;
  sameAsUnderlying: boolean;
}) =>
  String(proposalType) === STREAMING_POOL_PROPOSAL_TYPE || sameAsUnderlying;

export const applyPoolActivityMultiplier = (
  amount: number,
  proposalType: ProposalType,
) => amount * getPoolActivityMultiplier(proposalType);

// Call once per pool and campaign window so contributions never cross pools.
export const sumFundingByWallet = (
  transfers: { from: string; value: bigint | string }[],
) => {
  const totals = new Map<string, bigint>();
  for (const { from, value } of transfers) {
    const address = from.toLowerCase();
    // IPFS cache serialization turns bigint amounts into decimal strings.
    totals.set(address, (totals.get(address) ?? 0n) + BigInt(value));
  }
  return totals;
};

export const calculatePoolFundingPoints = (usd: number, multiplier = 1) => {
  const eligible = usd >= 10;
  return { eligible, points: eligible ? usd * multiplier : 0 };
};

export const calculateCampaignWalletPoints = ({
  address,
  fundUsd,
  streamUsd,
  governanceStakePoints,
  farcasterPoints,
}: CampaignWalletPointInput): CampaignWalletPointTarget => {
  for (const [category, value] of Object.entries({
    fundUsd,
    streamUsd,
    governanceStakePoints,
    farcasterPoints,
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `Invalid points input for ${address} ${category}: ${value}`,
      );
    }
  }
  const fundPoints = fundUsd >= 10 ? Math.floor(fundUsd) : 0;
  const streamPoints = streamUsd >= 10 ? Math.floor(streamUsd) : 0;
  const governanceStakePts = Math.floor(governanceStakePoints);
  const farcasterPts = Math.floor(farcasterPoints);
  const categories = {
    fundPoints,
    streamPoints,
    governanceStakePts,
    farcasterPts,
  };
  for (const [category, points] of Object.entries(categories)) {
    if (!Number.isSafeInteger(points)) {
      throw new Error(
        `Unsafe points target for ${address} ${category}: ${points}`,
      );
    }
  }
  const totalPoints = toSafePointTotal(
    Object.values(categories).reduce(
      (total, points) => total + BigInt(points),
      0n,
    ),
    `${address} totalPoints`,
  );

  return {
    address,
    fundUsd,
    streamUsd,
    fundPoints,
    streamPoints,
    governanceStakePoints: governanceStakePts,
    farcasterPoints: farcasterPts,
    totalPoints,
  };
};
