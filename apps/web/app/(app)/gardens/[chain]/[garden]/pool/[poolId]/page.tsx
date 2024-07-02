"use client";

import {
  Badge,
  Proposals,
  PoolMetrics,
  Statistic,
  EthAddress,
} from "@/components";
import { grassLarge, blueLand } from "@/assets";
import Image from "next/image";
import {
  Allo,
  TokenGarden,
  getAlloQuery,
  getPoolDataDocument,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import { pointSystems, poolTypes } from "@/types";
import { CV_SCALE_PRECISION } from "@/utils/numbers";
import {
  InformationCircleIcon,
  ChartBarIcon,
  BoltIcon,
  Square3Stack3DIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import useSubgraphQueryByChain from "@/hooks/useSubgraphQueryByChain";

export const dynamic = "force-dynamic";

export type AlloQuery = getAlloQuery["allos"][number];

export default function Pool({
  params: { chain, poolId, garden },
}: {
  params: { chain: string; poolId: number; garden: string };
}) {
  const { data, fetching, error } = useSubgraphQueryByChain<getPoolDataQuery>(
    chain,
    getPoolDataDocument,
    { poolId: poolId, garden: garden },
    {},
    {
      topic: "pool",
      id: poolId,
      chainId: chain,
    },
  );

  useEffect(() => {
    if (error) {
      console.error("Error while fetching pool data: ", error);
    }
  }, [error]);

  const [ipfsResult, setIpfsResult] =
    useState<Awaited<ReturnType<typeof getIpfsMetadata>>>();

  const metadata = data?.cvstrategies?.[0]?.metadata;

  useEffect(() => {
    if (metadata) {
      getIpfsMetadata(metadata).then((data) => {
        setIpfsResult(data);
      });
    }
  }, [metadata]);

  if (fetching || !ipfsResult) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  const strategyObj = data?.cvstrategies?.[0];
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

  const isEnabled = data.cvstrategies?.[0]?.isEnabled as boolean;

  const spendingLimitPct =
    (Number(strategyObj?.config?.maxRatio || 0) / CV_SCALE_PRECISION) * 100;

  console.log(
    "maxRatio: " + strategyObj?.config?.maxRatio,
    "minThresholdPoints: " + strategyObj?.config?.minThresholdPoints,
    "poolAmount: " + poolAmount,
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      {/* Header */}
      <section className="section-layout flex flex-col gap-0 overflow-hidden">
        <header>
          <h2>
            Pool #{poolId} - {ipfsResult.title}
          </h2>
        </header>
        <p className="mb-2">
          <EthAddress address={strategyAddr} />
        </p>
        <p>{ipfsResult.description}</p>
        <div className="mb-10 mt-8 flex flex-col items-start gap-2">
          <Statistic label="pool type" icon={<InformationCircleIcon />}>
            <Badge type={proposalType} />
          </Statistic>

          {poolTypes[proposalType] === "funding" && (
            <Statistic label="funding token" icon={<InformationCircleIcon />}>
              <Badge
                isCapitalize
                label={tokenGarden.symbol}
                icon={<Square3Stack3DIcon />}
              />
            </Statistic>
          )}

          <Statistic
            label="voting weight system"
            icon={<InformationCircleIcon />}
          >
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
        {!isEnabled ? (
          <div className="pool-footer">
            <ClockIcon className="h-8 w-8 text-secondary-content" />
            <h6>
              Waiting for council approval
            </h6>
          </div>
        ) : (
          <Image
            src={poolTypes[proposalType] === "funding" ? blueLand : grassLarge}
            alt="pool image"
            className="h-12 w-full rounded-lg object-cover"
          />
        )}
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
            createProposalUrl={`/gardens/${chain}/${garden}/pool/${poolId}/create-proposal`}
            proposalType={proposalType}
          />
        </>
      )}
    </div>
  );
}
