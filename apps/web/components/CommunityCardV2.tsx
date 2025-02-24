"use client";

import React from "react";
import { RectangleGroupIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import {
  CVStrategy,
  Maybe,
  MemberCommunity,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { Card } from "./Card";
import { Statistic } from "./Statistic";
import TooltipIfOverflow from "./TooltipIfOverflow";
import { commImg } from "@/assets";
import { ChainIcon } from "@/configs/chains";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";

type CommunityCardProps = {
  id: string;
  communityName?: Maybe<string> | undefined;
  garden: Pick<TokenGarden, "address" | "chainId" | "symbol" | "name">;
  members?: Maybe<Pick<MemberCommunity, "id" | "memberAddress">[]> | undefined;
  strategies?: Maybe<Pick<CVStrategy, "id">[]> | undefined;
};

export function CommunityCardV2({
  id,
  communityName,
  garden,
  members,
  strategies,
}: CommunityCardProps) {
  const {
    address: tokenAddr,
    chainId,
    symbol: tokenSymbol,
    name: tokenName,
  } = garden;

  const membersCount = members?.length ?? 0;
  const poolsCount = strategies?.length ?? 0;

  const searchParams = useCollectQueryParams();
  const isNewCommunity =
    searchParams[QUERY_PARAMS.gardenPage.newCommunity]?.toLowerCase() ===
    id.toLowerCase();

  return (
    <Card
      key={id}
      href={`/gardens/${chainId}/${tokenAddr}/${id}`}
      className={`w-[275px] sm:min-w-[313px] ${isNewCommunity ? "shadow-2xl" : ""}`}
    >
      <div className="flex justify-between text-neutral-content text-sm">
        <Image
          src={commImg}
          alt={`${name} community`}
          className="mb-2 h-[100px]"
          height={100}
          width={100}
        />
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 items-center">
            <p className="text-xs font-medium">Network:</p>
            <ChainIcon chain={chainId} height={22} />
          </div>
          <div className="flex gap-2 items-center">
            <p className="text-xs font-medium">
              Token:
              <span className="text-sm font-medium"> {tokenSymbol}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="flex items-start w-fit max-w-full">
          <TooltipIfOverflow>{communityName ?? ""}</TooltipIfOverflow>
        </h3>
        <Statistic
          label="members"
          count={membersCount}
          icon={<UserGroupIcon />}
        />
        <Statistic
          label="pools"
          icon={<RectangleGroupIcon />}
          count={poolsCount}
        />
      </div>
    </Card>
  );
}
