"use client";

import React, { useEffect, useState } from "react";
import { Address } from "viem";
import { getPoolDataDocument, getPoolDataQuery } from "#/subgraph/.graphclient";
import { ProposalForm } from "@/components/Forms";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import { CV_SCALE_PRECISION, MAX_RATIO_CONSTANT } from "@/utils/numbers";

export function Page({
  params: { poolId, garden },
}: {
  params: { chain: string; poolId: number; garden: string };
}) {
  const { data } = useSubgraphQuery<getPoolDataQuery>({
    query: getPoolDataDocument,
    variables: { poolId: poolId, garden: garden },
  });
  const strategyObj = data?.cvstrategies?.[0];

  const [metadata, setMetadata] = useState({ title: "", description: "" });

  useEffect(() => {
    const fetchMetadata = async () => {
      if (strategyObj?.metadata) {
        const fetchedMetadata = await getIpfsMetadata(
          strategyObj.metadata as string,
        );
        setMetadata(fetchedMetadata);
      }
    };

    fetchMetadata();
  }, [strategyObj]);

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

  if (!tokenGarden) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-layout">
      <section className="section-layout">
        <div className="text-center sm:mt-5">
          <h2 className="text-xl font-semibold leading-6 text-gray-900">
            Create a Proposal in Pool
          </h2>
          <div className="mt-1">
            <p className="text-sm">{metadata.title}</p>
          </div>
        </div>
        <ProposalForm
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
