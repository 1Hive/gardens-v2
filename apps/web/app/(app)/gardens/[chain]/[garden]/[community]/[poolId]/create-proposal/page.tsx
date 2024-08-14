"use client";

import React from "react";
import { Address } from "viem";
import { getPoolDataDocument, getPoolDataQuery } from "#/subgraph/.graphclient";
import { ProposalForm } from "@/components/Forms";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useProposalMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
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

  const { metadata } = useProposalMetadataIpfsFetch({
    hash: strategyObj?.metadata,
  });

  if (!strategyObj) {
    return <div>{`Pool ${poolId} not found`}</div>;
  }

  const alloInfo = data?.allos[0];
  const proposalType = strategyObj.config?.proposalType as number;
  const poolAmount = strategyObj.poolAmount as number;
  const tokenGarden = data.tokenGarden;

  const maxRatioDivPrecision =
    (Number(strategyObj.config?.maxRatio) / CV_SCALE_PRECISION) *
    MAX_RATIO_CONSTANT;

  const spendingLimitPct = maxRatioDivPrecision * 100;
  const poolAmountSpendingLimit = poolAmount * maxRatioDivPrecision;

  if (!tokenGarden || !metadata) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-layout">
      <section className="section-layout">
        <div className="text-center sm:mt-5">
          <h2 className="text-xl font-semibold leading-6 text-gray-900">
            Create a Proposal in Pool #{poolId}
          </h2>
          <div className="mt-1">
            <h4 className="text-sm">{metadata.title}</h4>
          </div>
        </div>
        <ProposalForm
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
