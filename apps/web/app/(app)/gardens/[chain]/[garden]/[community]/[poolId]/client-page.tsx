"use client";

import { useEffect, useRef, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Address } from "viem";
import { useBalance, useAccount, useChainId, useContractRead } from "wagmi";
import {
  getAlloQuery,
  getMembersStrategyDocument,
  getMembersStrategyQuery,
  getMemberStrategyDocument,
  getMemberStrategyQuery,
  getPoolDataDocument,
  getPoolDataQuery,
  isMemberDocument,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import {
  Button,
  InfoBox,
  PoolGovernance,
  PoolMetrics,
  Proposals,
} from "@/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import PoolHeader from "@/components/PoolHeader";
import { chainConfigMap } from "@/configs/chains";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { SubscriptionId, usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { usePoolToken } from "@/hooks/usePoolToken";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { useSuperfluidToken } from "@/hooks/useSuperfluidToken";
import { registryCommunityABI } from "@/src/generated";
import { PoolTypes } from "@/types";
import { calculatePercentageBigInt, formatTokenAmount } from "@/utils/numbers";

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

  const communityAddress = strategy?.registryCommunity.id as Address;

  const { address: wallet } = useAccount();

  const tokenDecimals = strategy?.registryCommunity.garden.decimals;

  const chainId = useChainIdFromPath();

  //New queries and logic for PoolGovernance component
  const { data: memberPower, refetch: refetchMemberPower } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "memberPowerInStrategy",
    args: [wallet as Address, strategy?.id as Address],
    chainId: chainId,
    enabled: !!wallet,
  });

  const { data: memberData, error: errorMemberData } =
    useSubgraphQuery<isMemberQuery>({
      query: isMemberDocument,
      variables: {
        me: wallet?.toLowerCase(),
        comm: strategy?.registryCommunity.id.toLowerCase(),
      },
      changeScope: [
        {
          topic: "member",
          id: wallet,
          containerId: strategy?.poolId,
        },
        {
          topic: "proposal",
          containerId: strategy?.poolId,
          function: "allocate",
        },
      ],
      enabled: !!wallet && !!strategy?.registryCommunity?.id,
    });
  const { data: memberStrategyData } = useSubgraphQuery<getMemberStrategyQuery>(
    {
      query: getMemberStrategyDocument,
      variables: {
        member_strategy: `${wallet?.toLowerCase()}-${strategy?.id.toLowerCase()}`,
      },
      changeScope: [
        {
          topic: "proposal",
          containerId: strategy?.poolId,
          type: "update",
        },
        { topic: "member", id: wallet, containerId: strategy?.poolId },
      ],
      enabled: !!wallet && !!strategy?.id,
    },
  );

  const memberTokensInCommunity = BigInt(
    memberData?.member?.memberCommunity?.[0]?.stakedTokens ?? 0,
  );

  const { data: membersStrategyData } =
    useSubgraphQuery<getMembersStrategyQuery>({
      query: getMembersStrategyDocument,
      variables: {
        strategyId: `${strategy?.id.toLowerCase()}`,
      },
      changeScope: [
        {
          topic: "proposal",
          containerId: strategy?.poolId,
          type: "update",
        },
        { topic: "member", id: wallet, containerId: strategy?.poolId },
      ],
      enabled: !!wallet,
    });

  const membersStrategies = membersStrategyData?.memberStrategies;

  const isMemberCommunity =
    !!memberData?.member?.memberCommunity?.[0]?.isRegistered;

  const memberActivatedStrategy =
    memberStrategyData?.memberStrategy?.activatedPoints > 0n;

  const { subscribe, unsubscribe, connected } = usePubSubContext();

  const subscriptionId = useRef<SubscriptionId>();
  useEffect(() => {
    subscriptionId.current = subscribe(
      {
        topic: "member",
        id: wallet,
        containerId: strategy?.poolId,
        type: "update",
      },
      () => {
        return refetchMemberPower();
      },
    );
    return () => {
      if (subscriptionId.current) {
        unsubscribe(subscriptionId.current);
      }
    };
  }, [connected]);
  //

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

  // Effects
  useEffect(() => {
    if (errorMemberData) {
      console.error("Error while fetching member data: ", errorMemberData);
    }
  }, [errorMemberData]);

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

  const connectedChainId = useChainId();

  const { data: superTokenInfo } = useBalance({
    address: wallet as Address,
    token: effectiveSuperToken as Address,
    watch: true,
    enabled: !!effectiveSuperToken && !!wallet,
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

  const communityTokenDecimals =
    strategy?.registryCommunity?.garden?.decimals != null ?
      Number(strategy.registryCommunity.garden.decimals)
    : undefined;
  const decimalsForPoints = communityTokenDecimals ?? poolToken?.decimals ?? 18;

  const totalPointsActivatedInPool = formatTokenAmount(
    strategy?.totalEffectiveActivePoints,
    decimalsForPoints,
  );

  const minThresholdPoints = formatTokenAmount(
    strategy?.config.minThresholdPoints,
    decimalsForPoints,
  );

  const minThGtTotalEffPoints =
    +minThresholdPoints > +totalPointsActivatedInPool;

  const poolType = proposalType != null ? PoolTypes[proposalType] : undefined;
  const needsFundingToken = poolType === "funding";
  const isMissingFundingToken = needsFundingToken && !poolToken;
  const [hasWaitedForPoolToken, setHasWaitedForPoolToken] = useState(false);

  const disableCreateProposalBtnCondition: ConditionObject[] = [
    {
      condition: !isMemberCommunity,
      message: "Join community first",
    },
  ];

  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons(
    disableCreateProposalBtnCondition,
  );

  useEffect(() => {
    if (isMissingFundingToken && strategy && !error) {
      const timer = window.setTimeout(() => {
        setHasWaitedForPoolToken(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
      };
    }

    setHasWaitedForPoolToken(false);
    return undefined;
  }, [isMissingFundingToken, strategy, error]);

  const stillLoading =
    fetching ||
    (!data && !error) ||
    (isMissingFundingToken && !error && !hasWaitedForPoolToken);

  if ((!strategy || isMissingFundingToken) && stillLoading) {
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

  if (!strategy) {
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

  const showMissingFundingTokenWarning = isMissingFundingToken && !error;
  const alloInfo = data.allos[0];

  const isEnabled = data.cvstrategies?.[0]?.isEnabled as boolean;

  const createProposalUrl = `/gardens/${chain}/${garden}/${communityAddress}/${poolId}/create-proposal`;

  const memberPoolWeight =
    memberPower != null && +strategy.totalEffectiveActivePoints > 0 ?
      calculatePercentageBigInt(
        memberPower,
        BigInt(strategy.totalEffectiveActivePoints),
      )
    : undefined;

  return (
    <>
      {showMissingFundingTokenWarning && (
        <div className="col-span-12 mt-4">
          <InfoBox infoBoxType="warning" title="Funding token unavailable">
            We could not load the funding token for this pool.
          </InfoBox>
        </div>
      )}
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
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-10">
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

          {/* <div className="section-layout flex flex-col items-start xl:items-center gap-4">
            <div className="flex flex-col gap-4">
              <h3>Have an idea ?</h3>
              <span className="text-sm">
                Submit a proposal{" "}
                {PoolTypes[proposalType] !== "signaling" ?
                  "to request funding from the pool."
                : "to share your vision and build community support."}
              </span>
            </div>

            <div className="w-full flex items-center justify-center">
              <Link href={createProposalUrl}>
                <Button
                  icon={<PlusIcon height={24} width={24} />}
                  disabled={!isConnected || missmatchUrl || !isMemberCommunity}
                  tooltip={tooltipMessage}
                >
                  Create a proposal
                </Button>
              </Link>
            </div>
          </div> */}

          <PoolGovernance
            memberPoolWeight={memberPoolWeight}
            tokenDecimals={tokenDecimals}
            strategy={strategy}
            communityAddress={communityAddress}
            memberTokensInCommunity={memberTokensInCommunity}
            isMemberCommunity={isMemberCommunity}
            memberActivatedStrategy={memberActivatedStrategy}
            membersStrategyData={
              membersStrategies ?
                { memberStrategies: membersStrategies }
              : undefined
            }
          />
        </div>
      )}

      {isEnabled && (
        <Proposals
          poolToken={poolToken}
          strategy={{ ...strategy, title: metadata?.title }}
          alloInfo={alloInfo}
          communityAddress={communityAddress}
          createProposalUrl={createProposalUrl}
          proposalType={proposalType}
          minThGtTotalEffPoints={minThGtTotalEffPoints}
        />
      )}
    </>
  );
}
