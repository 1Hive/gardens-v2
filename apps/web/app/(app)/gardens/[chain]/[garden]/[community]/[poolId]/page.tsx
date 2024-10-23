"use client";

import { useEffect } from "react";
import { Address } from "viem";
import { useToken } from "wagmi";
import {
  getAlloQuery,
  getPoolDataDocument,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { PoolMetrics, Proposals } from "@/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import PoolHeader from "@/components/PoolHeader";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { PoolTypes } from "@/types";

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
    variables: { poolId: poolId, garden: garden.toLowerCase() },
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
      {
        topic: "member",
        function: "activatePoints",
        type: "update",
        containerId: poolId,
      },
      {
        topic: "member",
        function: "deactivatePoints",
        type: "update",
        containerId: poolId,
      },
    ],
  });

  const strategyObj = data?.cvstrategies?.[0];
  const poolTokenAddr = strategyObj?.token as Address;
  const proposalType = strategyObj?.config.proposalType;
  const { data: poolToken } = useToken({
    address: poolTokenAddr,
    enabled: !!poolTokenAddr && PoolTypes[proposalType] === "funding",
    chainId: +chain,
  });

  useEffect(() => {
    if (error) {
      console.error("Error while fetching community data: ", error);
    }
  }, [error]);

  const { metadata: ipfsResult } = useMetadataIpfsFetch({
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
    const newProposalId = searchParams[QUERY_PARAMS.poolPage.newProposal];
    if (!strategyObj) {
      return;
    }
    const fetchedProposals = strategyObj?.proposals.map((p) =>
      p.proposalNumber.toString(),
    );
    if (newProposalId && !fetchedProposals.includes(newProposalId)) {
      console.debug("Pool: New proposal not yet fetched, refetching...", {
        newProposalId,
        fetchedProposals,
      });
      refetch();
    }
  }, [searchParams, strategyObj?.proposals]);

  const tokenGarden = data?.tokenGarden;

  if (!tokenGarden || (!poolToken && PoolTypes[proposalType] === "funding")) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data || !strategyObj) {
    return <div className="mt-52 text-center">Pool {poolId} not found</div>;
  }

  const communityAddress = strategyObj.registryCommunity.id as Address;
  const alloInfo = data.allos[0];
  const poolAmount = strategyObj.poolAmount as number;

  const isEnabled = data.cvstrategies?.[0]?.isEnabled as boolean;

  return (
    <div className="page-layout">
      <PoolHeader
        poolToken={poolToken}
        token={tokenGarden}
        strategy={strategyObj}
        arbitrableConfig={data.arbitrableConfigs[0]}
        poolId={poolId}
        ipfsResult={ipfsResult}
        isEnabled={isEnabled}
      />
      {isEnabled && (
        <>
          {poolToken && PoolTypes[proposalType] !== "signaling" && (
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
