"use client";

import { useEffect, useRef, useState } from "react";
import { Tab } from "@headlessui/react";
import { PowerIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { Address } from "viem";
import {
  useBalance,
  useAccount,
  useChainId,
  useContractRead,
  useToken,
} from "wagmi";
import {
  getAlloQuery,
  getCommunityDocument,
  getCommunityQuery,
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
  ActivatePoints,
  Button,
  CheckSybil,
  InfoBox,
  PoolGovernance,
  PoolMetrics,
  Proposals,
  RegisterMember,
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
import {
  calculatePercentageBigInt,
  formatTokenAmount,
  SCALE_PRECISION,
} from "@/utils/numbers";

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

  //Community Query and Register Member data
  const {
    data: result,
    error: errorCommunityQuery,
    refetch: refetchCommunityQuery,
  } = useSubgraphQuery<getCommunityQuery>({
    query: getCommunityDocument,
    enabled: !!wallet && !!strategy?.token,
    variables: {
      communityAddr: _community.toLowerCase(),
      tokenAddr: garden.toLocaleLowerCase(),
    },
    changeScope: [
      { topic: "community", id: communityAddress },
      { topic: "member", containerId: communityAddress },
    ],
  });

  const { data: isMemberResult } = useSubgraphQuery<isMemberQuery>({
    query: isMemberDocument,
    variables: {
      me: wallet?.toLowerCase(),
      comm: _community.toLowerCase(),
    },
    changeScope: [
      { topic: "community", id: communityAddress },
      { topic: "member", containerId: communityAddress },
    ],
    enabled: wallet !== undefined,
  });

  const registryCommunity = result?.registryCommunity;
  let {
    communityName,
    members,
    strategies,
    communityFee,
    registerStakeAmount,
    protocolFee,
  } = registryCommunity ?? {};

  const registerStakeAmountValue = registerStakeAmount ?? 0;
  const registerStakeAmountBn = BigInt(registerStakeAmountValue);
  const protocolFeeScaled = protocolFee != null ? BigInt(protocolFee) : 0n;
  const communityFeeScaled = communityFee != null ? BigInt(communityFee) : 0n;

  const communityFeeAmount =
    communityFeeScaled > 0n ?
      (registerStakeAmountBn * communityFeeScaled) / BigInt(SCALE_PRECISION)
    : 0n;
  const protocolFeeAmount =
    protocolFeeScaled > 0n ?
      (registerStakeAmountBn * protocolFeeScaled) / BigInt(SCALE_PRECISION)
    : 0n;

  const totalRegistrationCost =
    registerStakeAmountBn + // Min stake
    communityFeeAmount + // Community fee as % of min stake
    protocolFeeAmount; // Protocol fee as extra

  const [triggerSybilCheckModalClose, setTriggerSybilCheckModalClose] =
    useState(false);
  //

  const { data: memberData, error: errorMemberData } =
    useSubgraphQuery<isMemberQuery>({
      query: isMemberDocument,
      variables: {
        me: wallet?.toLowerCase(),
        comm: communityAddress?.toLowerCase(),
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

  const { data: tokenGarden } = useToken({
    address: strategy?.token as Address,
    chainId: chainId,
    enabled: !isMemberCommunity,
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

  const isMember = memberData?.member?.memberCommunity?.[0]?.isRegistered;

  return (
    <>
      {showMissingFundingTokenWarning && (
        <div className="col-span-12 mt-4">
          <InfoBox infoBoxType="warning" title="Funding token unavailable">
            We could not load the funding token for this pool.
          </InfoBox>
        </div>
      )}
      {/* ================= DESKTOP ================= */}

      {/*  Join community - Activate governace path and description from pool page */}
      <div className="sm:col-span-12 xl:col-span-9 sm:flex flex-col-reverse gap-6">
        {/* Join community box */}
        {!isMemberCommunity && registryCommunity && (
          <div className="border rounded-xl shadow-md border-tertiary-content bg-primary p-6 dark:bg-primary-soft-dark">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-tertiary-content/10 p-3 flex-shrink-0">
                <UserGroupIcon
                  className="h-6 w-6 text-tertiary-content"
                  aria-hidden="true"
                />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h4 className="mb-2">{`Join ${communityName} community`}</h4>
                  <p className="subtitle2 text-xs sm:text-sm">
                    You must be a member of this community before activating
                    governance or voting on proposals.
                  </p>
                </div>

                <InfoBox
                  infoBoxType="info"
                  title="Steps to get started"
                  className="w-full rounded-xl bg-neutral"
                >
                  <ul className="list-disc list-inside space-y-1 ml-2 font-press">
                    <li>{`Join the ${communityName} community.`}</li>
                    <li>
                      If eligible to vote - activate governance in this pool to
                      get Voting Power (VP).
                    </li>
                    <li>Vote on proposals</li>
                  </ul>
                </InfoBox>

                {tokenGarden && (
                  <RegisterMember
                    memberData={wallet ? isMemberResult : undefined}
                    registrationCost={totalRegistrationCost}
                    token={tokenGarden}
                    registryCommunity={registryCommunity}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Activate governance box */}
        {isMemberCommunity && !memberActivatedStrategy && (
          <div className="border rounded-xl shadow-md border-primary-content bg-primary p-6 dark:bg-primary-soft-dark">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary-content/10 p-3 flex-shrink-0">
                <PowerIcon
                  className="h-6 w-6 text-primary-content"
                  aria-hidden="true"
                />
              </div>

              <div className="flex-1 space-y-2">
                <div>
                  <h4 className="mb-2">Activate Governance & Start Voting</h4>
                  <p className="subtitle2 text-xs sm:text-sm">
                    You are already a community member. Activate governance in
                    this pool to receive Voting Power (VP) and vote on
                    proposals.
                  </p>
                </div>

                <InfoBox
                  infoBoxType="success"
                  title="How voting works"
                  className="w-full rounded-xl bg-neutral"
                >
                  <ul className="list-disc list-inside space-y-2 ml-2 font-press">
                    <li>
                      The pool has a total of <strong>100 VP</strong>, shared
                      between all activated members.
                    </li>
                    <li>
                      Your VP is your influence in the pool, based on your stake
                      and pool governance system.
                    </li>
                    <li>
                      If you’re eligible to vote, you can allocate your Voting
                      Power (VP) across multiple proposals at the same time—
                      this means you’re giving support to a proposal. The more
                      VP you allocate, the faster its conviction grows.
                    </li>
                  </ul>
                </InfoBox>

                <div className="flex flex-col gap-4">
                  <CheckSybil
                    strategy={strategy}
                    enableCheck={!memberActivatedStrategy}
                    triggerClose={triggerSybilCheckModalClose}
                  >
                    <ActivatePoints
                      strategy={strategy}
                      communityAddress={communityAddress}
                      isMemberActivated={memberActivatedStrategy}
                      isMember={isMemberCommunity}
                      handleTxSuccess={() =>
                        setTriggerSybilCheckModalClose(true)
                      }
                    />
                  </CheckSybil>
                </div>
              </div>
            </div>
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
          communityName={communityName ?? ""}
        />
      </div>

      {isEnabled && (
        <div className="hidden sm:col-span-12 xl:col-span-3 sm:flex flex-col gap-6">
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

      {/* ================= MOBILE ================= */}

      <div className="block md:hidden col-span-12">
        <Tab.Group>
          <Tab.List className="flex bg-primary rounded-lg p-1 gap-1 z-10">
            {["Overview", "Proposals", "Governance", "Settings"].map(
              (label) => (
                <Tab
                  key={label}
                  className={({ selected }) =>
                    `
                    flex-1 bg-neutral text-center font-medium rounded-full px-3 py-2 text-sm transition-all duration-200
                    ${
                      selected ?
                        "bg-primary-button text-neutral shadow"
                      : "text-base-content/70"
                    }
                  `
                  }
                >
                  {label}
                </Tab>
              ),
            )}
          </Tab.List>
          <Tab.Panels className="mt-4">
            <Tab.Panel>
              {isEnabled && (
                <div className="col-span-12">
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
                            sameAsUnderlying:
                              superTokenCandidate?.sameAsUnderlying,
                            address: effectiveSuperToken as Address,
                          }
                        }
                      />
                    )}
                  </>
                </div>
              )}
            </Tab.Panel>
            <Tab.Panel>
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
            </Tab.Panel>
            <Tab.Panel>
              <div>Governance Content</div>
            </Tab.Panel>
            <Tab.Panel>
              <div>Settings Content</div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </>
  );
}
