"use client";

import { useEffect, useState } from "react";
import { Address } from "viem";
import { useBalance, useAccount, useChainId } from "wagmi";
import {
  getAlloQuery,
  getPoolDataDocument,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { InfoBox, PoolMetrics, Proposals } from "@/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import PoolHeader from "@/components/PoolHeader";
import { chainConfigMap } from "@/configs/chains";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { usePoolToken } from "@/hooks/usePoolToken";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { useSuperfluidToken } from "@/hooks/useSuperfluidToken";
import { PoolTypes } from "@/types";
import { formatTokenAmount } from "@/utils/numbers";

export type AlloQuery = getAlloQuery["allos"][number];

export default function ClientPage({
  params: { chain, poolId, garden, community: _community },
}: {
  params: { chain: string; poolId: number; garden: string; community: string };
}) {
  const searchParams = useCollectQueryParams();

  const { data, refetch, error, fetching } = useSubgraphQuery<getPoolDataQuery>(
    {
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
    },
  );
  const strategy = data?.cvstrategies?.[0];
  const poolTokenAddr = strategy?.token as Address;
  const proposalType = strategy?.config.proposalType;

  const numericChainId = Number(chain);
  const chainConfig =
    chainConfigMap[chain] ??
    (!Number.isNaN(numericChainId) ?
      chainConfigMap[numericChainId]
    : undefined);
  const expectedChainId =
    chainConfig?.id ??
    (!Number.isNaN(numericChainId) ? numericChainId : undefined);
  const expectedChainName =
    chainConfig?.name ??
    (expectedChainId != null ?
      `chain ${expectedChainId}`
    : "the selected network");

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
  const connectedChainId = useChainId();
  const { data: superTokenInfo } = useBalance({
    address: address as Address,
    token: effectiveSuperToken as Address,
    watch: true,
    enabled: !!effectiveSuperToken && !!address,
  });

  const { data: metadataResult } = useMetadataIpfsFetch({
    hash: strategy?.metadataHash,
    enabled: strategy && !strategy?.metadata,
  });

  const metadata = strategy?.metadata ?? metadataResult;

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

  const poolType = proposalType != null ? PoolTypes[proposalType] : undefined;
  const needsFundingToken = poolType === "funding";
  const [hasWaitedForPoolToken, setHasWaitedForPoolToken] = useState(false);

  useEffect(() => {
    if (needsFundingToken && strategy && !poolToken && !error) {
      const timer = window.setTimeout(() => {
        setHasWaitedForPoolToken(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
      };
    }

    setHasWaitedForPoolToken(false);
    return undefined;
  }, [needsFundingToken, strategy, poolToken, error]);

  const stillLoading =
    fetching ||
    (!data && !error) ||
    (needsFundingToken && !poolToken && !error && !hasWaitedForPoolToken);

  if ((!strategy || (needsFundingToken && !poolToken)) && stillLoading) {
    console.debug("Loading pool data, waiting for", {
      strategy,
      poolTokenIfFundingPool: poolToken,
      isFundingPool: poolType === "funding",
    });
    return (
      <div className="mt-96 col-span-12">
        <LoadingSpinner />
      </div>
    );
  }

  const isWrongNetwork =
    connectedChainId != null &&
    expectedChainId != null &&
    connectedChainId !== expectedChainId;

  if (!strategy || (poolType === "funding" && !poolToken)) {
    const title =
      isWrongNetwork ? "Switch network to continue" : "Pool unavailable";
    const description =
      isWrongNetwork ?
        `Connect your wallet to ${expectedChainName} to view this pool.`
      : error ?
        "We hit an unexpected error while loading this pool. Please try again or report the issue if it persists."
      : "We couldn't find a pool that matches this URL. It may have been removed or you might be on the wrong network.";

    return (
      <div className="col-span-12 mt-48 flex justify-center">
        <InfoBox
          infoBoxType={isWrongNetwork ? "warning" : "error"}
          title={title}
        >
          {description}
        </InfoBox>
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
        ipfsResult={metadata}
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
          strategy={{ ...strategy, title: metadata?.title }}
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
