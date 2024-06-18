"use client"

import {
  TokenGarden,
  getPoolDataDocument,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { ProposalForm } from "@/components/Forms";
import useSubgraphQueryByChain from "@/hooks/useSubgraphQueryByChain";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import { MAX_RATIO_CONSTANT, CV_SCALE_PRECISION } from "@/utils/numbers";
import React from "react";
import { Address } from "viem";

export default async function page({
  params: { chain, poolId, garden },
}: {
  params: { chain: string; poolId: number; garden: string };
}) {
  const { data } = await useSubgraphQueryByChain<getPoolDataQuery>(
    chain,
    getPoolDataDocument,
    { poolId: poolId, garden: garden },
  );
  const strategyObj = data?.cvstrategies?.[0];

  if (!strategyObj) {
    return <div>{`Pool ${poolId} not found`}</div>;
  }

  const pointSystem = data?.cvstrategies?.[0].config?.pointSystem;
  const strategyAddr = strategyObj.id as Address;
  const communityAddress = strategyObj.registryCommunity.id as Address;
  const alloInfo = data?.allos[0];
  const proposalType = strategyObj?.config?.proposalType as number;
  const poolAmount = strategyObj?.poolAmount as number;
  const tokenGarden = data.tokenGarden;
  const metadata = data?.cvstrategies?.[0]?.metadata as string;

  const maxRatioDivPrecision =
    (Number(strategyObj?.config?.maxRatio) / CV_SCALE_PRECISION) *
    MAX_RATIO_CONSTANT;

  const spendingLimitPct = maxRatioDivPrecision * 100;
  const poolAmountSpendingLimit = poolAmount * maxRatioDivPrecision;

  const { title, description } = await getIpfsMetadata(metadata);

  return (
    <div className="mx-auto flex max-w-[820px] flex-col items-center justify-center gap-4">
      <div className="text-center sm:mt-5">
        <h2 className="text-xl font-semibold leading-6 text-gray-900">
          Create a Proposal in Pool
        </h2>
        <div className="mt-1">
          <p className="text-sm">{title}</p>
        </div>
      </div>
      <ProposalForm
        poolId={poolId}
        proposalType={proposalType}
        alloInfo={alloInfo}
        tokenGarden={tokenGarden as TokenGarden}
        tokenAddress={garden as Address}
        spendingLimit={poolAmountSpendingLimit}
        spendingLimitPct={spendingLimitPct}
        poolAmount={poolAmount}
      />
    </div>
  );
}
