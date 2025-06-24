"use client";

import React from "react";
import { Address, useBalance } from "wagmi";
import { getPoolDataDocument, getPoolDataQuery } from "#/subgraph/.graphclient";
import { ProposalForm } from "@/components/Forms";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { calculateMinimumConviction } from "@/components/PoolHeader";
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

  const { data: poolAmount } = useBalance({
    address: strategyObj?.id as Address,
    token: poolTokenAddr as Address,
    enabled:
      !!poolTokenAddr &&
      !!strategyObj?.id &&
      data &&
      PoolTypes[data.cvstrategies[0].config.proposalType] === "funding",
  });

  if (!tokenGarden || !metadata || !strategyObj) {
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
    poolAmount &&
    (
      (+poolAmount.formatted * +Math.round(spendingLimitValuePct)) /
      100
    ).toFixed(2);

  return (
    <div className="page-layout col-span-12 mx-auto">
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
