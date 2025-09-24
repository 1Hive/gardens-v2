"use client";

import { useEffect } from "react";
import { Address } from "viem";
import { useBalance, useAccount } from "wagmi";
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
import { usePoolToken } from "@/hooks/usePoolToken";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { useSuperfluidToken } from "@/hooks/useSuperfluidToken";
import { PoolTypes } from "@/types";
import { formatTokenAmount } from "@/utils/numbers";

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
  const strategy = data?.cvstrategies?.[0];
  const poolTokenAddr = strategy?.token as Address;
  const proposalType = strategy?.config.proposalType;

  useEffect(() => {
    if (error) {
      console.error("Error while fetching community data: ", error);
    }
  }, [error]);

  const {
    superToken: superTokenCandidate,
    setSuperToken: setSuperTokenCandidate,
  } = useSuperfluidToken({
    token: strategy?.token,
    enabled: !strategy?.config.superfluidToken,
  });

  const effectiveSuperToken =
    strategy?.config.superfluidToken ??
    (superTokenCandidate && superTokenCandidate.sameAsUnderlying ?
      superTokenCandidate.id
    : null);

  const { address } = useAccount();
  const { data: superTokenInfo } = useBalance({
    address: address as Address,
    token: effectiveSuperToken as Address,
    watch: true,
    enabled: !!effectiveSuperToken && !!address,
  });

  const { metadata: ipfsResult } = useMetadataIpfsFetch({
    hash: strategy?.metadata,
  });

  useEffect(() => {
    const newProposalId = searchParams[QUERY_PARAMS.poolPage.newProposal];
    if (!strategy) {
      return;
    }
    const fetchedProposals = strategy?.proposals.map((p) =>
      p.proposalNumber.toString(),
    );
    if (newProposalId && !fetchedProposals.includes(newProposalId)) {
      console.debug("Pool: New proposal not yet fetched, refetching...", {
        newProposalId,
        fetchedProposals,
      });
      refetch();
    }
  }, [searchParams, strategy?.proposals]);

  const maxAmount = strategy?.config?.maxAmount ?? 0;

  const poolToken = usePoolToken({
    poolAddress: strategy?.id,
    poolTokenAddr: poolTokenAddr,
    enabled:
      !!strategy &&
      PoolTypes[strategy.config.proposalType] !== "signaling" &&
      !!poolTokenAddr,
    watch: true,
  });

  const totalPointsActivatedInPool =
    poolToken ?
      formatTokenAmount(
        strategy?.totalEffectiveActivePoints,
        +poolToken.decimals,
      )
    : 0;

  const minThresholdPoints =
    poolToken ?
      formatTokenAmount(
        strategy?.config.minThresholdPoints,
        +poolToken.decimals,
      )
    : "0";

  const minThGtTotalEffPoints =
    +minThresholdPoints > +totalPointsActivatedInPool;

  if (!strategy || (!poolToken && PoolTypes[proposalType] === "funding")) {
    console.debug("Loading pool data, waiting for", {
      strategy,
      poolTokenIfFundingPool: poolToken,
      isFundingPool: PoolTypes[proposalType] === "funding",
    });
    return (
      <div className="mt-96 col-span-12">
        <LoadingSpinner />
      </div>
    );
  }

  const communityAddress = strategy.registryCommunity.id as Address;
  const alloInfo = data.allos[0];

  const isEnabled = data.cvstrategies?.[0]?.isEnabled as boolean;

  return (
    <>
      <PoolHeader
        poolToken={poolToken}
        strategy={strategy}
        arbitrableConfig={data.arbitrableConfigs[0]}
        poolId={poolId}
        ipfsResult={ipfsResult}
        isEnabled={isEnabled}
        maxAmount={maxAmount}
        superTokenCandidate={superTokenCandidate}
        superToken={
          superTokenInfo && {
            ...superTokenInfo,
            sameAsUnderlying: superTokenCandidate?.sameAsUnderlying,
            address: effectiveSuperToken as Address,
          }
        }
        setSuperTokenCandidate={setSuperTokenCandidate}
        minThGtTotalEffPoints={minThGtTotalEffPoints}
      />

      {isEnabled && (
        <>
          {poolToken && PoolTypes[proposalType] !== "signaling" && (
            <PoolMetrics
              communityAddress={communityAddress}
              strategy={strategy}
              poolId={poolId}
              poolToken={poolToken}
              chainId={Number(chain)}
              superToken={
                superTokenInfo && {
                  ...superTokenInfo,
                  sameAsUnderlying: superTokenCandidate?.sameAsUnderlying,
                  address: effectiveSuperToken as Address,
                }
              }
            />
          )}
        </>
      )}

      {isEnabled && (
        <Proposals
          poolToken={poolToken}
          strategy={{ ...strategy, title: ipfsResult?.title }}
          alloInfo={alloInfo}
          communityAddress={communityAddress}
          createProposalUrl={`/gardens/${chain}/${garden}/${communityAddress}/${poolId}/create-proposal`}
          proposalType={proposalType}
          minThGtTotalEffPoints={minThGtTotalEffPoints}
        />
      )}
    </>
  );
}
