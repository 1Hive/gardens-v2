"use client";
import { getCommunityByGardenQuery } from "#/subgraph/.graphclient";
import { gardenLand } from "@/assets";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type StrategyQuery = NonNullable<
  NonNullable<
    NonNullable<getCommunityByGardenQuery["tokenGarden"]>["communities"]
  >[number]["strategies"]
>[number];
export function PoolCard({ proposals, id, poolId }: StrategyQuery) {
  const pathname = usePathname();
  return (
    <Link
      className="relative flex min-w-56 snap-center flex-col items-start rounded-md border-2 border-black bg-white transition-all duration-150 ease-out hover:scale-105"
      href={`${pathname}/pool/${poolId}`}
    >
      <h4 className="my-3 w-full text-center font-press">{poolId}</h4>
      <div className="flex w-full flex-col p-4">
        <div className="flex justify-between text-xs">
          <p className="font-semibold">strategy:</p>
          {/* <p className="font-semibold">{strategy}</p> */}
        </div>
        <div className="flex justify-between ">
          <p className="font-semibold">proposals:</p>
          <p className="font-semibold">{proposals.length}</p>
        </div>
      </div>
      <Image
        src={gardenLand}
        alt="Garden land"
        className="h-10 w-full object-cover"
      />
    </Link>
  );
}
