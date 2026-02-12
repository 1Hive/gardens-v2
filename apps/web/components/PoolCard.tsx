"use client";

import {
  ArchiveBoxIcon,
  ArrowDownCircleIcon,
  ArrowDownIcon,
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
import { Divider } from "./Diivider";
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
        className={`group w-full bg-primary  ${isNewPool ? "shadow-2xl" : ""}`}
      >
        {/* <div className="absolute inset-0 opacity-[0.05]">
          {poolType != null && PoolTypes[poolType] === "funding" ?
            <svg
              className="w-full h-full"
              viewBox="0 0 400 80"
              fill="[#82c837]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="360" cy="10" r="40" fill="white" />
              <circle cx="340" cy="60" r="20" fill="white" />
              <circle cx="30" cy="70" r="25" fill="white" />
              <rect x="60" y="20" width="80" height="4" rx="2" fill="white" />
              <rect x="60" y="32" width="50" height="4" rx="2" fill="white" />
            </svg>
          : <svg
              className="w-full h-full"
              viewBox="0 0 400 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 60 Q100 20 200 50 T400 30"
                stroke="white"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M0 40 Q100 70 200 30 T400 50"
                stroke="white"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="350" cy="25" r="15" fill="white" />
              <circle cx="320" cy="55" r="8" fill="white" />
            </svg>
          }
        </div> */}

        <div className="mb-6">
          <div className="flex items-center justify-between gap-2">
            <Skeleton isLoading={!metadata}>
              <h3 className="flex items-center justify-between max-w-[190px]">
                <TooltipIfOverflow>{metadata?.title}</TooltipIfOverflow>
              </h3>
            </Skeleton>
            <Badge type={poolType} />
          </div>
        </div>

        <div className="mb-2">
          <div className="flex justify-between items-center ">
            <Statistic
              label="Governance"
              count={capitalize(PointSystems[config?.pointSystem])}
            />

            <Statistic
              count={proposals.length}
              label="proposals"
              className={`${isEnabled ? "visible" : "invisible"}`}
            />
          </div>

          {isEnabled &&
            poolToken &&
            poolType != null &&
            PoolTypes[poolType] === "funding" && (
              <div className="flex flex-col ">
                <Divider />

                <div className="w-full flex items-center justify-between ">
                  <h5 className="text-muted-foreground">Pool Funds:</h5>

                  <DisplayNumber
                    number={poolToken.formatted || "0"}
                    compact={true}
                    tokenSymbol={poolToken.symbol}
                    valueClassName="text-inherit"
                    symbolClassName="text-inherit"
                  />
                </div>
              </div>
            )}
          {/* <span className="text-muted-foreground">Pool Funds</span>
              <DisplayNumber
                number={poolToken.formatted || "0"}
                compact={true}
                tokenSymbol={poolToken.symbol}
                valueClassName="text-inherit"
                symbolClassName="text-inherit"
              /> */}

          {/* {pool.activeProposals > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            </div>
            <div className="text-xs text-primary font-medium">
              {pool.activeProposals} active proposal{pool.activeProposals !== 1 ? "s" : ""}
            </div>
          </div>
        )}
        {pool.activeProposals === 0 && (
          <div className="text-xs text-muted-foreground">0 active proposals</div>
        )} */}
        </div>
      </Card>
    </>
  );
}

//TODO: before code: keep it commented until agree upon card design
{
  /* <Card
        href={`${pathname}/${poolId}`}
        className={`w-full ${isNewPool ? "shadow-2xl" : ""}`}
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
                  valueClassName="text-inherit"
                  symbolClassName="text-inherit"
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
      </Card> */
}
