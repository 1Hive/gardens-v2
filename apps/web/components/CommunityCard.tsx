"use client";

import React from "react";
import { RectangleGroupIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Card } from "./Card";
import { Statistic } from "./Statistic";
import { commImg } from "@/assets";
import { QUERY_PARAMS } from "@/constants/query-params";

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
  const searchParams = useSearchParams();
  const isNewCommunity = searchParams.get(QUERY_PARAMS.gardenPage.newCommunity)?.toLowerCase() === id.toLowerCase();
  return (
    <Card key={id} href={`${pathname}/${id}`} className={`w-[273px] ${isNewCommunity ? "!border-accent !border-2" : ""}`}>
      <Image
        src={commImg}
        alt={`${name} community`}
        className="mb-2 h-[100px]"
        height={100}
        width={100}
      />
      <div className="flex flex-col gap-2">
        {/* fixed height for 2row title */}
        <div className="flex h-[37px] items-center">
          <h5>{name}</h5>
        </div>
        <Statistic label="members" count={membersCount} />
        <Statistic
          label="pools"
          icon={<RectangleGroupIcon />}
          count={poolsCount}
        />
      </div>
    </Card>
  );
}
