"use client";

import {
  ArchiveBoxIcon,
  BoltIcon,
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
  Maybe,
  PoolMetadata,
} from "#/subgraph/.graphclient";
import { Skeleton } from "./Skeleton";
import TooltipIfOverflow from "./TooltipIfOverflow";
import { blueLand, grass } from "@/assets";
import { Badge, Card, DisplayNumber, Statistic } from "@/components";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { usePoolToken } from "@/hooks/usePoolToken";
import { PointSystems, PoolTypes } from "@/types";
import { capitalize } from "@/utils/text";

type Props = {
  token: string;
  pool: Pick<
    CVStrategy,
    "id" | "isEnabled" | "poolId" | "metadataHash" | "archived"
  > & {
    proposals: Pick<CVProposal, "id">[];
    config: Pick<CVStrategyConfig, "proposalType" | "pointSystem">;
    metadata?: Maybe<Omit<PoolMetadata, "id">>;
  };
};

export function PoolCard({ pool, token }: Props) {
  const pathname = usePathname();
  const searchParams = useCollectQueryParams();

  let {
    poolId,
    proposals,
    isEnabled,
    config,
    metadata: metadataFromSubgraph,
    metadataHash,
  } = pool;

  const { data: metadataResult } = useMetadataIpfsFetch({
    hash: metadataHash,
    enabled: metadataHash != null && !metadataFromSubgraph,
  });

  const metadata = metadataFromSubgraph ?? metadataResult;

  const poolType = config?.proposalType as number | undefined;

  const poolToken = usePoolToken({
    poolAddress: pool.id,
    poolTokenAddr: token,
    enabled: isEnabled && poolType != null && PoolTypes[poolType] === "funding",
  });

  const isNewPool =
    searchParams[QUERY_PARAMS.communityPage.newPool] === pool.poolId.toString();

  return (
    <>
      <Card
        href={`${pathname}/${poolId}`}
        className={`w-full bg-primary ${isNewPool ? "shadow-2xl" : ""}`}
      >
        <header className="mb-4 flex flex-col w-full justify-between items-start gap-2">
          <div className="flex flex-wrap w-full justify-between items-center gap-1">
            <Skeleton isLoading={!metadata}>
              <h3 className="flex items-center justify-between max-w-[190px]">
                <TooltipIfOverflow>{metadata?.title}</TooltipIfOverflow>
              </h3>
            </Skeleton>
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
          {isEnabled &&
            poolToken &&
            poolType != null &&
            PoolTypes[poolType] === "funding" && (
              <Statistic icon={<CurrencyDollarIcon />} label="funds">
                <DisplayNumber
                  number={poolToken.formatted || "0"}
                  compact={true}
                  tokenSymbol={poolToken.symbol}
                />
              </Statistic>
            )}
        </div>
        {!isEnabled ?
          <div className="banner md:min-w-[262px]">
            {pool.archived ?
              <ArchiveBoxIcon className="h-8 w-8 text-secondary-content" />
            : <ClockIcon className="h-8 w-8 text-secondary-content" />}
            <h6>{pool.archived ? "Archived" : "Waiting for approval"}</h6>
          </div>
        : <Image
            src={
              poolType != null && PoolTypes[poolType] === "funding" ?
                blueLand
              : grass
            }
            alt="Garden land"
            className="h-14 w-full rounded-lg object-cover"
          />
        }
      </Card>{" "}
    </>
  );
}
