"use client";
import {
  CVStrategy,
  CVProposal,
  CVStrategyConfig,
} from "#/subgraph/.graphclient";
import { grass, poolGrassBlue } from "@/assets";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Badge } from "@/components";
import { TokenGarden } from "#/subgraph/.graphclient";
import { formatTokenAmount } from "@/utils/numbers";
import { Card } from "@/components";
import { Statistic } from "@/components";
import {
  CurrencyDollarIcon,
  HandRaisedIcon,
} from "@heroicons/react/24/outline";

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
  const poolType = config?.proposalType as number;

  return (
    <Card href={`${pathname}/pool/${poolId}`}>
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
        {poolType == 1 && (
          <Statistic
            icon={<CurrencyDollarIcon />}
            count={formatTokenAmount(poolAmount, tokenGarden?.decimals)}
            label="funds available"
          />
        )}
      </div>
      {!isEnabled ? (
        <div className="grid h-10 w-full items-center rounded-xl bg-warning">
          <p className="text-center text-sm font-semibold">
            waiting for council approval
          </p>
        </div>
      ) : (
        <Image
          src={poolType == 1 ? poolGrassBlue : grass}
          alt="Garden land"
          className="h-10 w-full rounded-lg object-cover"
        />
      )}
    </Card>
  );
}
