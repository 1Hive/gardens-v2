"use client";

import React from "react";
import { RectangleGroupIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Card } from "./Card";
import { Statistic } from "./Statistic";
import { commImg } from "@/assets";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/hooks/useCollectQueryParams";

type CommunityCardProps = {
  name: string;
  membersCount: number;
  poolsCount: number;
  id: string;
};

export function CommunityCard({
  name,
  membersCount,
  poolsCount,
  id,
}: CommunityCardProps) {
  const pathname = usePathname();
  const searchParams = useCollectQueryParams();
  const isNewCommunity =
    searchParams[QUERY_PARAMS.gardenPage.newCommunity]?.toLowerCase() ===
    id.toLowerCase();

  return (
    <Card
      key={id}
      href={`${pathname}/${id}`}
      className={`w-[313px] ${isNewCommunity ? "shadow-2xl" : ""}`}
    >
      <Image
        src={commImg}
        alt={`${name} community`}
        className="mb-2 h-[100px]"
        height={100}
        width={100}
      />
      <div className="flex flex-col gap-2">
        <div
          className="flex items-start w-fit max-w-full tooltip"
          data-tip={name}
        >
          <h3 className="truncate tooltip">{name}</h3>
        </div>
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
