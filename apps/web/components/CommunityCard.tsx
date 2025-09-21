"use client";

import React from "react";
import {
  CheckBadgeIcon,
  CircleStackIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
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
import { CommunityLogo, ProtopianLogo } from "@/assets";
import { ChainIcon, getChain } from "@/configs/chains";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";

type CommunityCardProps = {
  id: string;
  communityName?: Maybe<string> | undefined;
  garden: Pick<TokenGarden, "address" | "chainId" | "symbol">;
  members?: Maybe<Pick<MemberCommunity, "id" | "memberAddress">[]> | undefined;
  strategies?: Maybe<Pick<CVStrategy, "id">[]> | undefined;
  isProtopian?: boolean;
};

export function CommunityCard({
  id,
  communityName,
  garden,
  members,
  strategies,
  isProtopian = false,
}: CommunityCardProps) {
  const { address: tokenAddr, chainId, symbol: tokenSymbol } = garden;

  const membersCount = members?.length ?? 0;
  const poolsCount = strategies?.length ?? 0;
  const chain = getChain(chainId);

  const searchParams = useCollectQueryParams();
  const isNewCommunity =
    searchParams[QUERY_PARAMS.gardenPage.newCommunity]?.toLowerCase() ===
    id.toLowerCase();

  return (
    <Card
      key={id}
      href={`/gardens/${chainId}/${tokenAddr}/${id}`}
      className={` ${isNewCommunity ? "shadow-2xl" : ""}`}
    >
      <div className="flex justify-between text-neutral-content text-sm">
        {isProtopian && (
          <div className="absolute bottom-2 right-2 badge badge-soft badge-success bg-[#9ae7c3] text-[#0c7b0c]">
            <CheckBadgeIcon className="h-4 w-4 mr-1" />
            Protopian
          </div>
        )}
        <Image
          src={isProtopian ? ProtopianLogo : CommunityLogo}
          alt={`${communityName} community`}
          className="mb-2 h-[100px]"
          height={100}
          width={100}
        />
        <div className="flex flex-col gap-1">
          <div
            className="flex gap-2 items-center tooltip"
            data-tip={chain?.name}
          >
            <ChainIcon chain={chainId} height={24} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="flex items-start w-fit max-w-full">
          <TooltipIfOverflow>{communityName ?? ""}</TooltipIfOverflow>
        </h3>
        <div className="flex gap-2 items-center">
          <p className=" font-normal dark:text-opacity-80">
            Governance Token:
            <span className="font-normal dark:text-opacity-80">
              {" "}
              {tokenSymbol}
            </span>
          </p>
        </div>
        <Statistic
          label="members"
          count={membersCount}
          icon={<UserGroupIcon />}
        />
        <Statistic
          label="pools"
          icon={<CircleStackIcon />}
          count={poolsCount}
        />
      </div>
    </Card>
  );
}

export function CommunityCardSkeleton() {
  return (
    <Card href="#" className="min-w-[313px]">
      <div className="flex justify-between text-neutral-content text-sm">
        <div className="skeleton [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#717171]  mb-2 h-[100px] w-[100px]" />
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 items-center">
            <div className="skeleton [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#717171]  h-6 w-6 rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="skeleton [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#717171]  h-7 w-48" />
        <div className="flex gap-2 items-center">
          <div className="skeleton [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#717171]  h-6 w-40" />
        </div>
        <div className="flex gap-2 items-center">
          <div className="skeleton [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#717171]  h-6 w-6" />
          <div className="skeleton [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#717171]  h-6 w-24" />
        </div>
        <div className="flex gap-2 items-center">
          <div className="skeleton [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#717171]  h-6 w-6" />
          <div className="skeleton [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#717171]  h-6 w-24" />
        </div>
      </div>
    </Card>
  );
}
