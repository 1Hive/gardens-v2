"use client";

import { isAddress } from "viem";
import { useFlag } from "./useFlag";

const EARLY_ACCESS_COMMUNITIES_ENV =
  process.env.NEXT_PUBLIC_STREAMING_POOLS_EARLY_ACCESS_COMMUNITIES;

const EARLY_ACCESS_COMMUNITIES = new Set(
  (EARLY_ACCESS_COMMUNITIES_ENV ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => isAddress(value)),
);

export function useStreamingPoolsAccess(communityAddress?: string | null) {
  const showStreamingPools = useFlag("showStreamingPools");
  const normalizedCommunityAddress = communityAddress?.trim().toLowerCase();

  return (
    showStreamingPools ||
    (normalizedCommunityAddress != null &&
      isAddress(normalizedCommunityAddress) &&
      EARLY_ACCESS_COMMUNITIES.has(normalizedCommunityAddress))
  );
}
