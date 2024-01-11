"use client";
import { gardenLand } from "@/assets";
import Image from "next/image";
import Link from "next/link";

export function PoolCard({ name, strategy, proposals, href, result }: any) {
  const poolStrategyAddress = result?.strategy;
  console.log(poolStrategyAddress);
  return (
    <Link
      className="min-w-56 relative flex snap-center flex-col items-start rounded-md border-2 border-black bg-white transition-all duration-150 ease-out hover:scale-105"
      href={`/gardens/communities/pool/${href}`}
    >
      <h4 className="my-3 w-full text-center font-press">{name}</h4>
      <div className="flex w-full flex-col p-4">
        <div className="flex justify-between text-xs">
          <p className="font-semibold">strategy:</p>
          <p className="font-semibold">{strategy}</p>
        </div>
        <div className="flex justify-between ">
          <p className="font-semibold">proposals:</p>
          <p className="font-semibold">{proposals}</p>
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
