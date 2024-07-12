"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  CurrencyDollarIcon,
  HandRaisedIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  CVStrategy,
  CVProposal,
  CVStrategyConfig,
} from "#/subgraph/.graphclient";
import { grass, blueLand } from "@/assets";
import { Badge } from "@/components";
import { TokenGarden } from "#/subgraph/.graphclient";
import { formatTokenAmount } from "@/utils/numbers";
import { Card } from "@/components";
import { Statistic } from "@/components";
import { poolTypes } from "@/types";

type Props = {
  tokenGarden: Pick<TokenGarden, "decimals">;
  pool: Pick<
    CVStrategy,
    "id" | "isEnabled" | "poolAmount" | "poolId" | "metadata"
  > & {
    proposals: Pick<CVProposal, "id">[];
    config: Pick<CVStrategyConfig, "proposalType">;
  };
};

export function PoolCard({ pool, tokenGarden }: Props) {
  const pathname = usePathname();

  let { poolAmount, poolId, proposals, isEnabled, config } = pool;

  poolAmount = poolAmount || 0;
  const poolType = config?.proposalType as number | undefined;

  return (
    <Card href={`${pathname}/${poolId}`}>
      <header className="mb-4 flex w-full items-center justify-between">
        <h4>Pool #{poolId}</h4>
        <Badge type={poolType} />
      </header>
      <div className="mb-10 flex min-h-[60px] flex-col gap-2">
        <Statistic
          icon={<HandRaisedIcon />}
          count={proposals.length}
          label="proposals"
        />
        {poolType && poolTypes[poolType] === "funding" && (
          <Statistic
            icon={<CurrencyDollarIcon />}
            count={formatTokenAmount(poolAmount, tokenGarden?.decimals)}
            label="funds available"
          />
        )}
      </div>
      {!isEnabled ? (
        <div className="banner">
          <ClockIcon className="h-8 w-8 text-secondary-content" />
          <h6>Waiting for approval</h6>
        </div>
      ) : (
        <Image
          src={poolType && poolTypes[poolType] === "funding" ? blueLand : grass}
          alt="Garden land"
          className="h-10 w-full rounded-lg object-cover"
        />
      )}
    </Card>
  );
}
