"use client";
import { getCommunitiesByGardenQuery } from "#/subgraph/.graphclient";
import { gardenLand } from "@/assets";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { Badge } from "@/components";
import { TokenGarden } from "#/subgraph/.graphclient";
import { formatTokenAmount } from "@/utils/numbers";

type StrategyQuery = NonNullable<
  NonNullable<
    NonNullable<getCommunitiesByGardenQuery["tokenGarden"]>["communities"]
  >[number]["strategies"]
>[number] & { enabled?: boolean }; // Add 'enabled' property to the type definition

export function PoolCard({
  proposals,
  config,
  poolAmount,
  poolId,
  tokenGarden,
  enabled = true,
}: StrategyQuery & { tokenGarden: TokenGarden | undefined }) {
  const pathname = usePathname();

  poolAmount = poolAmount || 0;
  return (
    <div className="relative flex max-w-56 rounded-md bg-white shadow transition-all duration-150 ease-out ">
      {!enabled && (
        <div className="border2 absolute top-10 z-50 w-full bg-warning">
          <p className="text-center text-sm font-semibold">
            waiting for council approval
          </p>
        </div>
      )}

      <Link
        className={`border2 z-10 flex max-w-56 flex-1 snap-center flex-col items-start rounded-md bg-white  shadow transition-all duration-150 ease-out hover:border-2 hover:border-secondary ${!enabled && "opacity-70"}`}
        href={`${pathname}/pool/${poolId}`}
      >
        <div className="flex w-full items-center justify-around py-2">
          <div className="text-xs">
            <BuildingOffice2Icon className="h-7 w-7 text-secondary" />
          </div>
          <h4 className="w-fit text-center font-press text-secondary">
            {poolId}
          </h4>
        </div>
        <div className="flex w-full flex-col p-1">
          <div className="flex items-center justify-between text-xs">
            <p className="stat-title">pool type:</p>

            <Badge
              type={config?.proposalType as number}
              classNames="scale-75"
            />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="stat-title">funds available:</p>
            <p className="overflow-hidden truncate px-2 text-right text-lg font-semibold">
              {formatTokenAmount(poolAmount, tokenGarden?.decimals)}
            </p>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="stat-title">proposals:</p>
            <p className="px-2 text-right text-lg font-semibold">
              {proposals.length}
            </p>
          </div>
        </div>
        <Image
          src={gardenLand}
          alt="Garden land"
          className="h-10 w-full object-cover"
        />
      </Link>
    </div>
  );
}
