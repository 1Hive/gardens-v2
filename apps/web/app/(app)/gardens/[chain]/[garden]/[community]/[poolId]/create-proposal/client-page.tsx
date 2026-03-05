"use client";

import React from "react";
import { Address } from "wagmi";
import { getPoolDataDocument, getPoolDataQuery } from "#/subgraph/.graphclient";
import { ProposalForm } from "@/components/Forms";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { calculateMinimumConviction } from "@/components/PoolHeader";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { usePoolToken } from "@/hooks/usePoolToken";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { PoolTypes } from "@/types";
import {
  CV_SCALE_PRECISION,
  formatTokenAmount,
  MAX_RATIO_CONSTANT,
} from "@/utils/numbers";

type ClientPageProps = {
  params: {
    chain: string;
    community: string;
    poolId: string;
    garden: string;
  };
};

export default function ClientPage({
  params: { poolId: poolSlug, garden },
}: ClientPageProps) {
  const strategyAddress = poolSlug.toLowerCase();
  const { data } = useSubgraphQuery<getPoolDataQuery>({
    query: getPoolDataDocument,
    variables: { strategyId: strategyAddress, garden: garden.toLowerCase() },
  });
  const strategyObj = data?.cvstrategies?.[0];
  const resolvedPoolId =
    strategyObj?.poolId != null ? Number(strategyObj.poolId) : undefined;

  const { data: metadataResult } = useMetadataIpfsFetch({
    hash: strategyObj?.metadataHash,
    enabled: strategyObj && !strategyObj?.metadata,
  });

  const metadata = strategyObj?.metadata ?? metadataResult;

  const tokenGarden = data?.tokenGarden;
  const poolTokenAddr = strategyObj?.token;
  const proposalType = strategyObj?.config?.proposalType as number;

  const poolToken = usePoolToken({
    poolAddress: strategyObj?.id as Address,
    poolTokenAddr: poolTokenAddr as Address,
    enabled:
      !!poolTokenAddr &&
      !!strategyObj?.id &&
      data &&
      PoolTypes[data.cvstrategies[0].config.proposalType] === "funding",
    watch: true,
  });

  if (
    !tokenGarden ||
    metadata == null ||
    !strategyObj ||
    resolvedPoolId == null ||
    (poolToken == undefined && PoolTypes[proposalType] === "funding")
  ) {
    return (
      <div className="mt-96 col-span-12">
        <LoadingSpinner />
      </div>
    );
  }

  const alloInfo = data?.allos[0];

  const spendingLimitPctValue =
    (Number(strategyObj.config.maxRatio || 0) / CV_SCALE_PRECISION) * 100;

  const minimumConviction = calculateMinimumConviction(
    strategyObj.config.weight,
    spendingLimitPctValue * MAX_RATIO_CONSTANT,
  );

  const spendingLimitValuePct =
    (strategyObj.config.maxRatio / CV_SCALE_PRECISION) *
    (1 - Math.sqrt(minimumConviction / 100)) *
    100;

  const spendingLimitValueNum =
    poolToken &&
    ((+poolToken.formatted * +Math.round(spendingLimitValuePct)) / 100).toFixed(
      2,
    );

  const poolBalanceFormatted = formatTokenAmount(
    poolToken?.balance,
    poolToken?.decimals ?? 18,
    2,
  );

  return (
    <div className="page-layout col-span-12 mx-auto">
      <section className="section-layout">
        <div className="text-center sm:mt-5 mb-12">
          <h2 className="mb-2">Create a Proposal in Pool #{resolvedPoolId}</h2>
          <div className="">
            <h4 className="">{metadata.title}</h4>
          </div>
        </div>
        <ProposalForm
          arbitrableConfig={data.arbitrableConfigs[0]}
          poolBalance={poolBalanceFormatted}
          strategy={strategyObj}
          poolId={resolvedPoolId}
          poolParams={data.cvstrategies[0].config}
          proposalType={proposalType}
          alloInfo={alloInfo}
          tokenGarden={tokenGarden}
          spendingLimit={spendingLimitValueNum}
          spendingLimitPct={spendingLimitValuePct}
        />
      </section>
    </div>
  );
}
