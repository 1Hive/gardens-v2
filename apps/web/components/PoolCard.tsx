"use client";

import {
  BoltIcon,
  ClockIcon,
  CurrencyDollarIcon,
  HandRaisedIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Address, useToken } from "wagmi";
import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
} from "#/subgraph/.graphclient";
import { Skeleton } from "./Skeleton";
import TooltipIfOverflow from "./TooltipIfOverflow";
import { blueLand, grass } from "@/assets";
import { Badge, Card, DisplayNumber, Statistic } from "@/components";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { PointSystems, PoolTypes } from "@/types";
import { capitalize } from "@/utils/text";

type Props = {
  token: string;
  pool: Pick<
    CVStrategy,
    "id" | "isEnabled" | "poolAmount" | "poolId" | "metadata"
  > & {
    proposals: Pick<CVProposal, "id">[];
    config: Pick<CVStrategyConfig, "proposalType" | "pointSystem">;
  };
  chainId: number;
};

export function PoolCard({ pool, token, chainId }: Props) {
  const pathname = usePathname();
  const searchParams = useCollectQueryParams();

  let { poolAmount, poolId, proposals, isEnabled, config, metadata } = pool;

  const { metadata: ipfsResult } = useMetadataIpfsFetch({
    hash: metadata,
  });

  poolAmount = poolAmount || 0;
  const poolType = config?.proposalType as number | undefined;
  const { data: tokenGarden } = useToken({
    address: token as Address,
    chainId: +chainId,
  });

  const isNewPool =
    searchParams[QUERY_PARAMS.communityPage.newPool] === pool.poolId.toString();
  return (
    <Card
      href={`${pathname}/${poolId}`}
      className={`w-[275px] sm:min-w-[313px] ${isNewPool ? "shadow-2xl" : ""}`}
    >
      <header className="mb-4 flex flex-col w-full justify-between items-start gap-2">
        <Skeleton isLoading={!ipfsResult}>
          <h3 className="flex items-start w-fit max-w-full">
            <TooltipIfOverflow>{ipfsResult?.title}</TooltipIfOverflow>
          </h3>
        </Skeleton>
        <div className="flex justify-between items-center w-full">
          <h6>POOL ID: #{poolId}</h6>
          <Badge type={poolType} />
        </div>
      </header>
      <div className="mb-8 flex flex-col gap-2">
        <Statistic
          icon={<BoltIcon />}
          label="voting weight"
          count={capitalize(PointSystems[config?.pointSystem])}
        />
        <Statistic
          icon={<HandRaisedIcon />}
          count={proposals.length}
          label="proposals"
          className={`${isEnabled ? "visible" : "invisible"}`}
        />
        {isEnabled && poolType && PoolTypes[poolType] === "funding" && (
          <Statistic icon={<CurrencyDollarIcon />} label="funds">
            <DisplayNumber
              number={[BigInt(poolAmount), tokenGarden?.decimals as number]}
              compact={true}
              tokenSymbol={tokenGarden?.symbol}
            />
          </Statistic>
        )}
      </div>
      {!isEnabled ?
        <div className="banner md:min-w-[262px]">
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
