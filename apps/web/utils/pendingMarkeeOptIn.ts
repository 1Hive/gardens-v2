import { Address } from "viem";
import { logOnce } from "@/utils/log";

/**
 * A council Safe opt-in whose off-chain message is still collecting owner
 * signatures. Kept locally so the page can resume checking after a reload.
 */
export type PendingMarkeeOptIn = {
  deadline: number;
  nonce: string;
  signature: `0x${string}`;
  version: 1;
};

const getStorageKey = (chainId: number, community: Address) =>
  `gardens:markee:pending-opt-in:${chainId}:${community.toLowerCase()}`;

export const clearPendingMarkeeOptIn = (
  chainId: number,
  community: Address,
) => {
  try {
    window.localStorage.removeItem(getStorageKey(chainId, community));
  } catch (error) {
    logOnce(
      "warn",
      "[CommunityMarkee] Unable to clear the pending opt-in locally",
      error,
    );
  }
};

export const readPendingMarkeeOptIn = (
  chainId: number | undefined,
  community: Address,
): PendingMarkeeOptIn | null => {
  if (chainId == null || typeof window === "undefined") return null;

  try {
    const value = JSON.parse(
      window.localStorage.getItem(getStorageKey(chainId, community)) ?? "null",
    ) as Partial<PendingMarkeeOptIn> | null;
    if (
      value?.version !== 1 ||
      typeof value.deadline !== "number" ||
      value.deadline <= Math.floor(Date.now() / 1000) ||
      typeof value.nonce !== "string" ||
      !/^[1-9][0-9]{0,77}$/u.test(value.nonce) ||
      typeof value.signature !== "string" ||
      !/^0x[0-9a-fA-F]*$/u.test(value.signature)
    ) {
      clearPendingMarkeeOptIn(chainId, community);
      return null;
    }

    return {
      deadline: value.deadline,
      nonce: value.nonce,
      signature: value.signature as `0x${string}`,
      version: 1,
    };
  } catch {
    clearPendingMarkeeOptIn(chainId, community);
    return null;
  }
};

export const writePendingMarkeeOptIn = (
  chainId: number,
  community: Address,
  optIn: PendingMarkeeOptIn,
) => {
  try {
    window.localStorage.setItem(
      getStorageKey(chainId, community),
      JSON.stringify(optIn),
    );
    return true;
  } catch (error) {
    logOnce(
      "warn",
      "[CommunityMarkee] Unable to save the pending opt-in locally",
      error,
    );
    return false;
  }
};
