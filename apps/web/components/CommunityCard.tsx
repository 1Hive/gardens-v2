"use client";
import React from "react";
import { commImg } from "@/assets";
import Image from "next/image";
import { Statistic } from "./Statistic";
import { Card } from "./Card";
import { usePathname } from "next/navigation";
import { RectangleGroupIcon } from "@heroicons/react/24/outline";

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
  return (
    <Card href={`${pathname}/${id}`} className="w-[273px]">
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
