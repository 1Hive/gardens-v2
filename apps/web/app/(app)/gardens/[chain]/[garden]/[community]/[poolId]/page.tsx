"use client";

import { useEffect, useState } from "react";
import {
  BoltIcon,
  ChartBarIcon,
  ClockIcon,
  InformationCircleIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
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
  EthAddress,
  InfoIcon,
  PoolMetrics,
  Proposals,
  Statistic,
} from "@/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/hooks/useCollectQueryParams";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { pointSystems, poolTypes } from "@/types";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import { CV_SCALE_PRECISION, MAX_RATIO_CONSTANT } from "@/utils/numbers";

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

  useEffect(() => {
    if (error) {
      console.error("Error while fetching pool data: ", error);
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

  const poolConfig = [
    {
      label: "Min conviction",
      value: 0,
      // TODO: add description and weight to query and perfom calculation
      info: "description here",
    },
    {
      // TODO: add decay to query and perfom calculation
      label: "Conviction growth",
      value: 0,
      info: "description here",
    },
    {
      label: "Min Threshold",
      value: strategyObj?.config.minThresholdPoints,
      // TODO: add better description
      info: "description here",
    },
    {
      label: "Spending limit",
      value: `${((spendingLimitPct ?? 0) * MAX_RATIO_CONSTANT).toFixed(2)}%`,
      info: "Max percentage of the pool that can be spent in a single proposal",
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
        <header className="mb-2">
          <h2>
            {ipfsResult.title} #{poolId}
          </h2>
          <EthAddress address={strategyAddr} />
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
