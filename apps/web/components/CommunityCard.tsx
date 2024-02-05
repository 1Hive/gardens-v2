"use client";
import { useState } from "react";
import { Button } from "@/components";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { PoolCard } from "@/components";
import { getCommunityByGardenQuery } from "#/subgraph/.graphclient";

type CommunityQuery = NonNullable<
  NonNullable<getCommunityByGardenQuery["tokenGarden"]>["communities"]
>[number];
export function CommunityCard({
  communityName: name,
  id: address,
  strategies,
}: CommunityQuery) {
  const [open, setOpen] = useState(false);
  const pools = strategies ?? [];
  return (
    <div className="flex flex-col items-center justify-center gap-8 rounded-xl border-2 border-black bg-info p-8 transition-all duration-200 ease-in-out">
      <div className="relative flex w-full items-center justify-center">
        <p className="absolute left-0 top-[50%] m-0 translate-y-[-50%] font-press text-xs">
          Pools:{pools.length}
        </p>
        <h3 className="m-0 font-press text-lg text-info-content">{name}</h3>
        <p className="absolute right-0 top-[50%] m-0 translate-y-[-50%] font-press text-xs">
          {address}
        </p>
      </div>

      {/* pools */}
      <div
        className={`flex transform flex-wrap items-center justify-center gap-4 overflow-hidden p-4 transition-height duration-200 ease-in-out ${
          !open && "max-h-[290px]"
        } `}
      >
        {pools?.map((pool: any, i: number) => <PoolCard {...pool} key={i} />)}
      </div>
      {pools.length > 2 && (
        <Button
          // style="outline"
          className="!rounded-full bg-white !p-3"
          onClick={() => setOpen((prev) => !prev)}
        >
          <ChevronDownIcon
            className={`block h-6 w-6 stroke-2 ${open && "rotate-180"}`}
            aria-hidden="true"
          />
        </Button>
      )}
    </div>
  );
}
