"use client";
import { getCommunitiesByGardenQuery } from "#/subgraph/.graphclient";
import { gardenLand } from "@/assets";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Badge } from "@/components";
import { TokenGarden } from "#/subgraph/.graphclient";
import { formatTokenAmount } from "@/utils/numbers";
import { Card } from "@/components";
import { Identifier } from "@/components";
import {
  CurrencyDollarIcon,
  HandRaisedIcon,
} from "@heroicons/react/24/outline";
import { poolTypes } from "@/types";

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
  const poolType = config?.proposalType as number;

  return (
    <Card href={`${pathname}/pool/${poolId}`}>
      <header className="mb-4 flex w-full items-center justify-between">
        <h4>Pool #{poolId}</h4>
        <Badge poolType={poolType} />
      </header>
      <div className="mb-10 flex min-h-[60px] flex-col gap-2">
        <Identifier
          icon={<HandRaisedIcon />}
          count={proposals.length}
          label="proposals"
        />
        {poolType == 1 && (
          <Identifier
            icon={<CurrencyDollarIcon />}
            count={formatTokenAmount(poolAmount, tokenGarden?.decimals)}
            label="funds available"
          />
        )}
      </div>
      {!enabled ? (
        <div className="border2 grid h-10 w-full items-center rounded-xl bg-warning">
          <p className="text-center text-sm font-semibold">
            waiting for council approval
          </p>
        </div>
      ) : (
        <Image
          src={gardenLand}
          alt="Garden land"
          className="h-10 w-full rounded-xl object-cover"
        />
      )}
    </Card>
  );
}

{
}
