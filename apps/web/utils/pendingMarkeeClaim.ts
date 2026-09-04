import { Address } from "viem";
import { logOnce } from "@/utils/log";

export type PendingMarkeeClaim = {
  bridgeName: string;
  createdAt: number;
  estimatedRouteDurationSeconds: number | null;
  fromChainId: number;
  toChainId: number;
  transactionHash: `0x${string}`;
  transactionUrl: string | null;
  version: 1;
};

const getStorageKey = (chainId: number, community: Address) =>
  `gardens:markee:pending-claim:${chainId}:${community.toLowerCase()}`;

export const clearPendingMarkeeClaim = (
  chainId: number,
  community: Address,
) => {
  try {
    window.localStorage.removeItem(getStorageKey(chainId, community));
  } catch (error) {
    logOnce(
      "warn",
      "[CommunityMarkee] Unable to clear the pending claim locally",
      error,
    );
  }
};

export const readPendingMarkeeClaim = (
  chainId: number | undefined,
  community: Address,
): PendingMarkeeClaim | null => {
  if (chainId == null || typeof window === "undefined") return null;

  try {
    const value = JSON.parse(
      window.localStorage.getItem(getStorageKey(chainId, community)) ?? "null",
    ) as Partial<PendingMarkeeClaim> | null;
    if (
      value?.version !== 1 ||
      value.bridgeName !== "Squid" ||
      typeof value.createdAt !== "number" ||
      typeof value.fromChainId !== "number" ||
      typeof value.toChainId !== "number" ||
      value.toChainId !== chainId ||
      typeof value.transactionHash !== "string" ||
      !/^0x[0-9a-fA-F]{64}$/u.test(value.transactionHash)
    ) {
      clearPendingMarkeeClaim(chainId, community);
      return null;
    }

    return {
      bridgeName: value.bridgeName,
      createdAt: value.createdAt,
      estimatedRouteDurationSeconds:
        typeof value.estimatedRouteDurationSeconds === "number" ?
          value.estimatedRouteDurationSeconds
        : null,
      fromChainId: value.fromChainId,
      toChainId: value.toChainId,
      transactionHash: value.transactionHash as `0x${string}`,
      transactionUrl:
        typeof value.transactionUrl === "string" ? value.transactionUrl : null,
      version: 1,
    };
  } catch {
    clearPendingMarkeeClaim(chainId, community);
    return null;
  }
};

export const writePendingMarkeeClaim = (
  chainId: number,
  community: Address,
  claim: PendingMarkeeClaim,
) => {
  try {
    window.localStorage.setItem(
      getStorageKey(chainId, community),
      JSON.stringify(claim),
    );
    return true;
  } catch (error) {
    logOnce(
      "warn",
      "[CommunityMarkee] Unable to save the pending claim locally",
      error,
    );
    return false;
  }
};
