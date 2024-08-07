"use client";

import { useEffect, useState } from "react";
import {
  BoltIcon,
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  CheckIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { parseUnits } from "viem";
import {
  Allo,
  getAlloQuery,
  getPoolDataDocument,
  getPoolDataQuery,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { blueLand, grassLarge } from "@/assets";
import {
  Badge,
  Button,
  EthAddress,
  InfoIcon,
  PoolMetrics,
  Proposals,
  Statistic,
} from "@/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { chainDataMap } from "@/configs/chainServer";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/hooks/useCollectQueryParams";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { pointSystems, poolTypes } from "@/types";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import {
  CV_SCALE_PRECISION,
  formatTokenAmount,
  MAX_RATIO_CONSTANT,
} from "@/utils/numbers";

export const dynamic = "force-dynamic";

export type AlloQuery = getAlloQuery["allos"][number];

export default function Page({
  params: { chain, poolId, garden },
}: {
  params: { chain: string; poolId: number; garden: string };
}) {
  const searchParams = useCollectQueryParams();
  const { data, refetch, error } = useSubgraphQuery<getPoolDataQuery>({
    query: getPoolDataDocument,
    variables: { poolId: poolId, garden: garden },
    changeScope: [
      {
        topic: "pool",
        id: poolId,
      },
      {
        topic: "proposal",
        containerId: poolId,
        type: "update",
      },
    ],
  });

  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons();
  useEffect(() => {
    if (error) {
      console.error("Error while fetching community data: ", error);
    }
  }, [error]);

  const [ipfsResult, setIpfsResult] =
    useState<Awaited<ReturnType<typeof getIpfsMetadata>>>();

  const metadata = data?.cvstrategies?.[0]?.metadata;

  useEffect(() => {
    if (metadata && !ipfsResult) {
      getIpfsMetadata(metadata).then((d) => {
        setIpfsResult(d);
      });
    }
  }, [metadata]);

  const strategyObj = data?.cvstrategies?.[0];

  useEffect(() => {
    if (!strategyObj) {
      return;
    }
    console.debug(
      "maxRatio: " + strategyObj?.config?.maxRatio,
      "minThresholdPoints: " + strategyObj?.config?.minThresholdPoints,
      "poolAmount: " + strategyObj?.poolAmount,
    );
  }, [strategyObj?.config, strategyObj?.config, strategyObj?.poolAmount]);

  useEffect(() => {
    const newProposalId = searchParams[QUERY_PARAMS.poolPage.newPropsoal];
    if (
      newProposalId &&
      data &&
      !strategyObj?.proposals.some((c) => c.proposalNumber === newProposalId)
    ) {
      refetch();
    }
  }, [searchParams, strategyObj?.proposals]);

  if (!data || !ipfsResult) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data || !strategyObj) {
    return <div className="mt-52 text-center">Pool {poolId} not found</div>;
  }

  const pointSystem = data.cvstrategies?.[0].config?.pointSystem;
  const strategyAddr = strategyObj.id as Address;
  const communityAddress = strategyObj.registryCommunity.id as Address;
  const alloInfo = data.allos[0] as Allo;
  const proposalType = strategyObj?.config?.proposalType as number;
  const poolAmount = strategyObj?.poolAmount as number;
  const tokenGarden = data.tokenGarden as TokenGarden;
  const spendingLimitPct =
    (Number(strategyObj?.config?.maxRatio || 0) / CV_SCALE_PRECISION) * 100;

  function calculateDaysFromDecayAndBlockTime(
    decay: number,
    blockTime: number,
  ) {
    const ln2 = Math.log(1 / 2);
    const halfLifeInSeconds =
      (blockTime * ln2) / Math.log(decay / Math.pow(10, 7));
    const days = halfLifeInSeconds / (24 * 60 * 60);

    if (days <= 1) {
      const hours = Math.floor(days * 24);
      const minutes = Math.round((days * 24 * 60) % 60);

      if (hours < 1) {
        return `${minutes} min.`;
      } else {
        return `${hours} hs and ${minutes} min.`;
      }
    } else {
      return `${Math.round(days)} days`;
    }
  }

  function calculateMinimumConviction(weight: number, spendingLimit: number) {
    const weightNum = Number(weight) / CV_SCALE_PRECISION;

    const spendingLimitFraction = spendingLimit / 100;
    const maxRatioNum = spendingLimitFraction / MAX_RATIO_CONSTANT;

    let minimumConviction = weightNum / maxRatioNum ** 2;

    minimumConviction = minimumConviction * 100;

    return minimumConviction;
  }

  const blockTime =
    chainDataMap[chain as unknown as keyof typeof chainDataMap].blockTime;

  const poolConfig = [
    {
      label: "Min conviction",
      value: `${calculateMinimumConviction(strategyObj?.config.weight, spendingLimitPct * MAX_RATIO_CONSTANT).toFixed(2)}%`,
      info: "% of Pool's voting weight needed to pass the smallest funding proposal possible. Higher funding requests demand greater conviction to pass.",
    },
    {
      label: "Conviction growth",
      value: `${calculateDaysFromDecayAndBlockTime(strategyObj?.config.decay, blockTime)}`,
      info: "It's the time for conviction to reach proposal support. This parameter is logarithmic, represented as a half life",
    },
    {
      label: "Min Threshold",
      value: `${formatTokenAmount(strategyObj?.config?.minThresholdPoints, tokenGarden?.decimals)} `,
      info: `A fixed amount of ${tokenGarden?.symbol} that overrides Minimum Conviction when the Pool's activated governance is low.`,
    },
    {
      label: "Spending limit",
      // TODO: check number for some pools, they have more zeros or another config ?
      value: `${(spendingLimitPct * MAX_RATIO_CONSTANT).toFixed(2)}%`,
      info: "Max percentage of the pool funds that can be spent in a single proposal",
    },
  ];

  const filteredPoolConfig =
    poolTypes[proposalType] === "signaling" ?
      poolConfig.filter(
        (config) => !["Spending limit", "Min Threshold"].includes(config.label),
      )
    : poolConfig;

  const isEnabled = data.cvstrategies?.[0]?.isEnabled as boolean;

  return (
    <div className="page-layout">
      {/* Header */}
      <section className="section-layout flex flex-col gap-0 overflow-hidden">
        <header className="mb-2 flex flex-col">
          <div className="flex justify-between">
            <h2>
              {ipfsResult.title} #{poolId}
            </h2>
            <div className="flex gap-2">
              <Button
                btnStyle="outline"
                icon={<Cog6ToothIcon height={24} width={24} />}
                disabled={!isConnected || missmatchUrl}
                tooltip={tooltipMessage}
              >
                Edit
              </Button>
              {!isEnabled && (
                <Button
                  icon={<CheckIcon height={24} width={24} />}
                  disabled={!isConnected || missmatchUrl}
                  tooltip={tooltipMessage}
                >
                  Approve
                </Button>
              )}
            </div>
          </div>
          <div>
            <EthAddress address={strategyAddr} />
          </div>
        </header>
        <p>{ipfsResult.description}</p>
        <div className="mb-10 mt-8 flex items-start gap-24">
          <div className="flex flex-col gap-2 max-w-fit">
            <Statistic label="pool type">
              <Badge type={proposalType} />
            </Statistic>

            {poolTypes[proposalType] === "funding" && (
              <Statistic label="funding token">
                <Badge
                  isCapitalize
                  label={tokenGarden.symbol}
                  icon={<Square3Stack3DIcon />}
                />
              </Statistic>
            )}

            <Statistic label="voting weight system">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Badge
                  label="conviction voting"
                  classNames="text-secondary-content"
                  icon={<ChartBarIcon />}
                />
                <Badge label={pointSystems[pointSystem]} icon={<BoltIcon />} />
              </div>
            </Statistic>
          </div>
          <div className="flex flex-col gap-4">
            {filteredPoolConfig.map((config) => (
              <div key={config.label} className="flex items-center gap-4">
                <Statistic label={config.label}>
                  <InfoIcon content={config.info}>
                    <h3 className="text-neutral-content">{config.value} </h3>
                  </InfoIcon>
                </Statistic>
              </div>
            ))}
          </div>
        </div>
        {!isEnabled ?
          <div className="banner">
            <ClockIcon className="h-8 w-8 text-secondary-content" />
            <h6>Waiting for council approval</h6>
          </div>
        : <Image
            src={poolTypes[proposalType] === "funding" ? blueLand : grassLarge}
            alt="pool image"
            className="h-12 w-full rounded-lg object-cover"
          />
        }
      </section>

      {isEnabled && (
        <>
          {poolTypes[proposalType] !== "signaling" && (
            <PoolMetrics
              alloInfo={alloInfo}
              poolId={poolId}
              balance={poolAmount}
              strategyAddress={strategyAddr}
              strategy={strategyObj}
              communityAddress={communityAddress}
              tokenGarden={tokenGarden}
              pointSystem={pointSystem}
              chainId={parseInt(chain)}
              spendingLimitPct={spendingLimitPct}
            />
          )}
          <Proposals
            strategy={strategyObj}
            alloInfo={alloInfo}
            communityAddress={communityAddress}
            createProposalUrl={`/gardens/${chain}/${garden}/${communityAddress}/${poolId}/create-proposal`}
            proposalType={proposalType}
          />
        </>
      )}
    </div>
  );
}
