"use client";

import React from "react";
import { Address } from "viem";
import { getPoolDataDocument, getPoolDataQuery } from "#/subgraph/.graphclient";
import { ProposalForm } from "@/components/Forms";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { CV_SCALE_PRECISION, MAX_RATIO_CONSTANT } from "@/utils/numbers";

export default function Page({
  params: { poolId, garden },
}: {
  params: { chain: string; poolId: number; garden: string };
}) {
  const { data } = useSubgraphQuery<getPoolDataQuery>({
    query: getPoolDataDocument,
    variables: { poolId: poolId, garden: garden },
  });
  const strategyObj = data?.cvstrategies?.[0];

  const { metadata } = useMetadataIpfsFetch({
    hash: strategyObj?.metadata,
  });

  const tokenGarden = data?.tokenGarden;

  if (!tokenGarden || !metadata || !strategyObj) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  const alloInfo = data?.allos[0];
  const proposalType = strategyObj.config?.proposalType as number;
  const poolAmount = strategyObj.poolAmount as number;

  const maxRatioDivPrecision =
    (Number(strategyObj.config?.maxRatio) / CV_SCALE_PRECISION) *
    MAX_RATIO_CONSTANT;

  const spendingLimitPct = maxRatioDivPrecision * 100;
  const poolAmountSpendingLimit = poolAmount * maxRatioDivPrecision;

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
          tokenAddress={garden as Address}
          spendingLimit={poolAmountSpendingLimit}
          spendingLimitPct={spendingLimitPct}
          poolAmount={poolAmount}
        />
      </section>
    </div>
  );
}
