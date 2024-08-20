"use client";

import { useEffect } from "react";
import { useToken } from "wagmi";
import {
  getAlloQuery,
  getPoolDataDocument,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { PoolMetrics, Proposals } from "@/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import PoolHeader from "@/components/PoolHeader";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/hooks/useCollectQueryParams";
import { useProposalMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { PoolTypes } from "@/types";
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
  const strategyObj = data?.cvstrategies?.[0];
  const poolTokenAddr = strategyObj?.token as Address;
  const { data: poolToken } = useToken({
    address: poolTokenAddr,
    enabled: !!poolTokenAddr,
  });

  useEffect(() => {
    if (error) {
      console.error("Error while fetching community data: ", error);
    }
  }, [error]);

  const { metadata: ipfsResult } = useProposalMetadataIpfsFetch({
    hash: data?.cvstrategies?.[0]?.metadata,
  });

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

  const tokenGarden = data?.tokenGarden;

  if (!tokenGarden || !poolToken) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data || !strategyObj) {
    return <div className="mt-52 text-center">Pool {poolId} not found</div>;
  }

  const pointSystem = data.cvstrategies?.[0].config.pointSystem;
  const communityAddress = strategyObj.registryCommunity.id as Address;
  const alloInfo = data.allos[0];
  const proposalType = strategyObj.config.proposalType;
  const poolAmount = strategyObj.poolAmount as number;
  const spendingLimitPct =
    (Number(strategyObj.config.maxRatio || 0) / CV_SCALE_PRECISION) * 100;

  const isEnabled = data.cvstrategies?.[0]?.isEnabled as boolean;

  return (
    <div className="page-layout">
      <PoolHeader
        poolToken={poolToken}
        token={tokenGarden}
        strategy={strategyObj}
        poolId={poolId}
        ipfsResult={ipfsResult}
        isEnabled={isEnabled}
        pointSystem={pointSystem}
        chainId={chain}
        proposalType={proposalType}
        spendingLimitPct={spendingLimitPct}
      />
      {isEnabled && (
        <>
          {PoolTypes[proposalType] !== "signaling" && (
            <PoolMetrics
              poolToken={poolToken}
              alloInfo={alloInfo}
              poolId={poolId}
              poolAmount={poolAmount}
              communityAddress={communityAddress}
              chainId={chain}
            />
          )}
          <Proposals
            poolToken={poolToken}
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
