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
>[number];

export function PoolCard({
  proposals,
  config,
  poolAmount,
  poolId,
  tokenGarden,
}: StrategyQuery & { tokenGarden: TokenGarden | undefined }) {
  const pathname = usePathname();

  poolAmount = poolAmount || 0;
  return (
    <Link
      className="border2 relative flex min-w-56 snap-center flex-col items-start rounded-md bg-white shadow transition-all duration-150 ease-out hover:border-2 hover:border-secondary "
      href={`${pathname}/pool/${poolId}`}
    >
      <div className="flex w-full items-baseline justify-around py-2">
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

          <Badge type={config?.proposalType as number} classNames="scale-75" />
        </div>
        <div className="flex items-baseline justify-between">
          <p className="stat-title">funds available:</p>
          <p className="px-2 text-right text-lg font-semibold">
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
  );
}
