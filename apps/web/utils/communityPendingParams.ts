import { diffWordsWithSpace } from "diff";

export const PENDING_REGISTER_STAKE_AMOUNT = 1;
export const PENDING_KICK_ENABLED = 2;
export const PENDING_COVENANT_IPFS_HASH = 4;
export const ALL_PENDING_COMMUNITY_PARAMS = 7;

export type PendingCommunityParams = {
  fields: number;
  registerStakeAmount: bigint;
  isKickEnabled: boolean;
  covenantIpfsHash: string;
};

type PendingCommunityParamsResult =
  | PendingCommunityParams
  | readonly [number, bigint, boolean, string]
  | undefined;

export const normalizePendingCommunityParams = (
  value: PendingCommunityParamsResult,
): PendingCommunityParams => {
  if (value == null) {
    return {
      fields: 0,
      registerStakeAmount: 0n,
      isKickEnabled: false,
      covenantIpfsHash: "",
    };
  }

  if (Array.isArray(value)) {
    return {
      fields: Number(value[0]),
      registerStakeAmount: value[1],
      isKickEnabled: value[2],
      covenantIpfsHash: value[3],
    };
  }

  const pending = value as PendingCommunityParams;
  return { ...pending, fields: Number(pending.fields) };
};

export const hasPendingField = (fields: number, field: number) =>
  (fields & field) === field;

export const canReviewPendingCommunityParams = (
  connectedAddress: string | undefined,
  owner: string | undefined,
  fields: number,
) =>
  fields !== 0 &&
  connectedAddress != null &&
  owner != null &&
  connectedAddress.toLowerCase() === owner.toLowerCase();

export const hasGuardedCommunityChanges = ({
  currentStake,
  nextStake,
  currentKickEnabled,
  nextKickEnabled,
  currentCovenant,
  nextCovenant,
}: {
  currentStake: string;
  nextStake: string;
  currentKickEnabled: boolean;
  nextKickEnabled: boolean;
  currentCovenant: string;
  nextCovenant: string;
}) =>
  currentStake !== nextStake ||
  currentKickEnabled !== nextKickEnabled ||
  currentCovenant.trim() !== nextCovenant.trim();

export type CovenantDiffPart = {
  id: string;
  value: string;
  kind: "added" | "removed" | "unchanged";
};

export const buildCovenantDiff = (
  currentCovenant: string,
  pendingCovenant: string,
): CovenantDiffPart[] => {
  let offset = 0;
  return diffWordsWithSpace(currentCovenant, pendingCovenant).map((part) => {
    const kind =
      part.added ? "added" : part.removed ? "removed" : "unchanged";
    const result: CovenantDiffPart = {
      id: `${offset}-${kind}`,
      value: part.value,
      kind,
    };
    offset += part.value.length;
    return result;
  });
};
