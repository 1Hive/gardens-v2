"use client";
import React from "react";
import { commImg } from "@/assets";
import Image from "next/image";
import { Statistic } from "./Statistic";
import { Card } from "./Card";
import { usePathname } from "next/navigation";

type CommunityCardProps = {
  name: string;
  members: number;
  pools: number;
  id: string;
};

export function CommunityCard({
  name,
  members,
  pools,
  id,
}: CommunityCardProps) {
  const pathname = usePathname();
  return (
    <Card href={`${pathname}/${id}`} className="w-[273px]">
      <Image
        src={commImg}
        alt={`${name} community`}
        className="mb-2 h-[100px] bg-slate-200"
        height={100}
        width={100}
      />
      <div className="flex flex-col gap-2">
        <h5>{name}</h5>
        <Statistic label="members" count={members} />
        <Statistic label="pools" count={pools} />
      </div>
    </Card>
  );
}
