"use client";

import { useMemo } from "react";
import type { Address, Placement } from "@markee_team/sdk";
import MarkeeSign from "@/components/MarkeeSign";

export function CommunityMarkeeSDK({
  chainId,
  community,
}: {
  chainId?: number;
  community: Address;
}) {
  const placement = useMemo<Placement | undefined>(
    () =>
      chainId == null ? undefined : {
        kind: "gardens-community",
        chainId,
        community,
      },
    [chainId, community],
  );

  if (!placement) return null;

  return (
    <MarkeeSign
      key={`${chainId}:${community}`}
      placement={placement}
      className="w-full"
    />
  );
}
