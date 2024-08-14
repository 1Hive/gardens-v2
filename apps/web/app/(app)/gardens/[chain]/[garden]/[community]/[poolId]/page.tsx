"use client";

import { useEffect } from "react";
import {
  BoltIcon,
  ChartBarIcon,
  ClockIcon,
  InformationCircleIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import {
  getAlloQuery,
  getPoolDataDocument,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { blueLand, grassLarge } from "@/assets";
import {
  Badge,
  EthAddress,
  PoolMetrics,
  Proposals,
  Statistic,
} from "@/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/hooks/useCollectQueryParams";
import { useProposalMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { PointSystems, PoolTypes } from "@/types";
import { CV_SCALE_PRECISION } from "@/utils/numbers";

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

  const { metadata: ipfsResult } = useProposalMetadataIpfsFetch({
    hash: data?.cvstrategies?.[0]?.metadata,
  });

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
  const alloInfo = data.allos[0];
  const proposalType = strategyObj?.config?.proposalType as number;
  const poolAmount = strategyObj?.poolAmount as number;
  const tokenGarden = data.tokenGarden;

  const isEnabled = data.cvstrategies?.[0]?.isEnabled as boolean;

  const spendingLimitPct =
    (Number(strategyObj?.config?.maxRatio || 0) / CV_SCALE_PRECISION) * 100;

  if (!tokenGarden || !strategyObj.registryCommunity) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

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
        <div className="mb-10 mt-8 flex flex-col items-start gap-2">
          <Statistic label="pool type" icon={<InformationCircleIcon />}>
            <Badge type={proposalType} />
          </Statistic>

          {PoolTypes[proposalType] === "funding" && (
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
              <Badge label={PointSystems[pointSystem]} icon={<BoltIcon />} />
            </div>
          </Statistic>
        </div>
        {!isEnabled ?
          <div className="banner">
            <ClockIcon className="h-8 w-8 text-secondary-content" />
            <h6>Waiting for council approval</h6>
          </div>
        : <Image
            src={PoolTypes[proposalType] === "funding" ? blueLand : grassLarge}
            alt="pool image"
            className="h-12 w-full rounded-lg object-cover"
          />
        }
      </section>

      {isEnabled && (
        <>
          {PoolTypes[proposalType] !== "signaling" && (
            <PoolMetrics
              alloInfo={alloInfo}
              poolId={poolId}
              poolAmount={poolAmount}
              communityAddress={communityAddress}
              tokenGarden={tokenGarden}
              chainId={chain}
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
