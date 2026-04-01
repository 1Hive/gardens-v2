"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon,
  PowerIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Address, formatUnits } from "viem";
import { useBalance, useAccount, useChainId, useContractRead } from "wagmi";
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
  DisplayNumber,
  EthAddress,
  InfoBox,
  PoolGovernance,
  PoolMetrics,
  Proposals,
  RegisterMember,
} from "@/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import PoolHeader from "@/components/PoolHeader";
import { TokenGardenFaucet } from "@/components/TokenGardenFaucet";
import { chainConfigMap } from "@/configs/chains";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { SubscriptionId, usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { usePoolToken } from "@/hooks/usePoolToken";
import {
  dismissPendingSubgraphRefreshToast,
  useSubgraphQuery,
} from "@/hooks/useSubgraphQuery";
import { useSuperfluidToken } from "@/hooks/useSuperfluidToken";
import { cvStrategyABI, registryCommunityABI } from "@/src/generated";
import { PoolTypes } from "@/types";
import { logOnce } from "@/utils/log";
import {
  calculatePercentageBigInt,
  formatTokenAmount,
  SEC_TO_MONTH,
  SCALE_PRECISION,
} from "@/utils/numbers";

export type AlloQuery = getAlloQuery["allos"][number];
const SYNC_STREAM_HIDE_WINDOW_SECONDS = 15 * 60;

const toBigInt = (value: unknown): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string") {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
};

const LivePoolStreamedTotal = memo(function LivePoolStreamedTotal({
  proposals,
  poolToken,
}: {
  proposals:
    | Array<{
        proposalStream?: {
          currentFlowRate?: bigint | string | number | null;
          streamedUntilSnapshot?: bigint | string | number | null;
          lastSnapshotAt?: bigint | string | number | null;
        } | null;
      }>
    | undefined;
  poolToken?: { decimals: number; symbol: string } | null;
}) {
  const [nowMs, setNowMs] = useState<bigint>(() => BigInt(Date.now()));

  const hasActiveFlow = useMemo(
    () =>
      (proposals ?? []).some(
        (proposal) =>
          toBigInt(proposal.proposalStream?.currentFlowRate) > 0n,
      ),
    [proposals],
  );

  useEffect(() => {
    if (!hasActiveFlow) return;
    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setNowMs(BigInt(Date.now()));
    }, 100);
    return () => clearInterval(interval);
  }, [hasActiveFlow]);

  const totalStreamedBn = useMemo(() => {
    const total = (proposals ?? []).reduce((acc, proposal) => {
      const proposalStream = proposal.proposalStream;
      if (!proposalStream) return acc;

      const currentFlowRate = toBigInt(proposalStream.currentFlowRate);
      const streamedUntilSnapshot = toBigInt(
        proposalStream.streamedUntilSnapshot,
      );
      const lastSnapshotAtMs = toBigInt(proposalStream.lastSnapshotAt) * 1000n;
      const elapsedMs =
        currentFlowRate > 0n && lastSnapshotAtMs > 0n && nowMs > lastSnapshotAtMs ?
          nowMs - lastSnapshotAtMs
        : 0n;

      return acc + streamedUntilSnapshot + (currentFlowRate * elapsedMs) / 1000n;
    }, 0n);

    return total > 0n ? total : null;
  }, [nowMs, proposals]);

  if (!poolToken || totalStreamedBn == null) {
    return <span className="font-mono tabular-nums">--</span>;
  }

  return (
    <span className="font-mono tabular-nums">
      {Number(formatUnits(totalStreamedBn, poolToken.decimals)).toFixed(5)}
    </span>
  );
});

