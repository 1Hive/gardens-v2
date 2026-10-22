export const STREAMING_POOL_PROPOSAL_TYPE = "2";
export const STREAMING_POOL_ACTIVITY_MULTIPLIER = 3;

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
  transfers: { from: string; value: bigint }[],
) => {
  const totals = new Map<string, bigint>();
  for (const { from, value } of transfers) {
    const address = from.toLowerCase();
    totals.set(address, (totals.get(address) ?? 0n) + value);
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
  const fundPoints = fundUsd >= 10 ? Math.floor(fundUsd) : 0;
  const streamPoints = streamUsd >= 10 ? Math.floor(streamUsd) : 0;
  const governanceStakePts = Math.floor(governanceStakePoints);
  const farcasterPts = Math.floor(farcasterPoints);

  return {
    address,
    fundUsd,
    streamUsd,
    fundPoints,
    streamPoints,
    governanceStakePoints: governanceStakePts,
    farcasterPoints: farcasterPts,
    totalPoints:
      fundPoints + streamPoints + governanceStakePts + farcasterPts,
  };
};
