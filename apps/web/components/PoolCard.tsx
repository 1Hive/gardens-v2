"use client";

import {
  ClockIcon,
  CurrencyDollarIcon,
  HandRaisedIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { blueLand, grass } from "@/assets";
import { Badge, Card, DisplayNumber, Statistic } from "@/components";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/hooks/useCollectQueryParams";
import { PoolTypes } from "@/types";

type Props = {
  tokenGarden: Pick<TokenGarden, "decimals" | "symbol">;
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
  const searchParams = useCollectQueryParams();

  let { poolAmount, poolId, proposals, isEnabled, config } = pool;

  poolAmount = poolAmount || 0;
  const poolType = config?.proposalType as number | undefined;

  const isNewPool =
    searchParams[QUERY_PARAMS.communityPage.newPool] === pool.poolId;
  return (
    <Card
      href={`${pathname}/${poolId}`}
      className={isNewPool ? "shadow-2xl" : ""}
    >
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
        {poolType && PoolTypes[poolType] === "funding" && (
          <Statistic icon={<CurrencyDollarIcon />} label="funds available">
            <DisplayNumber
              number={[BigInt(poolAmount), tokenGarden.decimals]}
              compact={true}
              tokenSymbol={tokenGarden.symbol}
            />
          </Statistic>
        )}
      </div>
      {!isEnabled ?
        <div className="banner  min-w-[262px]">
          <ClockIcon className="h-8 w-8 text-secondary-content" />
          <h6>Waiting for approval</h6>
        </div>
      : <Image
          src={poolType && PoolTypes[poolType] === "funding" ? blueLand : grass}
          alt="Garden land"
          className="h-12 w-full rounded-lg object-cover"
        />
      }
    </Card>
  );
}