export default function ClientPage({
  params: { chain, pool: poolSlug, community: _community },
}: {
  params: { chain: string; pool: string; community: string };
}) {
  useEffect(() => {
    logOnce(
      "debug",
      "Loading page: (app)/gardens/[chain]/[community]/[pool]/page.tsx",
    );
  }, []);

  const searchParams = useCollectQueryParams();
  const newPoolId = searchParams[QUERY_PARAMS.communityPage.newPool];
  const strategyAddress = poolSlug.toLowerCase();
  const pendingNewPoolRefetch = useRef<string | null>(null);
  const [poolIdForScope, setPoolIdForScope] = useState<number | undefined>();
  const [hasResolvedInitialNewPoolLookup, setHasResolvedInitialNewPoolLookup] =
    useState(() => !Boolean(newPoolId));
  const { data, error, refetch, fetching } = useSubgraphQuery<getPoolDataQuery>(
    {
      query: getPoolDataDocument,
      variables: {
        strategyId: strategyAddress,
      },
      changeScope:
        poolIdForScope != null ?
          [
            {
              topic: "pool",
              id: poolIdForScope,
            },
            {
              topic: "proposal",
              containerId: poolIdForScope,
              type: "update",
            },
            {
              topic: "member",
              function: "activatePoints",
              type: "update",
              containerId: poolIdForScope,
            },
            {
              topic: "member",
              function: "deactivatePoints",
              type: "update",
              containerId: poolIdForScope,
            },
          ]
        : undefined,
    },
  );

  const strategy = data?.cvstrategies?.[0];
  const resolvedPoolId =
    strategy?.poolId != null ? Number(strategy.poolId) : undefined;
  const poolId = resolvedPoolId;

  useEffect(() => {
    if (!newPoolId) {
      pendingNewPoolRefetch.current = null;
      setHasResolvedInitialNewPoolLookup(true);
      return;
    }

    if (strategy ?? error) {
      setHasResolvedInitialNewPoolLookup(true);
      return;
    }

    setHasResolvedInitialNewPoolLookup(false);

    if (pendingNewPoolRefetch.current === newPoolId) {
      return;
    }

    pendingNewPoolRefetch.current = newPoolId;

    void refetch({ showToast: false }).finally(() => {
      if (pendingNewPoolRefetch.current === newPoolId) {
        setHasResolvedInitialNewPoolLookup(true);
      }
    });
  }, [newPoolId, strategy, error]);

  useEffect(() => {
    if (
      resolvedPoolId != null &&
      resolvedPoolId !== poolIdForScope &&
      Number.isFinite(resolvedPoolId)
    ) {
      setPoolIdForScope(resolvedPoolId);
    }
  }, [resolvedPoolId, poolIdForScope]);

  useEffect(() => {
    if (newPoolId && strategy) {
      dismissPendingSubgraphRefreshToast();
    }
  }, [newPoolId, strategy]);
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
  const { data: result } = useSubgraphQuery<getCommunityQuery>({
    query: getCommunityDocument,
    enabled: !!wallet && !!strategy?.token,
    variables: {
      communityAddr: _community.toLowerCase(),
    },
    changeScope: [
      { topic: "community", id: communityAddress },
      { topic: "member", containerId: communityAddress },
    ],
  });

  const { data: isMemberResult, fetching: isMemberFetching } =
    useSubgraphQuery<isMemberQuery>({
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
  let { communityName, communityFee, registerStakeAmount, protocolFee } =
    registryCommunity ?? {};

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
  const [selectedTab, setSelectedTab] = useState(0);
  const [hasStartedMembershipLookup, setHasStartedMembershipLookup] = useState(
    () => !wallet,
  );
  const [hasStartedActivationLookup, setHasStartedActivationLookup] = useState(
    () => !wallet,
  );
  const [hasJustJoinedCommunity, setHasJustJoinedCommunity] = useState(false);

  const {
    data: memberData,
    error: errorMemberData,
    fetching: memberDataFetching,
  } = useSubgraphQuery<isMemberQuery>({
    query: isMemberDocument,
    variables: {
      me: wallet?.toLowerCase(),
      comm: communityAddress?.toLowerCase(),
    },
    changeScope:
      poolId != null ?
        [
          {
            topic: "member",
            id: wallet,
            containerId: strategy?.registryCommunity?.id,
          },
          {
            topic: "proposal",
            containerId: poolId,
            function: "allocate",
          },
        ]
      : undefined,
    enabled: !!wallet && !!strategy?.registryCommunity?.id,
  });

  const { data: memberStrategyData, fetching: memberStrategyFetching } =
    useSubgraphQuery<getMemberStrategyQuery>({
      query: getMemberStrategyDocument,
      variables: {
        member_strategy: `${wallet?.toLowerCase()}-${strategy?.id.toLowerCase()}`,
      },
      changeScope:
        poolId != null ?
          [
            {
              topic: "proposal",
              containerId: poolId,
              type: "update",
            },
            { topic: "member", id: wallet, containerId: poolId },
          ]
        : undefined,
      enabled: !!wallet && !!strategy?.id,
    });

  const isMemberCommunityResult = isMemberResult?.member?.memberCommunity?.[0];
  const memberCommunityFromPoolResult =
    memberData?.member?.memberCommunity?.[0];
  const memberCommunityData =
    isMemberCommunityResult?.isRegistered ? isMemberCommunityResult
    : memberCommunityFromPoolResult?.isRegistered ?
      memberCommunityFromPoolResult
    : isMemberCommunityResult ?? memberCommunityFromPoolResult;

  const memberTokensInCommunity = BigInt(
    memberCommunityData?.stakedTokens ?? 0,
  );

  const { data: membersStrategyData } =
    useSubgraphQuery<getMembersStrategyQuery>({
      query: getMembersStrategyDocument,
      variables: {
        strategyId: `${strategy?.id.toLowerCase()}`,
      },
      changeScope:
        poolId != null ?
          [
            {
              topic: "proposal",
              containerId: poolId,
              type: "update",
            },
            { topic: "member", id: wallet, containerId: poolId },
          ]
        : undefined,
      enabled: !!wallet,
    });

  const membersStrategies = membersStrategyData?.memberStrategies;

  const isMemberCommunity = !!memberCommunityData?.isRegistered;

  const memberActivatedOnChain = memberPower != null && memberPower > 0n;
  const memberActivatedStrategy =
    memberActivatedOnChain ||
    memberStrategyData?.memberStrategy?.activatedPoints > 0n;
  const hasResolvedMembershipState =
    !wallet ||
    (hasStartedMembershipLookup && !isMemberFetching && !memberDataFetching);
  const hasResolvedActivationState =
    !wallet || (hasStartedActivationLookup && !memberStrategyFetching);
  const showJoinCommunitySection =
    hasResolvedMembershipState && !isMemberCommunity && !!registryCommunity;
  const showActivateGovernanceSection =
    hasResolvedMembershipState &&
    isMemberCommunity &&
    (hasResolvedActivationState || hasJustJoinedCommunity) &&
    !memberActivatedStrategy;

  useEffect(() => {
    if (
      !wallet ||
      isMemberFetching ||
      memberDataFetching ||
      isMemberCommunityResult !== undefined ||
      memberCommunityFromPoolResult !== undefined
    ) {
      setHasStartedMembershipLookup(true);
    }
  }, [
    wallet,
    isMemberFetching,
    memberDataFetching,
    isMemberCommunityResult,
    memberCommunityFromPoolResult,
  ]);

  useEffect(() => {
    if (!wallet || memberStrategyFetching || memberStrategyData !== undefined) {
      setHasStartedActivationLookup(true);
    }
  }, [wallet, memberStrategyFetching, memberStrategyData]);

  const previousResolvedMembershipState = useRef<boolean | null>(null);
  useEffect(() => {
    if (!hasResolvedMembershipState) {
      return;
    }

    if (
      previousResolvedMembershipState.current === false &&
      isMemberCommunity
    ) {
      setHasJustJoinedCommunity(true);
    }

    if (!isMemberCommunity || memberActivatedStrategy) {
      setHasJustJoinedCommunity(false);
    }

    previousResolvedMembershipState.current = isMemberCommunity;
  }, [hasResolvedMembershipState, isMemberCommunity, memberActivatedStrategy]);

  const { subscribe, unsubscribe, connected, publish } = usePubSubContext();

  const subscriptionId = useRef<SubscriptionId>();
  useEffect(() => {
    subscriptionId.current = subscribe(
      {
        topic: "member",
        id: wallet,
        containerId: poolId ?? strategy?.poolId,
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
  }, [connected, poolId]);

  const poolTokenAddr = strategy?.token as Address;

  const proposalType = strategy?.config.proposalType;
  const effectiveStrategy =
    strategy ?
      {
        ...strategy,
        config: {
          ...strategy.config,
          proposalType,
        },
      }
    : strategy;

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
    chainId,
    watch: true,
    enabled: !!effectiveSuperToken && !!wallet,
  });

  const tokenGarden = strategy?.registryCommunity?.garden;

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
    if (newProposalId && fetchedProposals.includes(newProposalId)) {
      dismissPendingSubgraphRefreshToast();
    }
    if (newProposalId && !fetchedProposals.includes(newProposalId)) {
      console.debug("Pool: New proposal not yet fetched, refetching...", {
        newProposalId,
        fetchedProposals,
      });
      refetch({ showToast: false });
    }
  }, [searchParams, strategy?.proposals]);

  const maxAmount = strategy?.config?.maxAmount ?? 0;

  const poolToken = usePoolToken({
    poolAddress: strategy?.id,
    poolTokenAddr: poolTokenAddr,
    chainId,
    enabled:
      !!strategy && PoolTypes[proposalType] !== "signaling" && !!poolTokenAddr,
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
  const isStreamingPool = poolType === "streaming";
  const needsFundingToken = poolType === "funding";
  const isMissingFundingToken = needsFundingToken && !poolToken;
  const isAwaitingNewPoolIndexing =
    Boolean(newPoolId) &&
    !strategy &&
    !error &&
    !hasResolvedInitialNewPoolLookup;
  const [hasWaitedForPoolToken, setHasWaitedForPoolToken] = useState(false);

  const [nowTs, setNowTs] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowTs(Math.floor(Date.now() / 1000));
    }, 15000);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const { data: lastRebalanceAtValue, refetch: refetchLastRebalanceAt } =
    useContractRead({
      address: strategy?.id as Address,
      abi: cvStrategyABI,
      functionName: "lastRebalanceAt",
      chainId,
      enabled: isStreamingPool && !!strategy?.id,
      watch: true,
    });
  const { data: isAuthorizedRebalanceCaller } = useContractRead({
    address: strategy?.id as Address,
    abi: cvStrategyABI,
    functionName: "isAuthorizedRebalanceCaller",
    args: wallet ? [wallet] : undefined,
    chainId,
    enabled: isStreamingPool && !!strategy?.id && !!wallet,
    watch: true,
  } as any);
  const lastRebalanceAt = Number(lastRebalanceAtValue ?? 0n);
  const hideSyncStreamButton =
    lastRebalanceAt > 0 &&
    nowTs - lastRebalanceAt < SYNC_STREAM_HIDE_WINDOW_SECONDS;
  const showSyncStreamButton =
    !hideSyncStreamButton && !!wallet && isAuthorizedRebalanceCaller === true;

  const {
    tooltipMessage: syncStreamTooltipMessage,
    isConnected: isSyncStreamConnected,
    missmatchUrl: isSyncStreamWrongNetwork,
  } = useDisableButtons();
  const { write: writeRebalance, isLoading: isRebalanceLoading } =
    useContractWriteWithConfirmations({
      address: strategy?.id as Address,
      abi: cvStrategyABI,
      functionName: "rebalance",
      contractName: "CVStrategy",
      fallbackErrorMessage:
        "Failed to sync stream for this strategy. Please try again.",
      onConfirmations: () => {
        void refetchLastRebalanceAt();
        publish({
          topic: "proposal",
          containerId: poolId,
          function: "rebalance",
        });
      },
    });

  const streamInfo = strategy?.stream;
  const superfluidExplorerBaseUrl =
    chainId != null ?
      chainConfigMap[chainId]?.superfluidExplorerUrl
    : undefined;
  const poolStreamExplorerUrl =
    (
      superfluidExplorerBaseUrl != null &&
      superfluidExplorerBaseUrl !== "" &&
      streamInfo?.superfluidGDA != null &&
      streamInfo.superfluidGDA !== ""
    ) ?
      `${superfluidExplorerBaseUrl}/pools/${streamInfo.superfluidGDA}`
    : undefined;
  const streamTokenDecimals =
    superTokenInfo?.decimals ?? poolToken?.decimals ?? 18;
  const maxFlowRateForDisplay = streamInfo?.maxFlowRate as
    | bigint
    | null
    | undefined;
  const currentFlowRateForDisplay = streamInfo?.streamLastFlowRate as
    | bigint
    | null
    | undefined;
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
    isAwaitingNewPoolIndexing ||
    (!data && !error) ||
    (strategy != null && poolId == null) ||
    (isMissingFundingToken && !error && !hasWaitedForPoolToken);

  if ((!strategy || isMissingFundingToken) && stillLoading) {
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

  if (poolId == null) {
    return (
      <div className="mt-96 col-span-12">
        <LoadingSpinner />
      </div>
    );
  }

  const showMissingFundingTokenWarning = isMissingFundingToken && !error;

  const alloInfo = data.allos[0];

  const isEnabled = data.cvstrategies?.[0]?.isEnabled as boolean;
  const showJoinCommunitySectionWhenEnabled =
    isEnabled && showJoinCommunitySection;
  const showActivateGovernanceSectionWhenEnabled =
    isEnabled && showActivateGovernanceSection;

  const createProposalUrl = `/gardens/${chain}/${communityAddress}/${strategyAddress}/create-proposal`;

  const memberPoolWeight =
    memberPower != null && +strategy.totalEffectiveActivePoints > 0 ?
      calculatePercentageBigInt(
        memberPower,
        BigInt(strategy.totalEffectiveActivePoints),
      )
    : undefined;

  const formatFlowPerMonth = (flowRate?: bigint | null) => {
    if (flowRate == null) return "--";
    const monthlyFlow =
      Number(formatUnits(flowRate, streamTokenDecimals)) * SEC_TO_MONTH;
    if (!Number.isFinite(monthlyFlow)) return "--";
    const value = monthlyFlow.toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });
    return poolToken?.symbol ? `${value} ${poolToken.symbol}` : value;
  };

  const StreamingInfoCard = () => {
    if (!isStreamingPool) return null;

    return (
      <section className="section-layout">
        <div className="flex flex-col gap-3">
          <h4>Stream Info</h4>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="subtitle2">Budget</p>
              <p className="text-right">
                {formatFlowPerMonth(maxFlowRateForDisplay)}/m
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="subtitle2">Streaming</p>
              <p className="text-right">
                {formatFlowPerMonth(currentFlowRateForDisplay)}/m
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="subtitle2">Total</p>
              <div className="flex items-center gap-2">
                <p className="text-right font-mono tabular-nums">
                  <LivePoolStreamedTotal
                    proposals={strategy?.proposals as any}
                    poolToken={poolToken}
                  />
                </p>
                {poolToken?.address && poolToken?.symbol && (
                  <EthAddress
                    address={poolToken.address}
                    label={poolToken.symbol}
                    shortenAddress={false}
                    icon={false}
                    actions="none"
                  />
                )}
              </div>
            </div>
          </div>
          {poolStreamExplorerUrl != null && poolStreamExplorerUrl !== "" && (
            <a
              href={poolStreamExplorerUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm underline underline-offset-2 w-fit inline-flex items-center gap-1"
            >
              View on Superfluid Explorer
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          )}
          {(currentFlowRateForDisplay ?? 0n) === 0n && (
            <InfoBox
              infoBoxType="info"
              className="w-full"
              title="No active stream"
            >
              This pool currently has no active outflow.
            </InfoBox>
          )}
          {showSyncStreamButton && (
            <Button
              btnStyle="outline"
              color="primary"
              className="sm:w-full"
              disabled={!isSyncStreamConnected || isSyncStreamWrongNetwork}
              tooltip={syncStreamTooltipMessage}
              isLoading={isRebalanceLoading}
              onClick={() => writeRebalance?.()}
              icon={<ArrowPathIcon className="h-4 w-4" />}
            >
              Sync Stream
            </Button>
          )}
        </div>
      </section>
    );
  };

  const registerAndActivateFromPool = (
    <>
      {/* Join community box */}
      {showJoinCommunitySectionWhenEnabled && (
        <div className="border rounded-xl shadow-md border-tertiary-content bg-primary p-4 sm:p-6 dark:bg-primary-soft-dark mt-6 sm:mt-0">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="rounded-full bg-tertiary-content/10 p-3 flex-shrink-0">
              <UserGroupIcon
                className="h-5 w-5 sm:h-6 sm:w-6 text-tertiary-content"
                aria-hidden="true"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h4 className="mb-1 sm:mb-2">{`Join ${communityName} community`}</h4>
                <p className=" text-xs sm:text-sm">
                  You must be a member of this community before activating
                  governance or voting on proposals.
                </p>
              </div>

              <div>
                <div className="w-full rounded-xl border border-tertiary-content/25 bg-tertiary-soft dark:bg-tertiary-dark-base/70 dark:border-tertiary-dark-border/40 p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <InformationCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-tertiary-content" />
                    <h6 className="text-tertiary-content">
                      Steps to get started
                    </h6>
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm leading-5 sm:leading-6 text-tertiary-hover-content dark:text-tertiary-dark-text-hover">
                    <li>{`Join the ${communityName} community.`}</li>
                    <li>
                      If eligible to vote, activate governance in this pool to
                      get Voting Power (VP).
                    </li>
                    <li>Vote on proposals.</li>
                  </ul>
                </div>
              </div>
              <div className="w-full flex justify-end">
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
        </div>
      )}

      {/* Activate governance box */}
      {showActivateGovernanceSectionWhenEnabled && (
        <div className="border rounded-xl shadow-md border-primary-content bg-primary p-4 sm:p-6 dark:bg-primary-soft-dark mt-6 sm:mt-0">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="rounded-full bg-primary-content/10 p-3 flex-shrink-0">
              <PowerIcon
                className="h-4 w-4 sm:h-6 sm:w-6 text-primary-content"
                aria-hidden="true"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h4 className="mb-2 sm:mb-3">
                  Activate Governance & Start Voting
                </h4>
                <p className="subtitle2 text-xs sm:text-sm">
                  You are already a community member. Activate governance in
                  this pool to receive Voting Power (VP) and vote on proposals.
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
                    Power (VP) across multiple proposals at the same time as
                    support. The more VP you allocate, the faster its conviction
                    grows.
                  </li>
                </ul>
              </InfoBox>

              <div className="flex flex-col items-end gap-4">
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
                    handleTxSuccess={() => setTriggerSybilCheckModalClose(true)}
                  />
                </CheckSybil>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return effectiveStrategy ?
      <>
        {showMissingFundingTokenWarning && (
          <div className="col-span-12 mt-4">
            <InfoBox infoBoxType="warning" title="Funding token unavailable">
              We could not load the funding token for this pool.
            </InfoBox>
          </div>
        )}
        {poolToken && tokenDecimals && (
          <TokenGardenFaucet
            token={{
              address: poolToken.address,
              decimals: tokenDecimals,
              symbol: poolToken.symbol,
            }}
          />
        )}

        {/* ================= DESKTOP ================= */}

        {/*  Join community - Activate governace path and description from pool page */}
        <div className="hidden col-span-12 xl:col-span-9 sm:flex flex-col gap-4">
          <PoolHeader
            poolToken={poolToken}
            strategy={effectiveStrategy}
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
          {registerAndActivateFromPool}
          {isEnabled && (
            <section className="flex flex-col gap-4 sm:gap-8">
              <Proposals
                poolToken={poolToken}
                strategy={{ ...effectiveStrategy, title: metadata?.title }}
                alloInfo={alloInfo}
                communityAddress={communityAddress}
                createProposalUrl={createProposalUrl}
                proposalType={proposalType}
                minThGtTotalEffPoints={minThGtTotalEffPoints}
              />
            </section>
          )}
        </div>

        {isEnabled && (
          <div className="hidden sm:col-span-12 xl:col-span-3 sm:flex flex-col gap-6">
            <>
              {poolToken && PoolTypes[proposalType] !== "signaling" && (
                <PoolMetrics
                  communityAddress={communityAddress}
                  strategy={effectiveStrategy}
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
              strategy={effectiveStrategy}
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

            <StreamingInfoCard />
          </div>
        )}

        {/* ================= MOBILE ================= */}

        <div className="block md:hidden col-span-12">
          <div
            role="tablist"
            className="tabs tabs-boxed w-full border1 bg-neutral p-1"
            aria-label="Pool sections"
          >
            {["Overview", "Proposals", "Governance"].map((label, index) => (
              <button
                key={label}
                type="button"
                role="tab"
                className={`tab rounded-lg border-0 text-neutral-soft-content ${selectedTab === index ? "tab-active !bg-primary-button dark:!bg-primary-dark-base !text-neutral-inverted-content" : "hover:text-neutral-content"}`}
                aria-selected={selectedTab === index}
                onClick={() => setSelectedTab(index)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {selectedTab === 0 && isEnabled && (
              <div className="col-span-12 sm:hidden space-y-6">
                <PoolHeader
                  poolToken={poolToken}
                  strategy={effectiveStrategy}
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
                {poolToken && PoolTypes[proposalType] !== "signaling" && (
                  <PoolMetrics
                    communityAddress={communityAddress}
                    strategy={effectiveStrategy}
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
              </div>
            )}

            {selectedTab === 1 && isEnabled && (
              <Proposals
                poolToken={poolToken}
                strategy={{ ...effectiveStrategy, title: metadata?.title }}
                alloInfo={alloInfo}
                communityAddress={communityAddress}
                createProposalUrl={createProposalUrl}
                proposalType={proposalType}
                minThGtTotalEffPoints={minThGtTotalEffPoints}
              />
            )}

            {selectedTab === 2 && (
              <>
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
                {registerAndActivateFromPool}
              </>
            )}
          </div>
        </div>
      </>
    : <>
        <div className="mt-96 col-span-12">
          <LoadingSpinner />
        </div>
      </>;
}
