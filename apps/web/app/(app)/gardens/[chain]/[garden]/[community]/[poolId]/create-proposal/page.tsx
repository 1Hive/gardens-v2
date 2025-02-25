"use client";

import React from "react";
import { Address, useToken } from "wagmi";
import { getPoolDataDocument, getPoolDataQuery } from "#/subgraph/.graphclient";
import { ProposalForm } from "@/components/Forms";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { calculateMinimumConviction } from "@/components/PoolHeader";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { PoolTypes } from "@/types";
import { CV_SCALE_PRECISION, MAX_RATIO_CONSTANT } from "@/utils/numbers";

export default function Page({
  params: { poolId, garden },
}: {
  params: { chain: string; poolId: number; garden: string };
}) {
  const { data } = useSubgraphQuery<getPoolDataQuery>({
    query: getPoolDataDocument,
    variables: { poolId: poolId, garden: garden.toLowerCase() },
  });
  const strategyObj = data?.cvstrategies?.[0];

  const { metadata } = useMetadataIpfsFetch({
    hash: strategyObj?.metadata,
  });

  const tokenGarden = data?.tokenGarden;
  const poolTokenAddr = strategyObj?.token;
  const proposalType = strategyObj?.config?.proposalType as number;
  const chainId = useChainIdFromPath();

  const { data: poolToken } = useToken({
    address: poolTokenAddr as Address,
    enabled: !!poolTokenAddr && PoolTypes[proposalType] === "funding",
    chainId,
  });

  if (!tokenGarden || !metadata || !strategyObj) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  const alloInfo = data?.allos[0];
  const poolAmount = strategyObj.poolAmount as number;

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

  function formatTokenAmount(amount: string | number, decimals: number) {
    const divisor = Math.pow(10, decimals);
    const result = Number(amount) / divisor;

    return result;
  }
  const formattedPoolAmount = formatTokenAmount(
    poolAmount,
    poolToken?.decimals ?? 18,
  );

  const spendingLimitValueNum = (
    (+formattedPoolAmount * +Math.round(spendingLimitValuePct)) /
    100
  ).toFixed(2);

  return (
    <div className="page-layout">
      <section className="section-layout">
        <div className="text-center sm:mt-5 mb-12">
          <h2 className="mb-2">Create a Proposal in Pool #{poolId}</h2>
          <div className="">
            <h4 className="">{metadata.title}</h4>
          </div>
        </div>
        <ProposalForm
          arbitrableConfig={data.arbitrableConfigs[0]}
          strategy={strategyObj}
          poolId={poolId}
          proposalType={proposalType}
          alloInfo={alloInfo}
          tokenGarden={tokenGarden}
          spendingLimit={+spendingLimitValueNum}
          spendingLimitPct={spendingLimitValuePct}
          poolAmount={poolAmount}
        />
      </section>
    </div>
  );
}
