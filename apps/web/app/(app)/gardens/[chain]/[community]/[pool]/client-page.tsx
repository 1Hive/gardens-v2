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
import {
  useAccount,
  useBalance,
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
  EthAddress,
  InfoBox,
  LiveFlowingAmount,
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
import {
  PendingIndexedPublish,
  SubscriptionId,
  usePubSubContext,
} from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { usePoolToken } from "@/hooks/usePoolToken";
import {
  dismissPendingSubgraphRefreshToast,
  useSubgraphQuery,
} from "@/hooks/useSubgraphQuery";
import { useSuperfluidStream } from "@/hooks/useSuperfluidStream";
import { useSuperfluidToken } from "@/hooks/useSuperfluidToken";
import { cvStrategyABI, registryCommunityABI } from "@/src/generated";
import { PoolTypes } from "@/types";
import { logOnce } from "@/utils/log";
import { getMemberActivationState } from "@/utils/memberActivation";
import {
  calculatePercentageBigInt,
  formatTokenAmount,
  SEC_TO_MONTH,
  SCALE_PRECISION,
} from "@/utils/numbers";
import {
  createMemberOptimisticProjector,
  getPendingPoolGovernanceActivation,
} from "@/utils/optimisticMembers";
import { createProposalOptimisticProjector } from "@/utils/optimisticProposals";
import {
  getConfiguredSuperTokenAddress,
  getSuperTokenInfo,
  isSameAddress,
} from "@/utils/superToken";
import { formatLastRebalanceTooltip } from "@/utils/text";

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

type PoolProposalStreamLike = {
  currentUnits?: bigint | string | number | null;
  currentFlowRate?: bigint | string | number | null;
  streamedUntilSnapshot?: bigint | string | number | null;
  lastSnapshotAt?: bigint | string | number | null;
  isStopped?: boolean | null;
};

type PoolProposalLike = {
  proposalStream?: PoolProposalStreamLike | null;
  proposalStreams?: PoolProposalStreamLike[] | null;
};

const getProposalStream = (proposal: PoolProposalLike) =>
  proposal.proposalStream ?? proposal.proposalStreams?.[0] ?? null;

const LivePoolStreamedTotal = memo(function LivePoolStreamedTotal({
  proposals,
  poolToken,
  freezeAtSnapshot = false,
}: {
  proposals: PoolProposalLike[] | undefined;
  poolToken?: { decimals: number; symbol: string } | null;
  freezeAtSnapshot?: boolean;
}) {
  const { totalStreamedValue, totalStreamedRatePerSecond } = useMemo(() => {
    if (!poolToken) {
      return {
        totalStreamedValue: null,
        totalStreamedRatePerSecond: 0,
      };
    }

    const nowMs = BigInt(Date.now());
    const total = (proposals ?? []).reduce((acc, proposal) => {
      const proposalStream = getProposalStream(proposal);
      if (!proposalStream) return acc;

      const currentFlowRate =
        freezeAtSnapshot ? 0n : toBigInt(proposalStream.currentFlowRate);
      const streamedUntilSnapshot = toBigInt(
        proposalStream.streamedUntilSnapshot,
      );
      const lastSnapshotAtMs = toBigInt(proposalStream.lastSnapshotAt) * 1000n;
      const elapsedMs =
        (
          currentFlowRate > 0n &&
          lastSnapshotAtMs > 0n &&
          nowMs > lastSnapshotAtMs
        ) ?
          nowMs - lastSnapshotAtMs
        : 0n;

      return (
        acc + streamedUntilSnapshot + (currentFlowRate * elapsedMs) / 1000n
      );
    }, 0n);

    const totalFlowRateBn =
      freezeAtSnapshot ? 0n : (
        (proposals ?? []).reduce(
          (acc, proposal) =>
            acc + toBigInt(getProposalStream(proposal)?.currentFlowRate),
          0n,
        )
      );

    return {
      totalStreamedValue:
        total > 0n ? Number(formatUnits(total, poolToken.decimals)) : null,
      totalStreamedRatePerSecond:
        totalFlowRateBn > 0n ?
          Number(formatUnits(totalFlowRateBn, poolToken.decimals))
        : 0,
    };
  }, [freezeAtSnapshot, poolToken, proposals]);

  if (!poolToken || totalStreamedValue == null) {
    return <span className="font-mono tabular-nums">--</span>;
  }

  return (
    <LiveFlowingAmount
      value={totalStreamedValue}
      ratePerSecond={totalStreamedRatePerSecond}
      fractionDigits={5}
    />
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
    if (process.env.NODE_ENV !== "production") {
      console.info("[PoolPage] mounted", {
        chain,
        community: _community,
        poolSlug,
      });
    }
  }, []);

  const searchParams = useCollectQueryParams();
  const newPoolId = searchParams[QUERY_PARAMS.communityPage.newPool];
  const strategyAddress = poolSlug.toLowerCase();
  const { address: wallet } = useAccount();
  const {
    subscribe,
    unsubscribe,
    connected,
    publishAfterIndexed,
    pendingIndexedPublishes,
  } = usePubSubContext();
  const memberOptimisticProjector = useMemo(
    () =>
      createMemberOptimisticProjector({
        communityId: _community,
        strategyId: strategyAddress,
        memberAddress: wallet,
      }),
    [_community, strategyAddress, wallet],
  );
  const memberOptimistic = useMemo(
    () => ({
      scope: [
        { topic: "member" as const, containerId: _community, id: wallet },
        { topic: "member" as const, containerId: strategyAddress, id: wallet },
      ],
      apply: memberOptimisticProjector,
    }),
    [_community, memberOptimisticProjector, strategyAddress, wallet],
  );
  const proposalOptimistic = useMemo(
    () => ({
      scope: [
        { topic: "proposal" as const, containerId: strategyAddress },
        { topic: "member" as const, containerId: _community, id: wallet },
        { topic: "member" as const, containerId: strategyAddress, id: wallet },
      ],
      apply<TData>(
        data: TData | undefined,
        records: PendingIndexedPublish[],
      ) {
        return memberOptimisticProjector(
          createProposalOptimisticProjector({
            strategyId: strategyAddress,
            allocator: wallet,
          })(data, records),
          records,
        );
      },
    }),
    [_community, memberOptimisticProjector, strategyAddress, wallet],
  );
  const pendingNewPoolRefetch = useRef<string | null>(null);
  const [hasResolvedInitialNewPoolLookup, setHasResolvedInitialNewPoolLookup] =
    useState(() => !Boolean(newPoolId));
  const { data, error, refetch, fetching } = useSubgraphQuery<getPoolDataQuery>(
    {
      query: getPoolDataDocument,
      variables: {
        strategyId: strategyAddress,
      },
      changeScope: [
        {
          topic: "pool",
          id: strategyAddress,
          type: "update",
        },
        {
          topic: "proposal",
          containerId: strategyAddress,
          type: "update",
        },
        {
          topic: "member" as const,
          function: "activatePoints",
          type: "update" as const,
          containerId: strategyAddress,
        },
        {
          topic: "member" as const,
          function: "deactivatePoints",
          type: "update" as const,
          containerId: strategyAddress,
        },
      ],
      optimistic: proposalOptimistic,
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
    if (newPoolId && strategy) {
      dismissPendingSubgraphRefreshToast();
    }
  }, [newPoolId, strategy]);
  const communityAddress = strategy?.registryCommunity?.id as
    | Address
    | undefined;
  const routeCommunityAddress = _community.toLowerCase();
  const poolCommunityAddress = communityAddress?.toLowerCase();
  const communityRouteMismatch =
    poolCommunityAddress != null &&
    routeCommunityAddress !== poolCommunityAddress;

  const tokenDecimals = strategy?.registryCommunity?.garden?.decimals;

  const chainId = useChainIdFromPath();

  //New queries and logic for PoolGovernance component
  const { data: memberPower, refetch: refetchMemberPower } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "memberPowerInStrategy",
    args: [wallet as Address, strategy?.id as Address],
    chainId: chainId,
    enabled: !!wallet && !!communityAddress && !!strategy?.id,
  });

  //Community Query and Register Member data
  const { data: result } = useSubgraphQuery<getCommunityQuery>({
    query: getCommunityDocument,
    enabled:
      !!wallet &&
      !!strategy?.token &&
      !!poolCommunityAddress &&
      !communityRouteMismatch,
    variables: {
      communityAddr: poolCommunityAddress ?? "",
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
        comm: poolCommunityAddress ?? "",
      },
      changeScope: [
        { topic: "community", id: communityAddress },
        { topic: "member", containerId: communityAddress },
      ],
    enabled:
      wallet !== undefined &&
      poolCommunityAddress !== undefined &&
      !communityRouteMismatch,
    optimistic: memberOptimistic,
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
            containerId: strategyAddress,
            function: "allocate",
          },
        ]
      : undefined,
    enabled: !!wallet && !!communityAddress,
    optimistic: proposalOptimistic,
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
              containerId: strategyAddress,
              type: "update",
            },
            { topic: "member", id: wallet, containerId: strategyAddress },
          ]
        : undefined,
      enabled: !!wallet && !!strategy?.id,
      optimistic: proposalOptimistic,
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
  const walletSupportSnapshot = useMemo(
    () =>
      memberData?.member?.stakes
        ?.filter(
          (stake) =>
            stake.proposal.strategy.id.toLowerCase() === strategyAddress,
        )
        .map((stake) => ({
          proposalId: stake.proposal.id,
          proposalNumber: stake.proposal.proposalNumber.toString(),
          amount: stake.amount.toString(),
        })) ?? [],
    [memberData?.member?.stakes, strategyAddress],
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
              containerId: strategyAddress,
              type: "update",
            },
            ...(wallet ?
              [{ topic: "member" as const, id: wallet, containerId: strategyAddress }]
            : []),
          ]
        : undefined,
      enabled: !!strategy?.id,
      optimistic: proposalOptimistic,
    });

  const membersStrategies = membersStrategyData?.memberStrategies;

  const isMemberCommunity = !!memberCommunityData?.isRegistered;

  const pendingPoolGovernanceActivation = useMemo(
    () =>
      getPendingPoolGovernanceActivation(pendingIndexedPublishes, {
        chainId: chain,
        strategyId: strategyAddress,
        memberAddress: wallet,
      }),
    [chain, pendingIndexedPublishes, strategyAddress, wallet],
  );

  const { memberActivatedStrategy: indexedMemberActivatedStrategy } =
    getMemberActivationState({
      memberPower,
      subgraphActivatedPoints:
        memberStrategyData?.memberStrategy?.activatedPoints,
    });
  const memberActivatedStrategy =
    pendingPoolGovernanceActivation ?? indexedMemberActivatedStrategy;
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

  const subscriptionId = useRef<SubscriptionId>();
  useEffect(() => {
    subscriptionId.current = subscribe(
      {
        topic: "member",
        id: wallet,
        containerId: strategyAddress,
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
  }, [connected, strategyAddress]);

  const poolTokenAddr = strategy?.token as Address;

  const strategyConfig = strategy?.config;
  const proposalType = strategyConfig?.proposalType;
  const poolType = proposalType != null ? PoolTypes[proposalType] : undefined;
  const effectiveStrategy =
    strategy && strategyConfig && proposalType != null ?
      {
        ...strategy,
        config: {
          ...strategyConfig,
          proposalType,
        },
      }
    : undefined;

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

  const configuredSuperToken = getConfiguredSuperTokenAddress(
    strategyConfig?.superfluidToken,
  );
  const shouldDiscoverSuperToken =
    !!strategy?.token &&
    (!configuredSuperToken ||
      isSameAddress(configuredSuperToken, strategy.token));
  const {
    superToken: superTokenCandidate,
    isFetching: isSuperTokenCandidateFetching,
    setSuperToken: setSuperTokenCandidate,
  } = useSuperfluidToken({
    token: strategy?.token,
    enabled: shouldDiscoverSuperToken,
  });

  const effectiveSuperToken =
    configuredSuperToken ??
    (superTokenCandidate && superTokenCandidate.sameAsUnderlying ?
      superTokenCandidate.id
    : null);
  const effectiveSuperTokenSameAsUnderlying =
    (superTokenCandidate?.sameAsUnderlying ?? false) ||
    isSameAddress(effectiveSuperToken, strategy?.token);

  const connectedChainId = useChainId();

  const { data: superTokenMetadata } = useToken({
    address: effectiveSuperToken as Address,
    chainId,
    enabled: !!effectiveSuperToken,
  });

  const { data: superTokenBalance } = useBalance({
    address: wallet as Address,
    token: effectiveSuperToken as Address,
    chainId,
    watch: true,
    enabled: !!effectiveSuperToken && !!wallet,
  });

  const superTokenInfo = getSuperTokenInfo({
    address: effectiveSuperToken as Address | undefined,
    token: superTokenMetadata,
    balance: superTokenBalance,
    sameAsUnderlying: effectiveSuperTokenSameAsUnderlying,
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

  const maxAmount = strategyConfig?.maxAmount ?? 0;

  const { poolToken, isLoading: isPoolTokenLoading } = usePoolToken({
    poolAddress: strategyAddress,
    poolTokenAddr: poolTokenAddr,
    chainId,
    enabled: !!strategy && poolType !== "signaling" && !!poolTokenAddr,
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
    strategyConfig?.minThresholdPoints,
    decimalsForPoints,
  );

  const minThGtTotalEffPoints =
    +minThresholdPoints > +totalPointsActivatedInPool;

  const isStreamingPool = poolType === "streaming";
  const needsFundingToken = poolType === "funding";
  const isMissingFundingToken =
    needsFundingToken && !isPoolTokenLoading && !poolToken;
  const isAwaitingNewPoolIndexing =
    Boolean(newPoolId) &&
    !strategy &&
    !error &&
    !hasResolvedInitialNewPoolLookup;

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
  const lastRebalanceTooltip = formatLastRebalanceTooltip(lastRebalanceAt);

  const {
    tooltipMessage: syncStreamTooltipMessage,
    isConnected: isSyncStreamConnected,
    missmatchUrl: isSyncStreamWrongNetwork,
  } = useDisableButtons();
  const syncStreamButtonTooltip =
    syncStreamTooltipMessage != null ?
      `${syncStreamTooltipMessage}\n${lastRebalanceTooltip}`
    : lastRebalanceTooltip;
  const { write: writeRebalance, isLoading: isRebalanceLoading } =
    useContractWriteWithConfirmations({
      address: strategy?.id as Address,
      abi: cvStrategyABI,
      functionName: "rebalance",
      contractName: "CVStrategy",
      fallbackErrorMessage:
        "Failed to sync stream for this strategy. Please try again.",
      onConfirmations: (receipt) => {
        void refetchLastRebalanceAt();
        publishAfterIndexed(receipt, {
          topic: "stream",
          containerId: strategyAddress,
          function: "rebalance",
          chainId,
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
  const streamLastFlowRate = streamInfo?.streamLastFlowRate as
    | bigint
    | null
    | undefined;
  const {
    currentFlowRateBn: liveCurrentFlowRateBn,
    hasFetched: hasFetchedLivePoolFlow,
  } = useSuperfluidStream({
    receiver: (streamInfo?.superfluidGDA ?? "") as Address,
    superToken: (effectiveSuperToken ?? "") as Address,
    chainId,
    containerId: strategyAddress,
    sender: strategyAddress,
    includePoolMembers: false,
  });
  const proposalFlowRateFallbackBn = useMemo(
    () =>
      (strategy?.proposals ?? []).reduce((acc, proposal) => {
        const proposalStream = getProposalStream(proposal);
        if (!proposalStream || proposalStream.isStopped) {
          return acc;
        }

        return acc + toBigInt(proposalStream.currentFlowRate);
      }, 0n),
    [strategy?.proposals],
  );
  const currentFlowRateForDisplay =
    liveCurrentFlowRateBn != null && liveCurrentFlowRateBn > 0n ?
      liveCurrentFlowRateBn
    : streamLastFlowRate != null && streamLastFlowRate > 0n ? streamLastFlowRate
    : proposalFlowRateFallbackBn;
  const hasEligibleStreamingProposal = useMemo(
    () =>
      (strategy?.proposals ?? []).some((proposal) => {
        const proposalStream = getProposalStream(proposal);
        if (!proposalStream || proposalStream.isStopped) {
          return false;
        }

        return (
          toBigInt(proposalStream.currentUnits) > 0n ||
          toBigInt(proposalStream.currentFlowRate) > 0n
        );
      }),
    [strategy?.proposals],
  );
  const showStreamingPoolInsufficientFunds =
    isStreamingPool &&
    hasFetchedLivePoolFlow &&
    currentFlowRateForDisplay === 0n &&
    (poolToken?.balance ?? 0n) === 0n &&
    hasEligibleStreamingProposal;
  const stillLoading =
    fetching ||
    isAwaitingNewPoolIndexing ||
    (!data && !error) ||
    (strategy != null && poolId == null) ||
    (needsFundingToken && isPoolTokenLoading);

  const poolPageDebugState = useMemo(() => {
    if (process.env.NODE_ENV === "production") {
      return null;
    }

    return {
      fetching,
      hasData: Boolean(data),
      hasError: Boolean(error),
      hasStrategy: Boolean(strategy),
      poolId,
      hasConfig: Boolean(strategyConfig),
      proposalType,
      poolType,
      stillLoading,
      isAwaitingNewPoolIndexing,
      hasResolvedInitialNewPoolLookup,
      needsFundingToken,
      isPoolTokenLoading,
      hasPoolToken: Boolean(poolToken),
      isMissingFundingToken,
    };
  }, [
    data,
    error,
    fetching,
    hasResolvedInitialNewPoolLookup,
    isAwaitingNewPoolIndexing,
    isMissingFundingToken,
    isPoolTokenLoading,
    needsFundingToken,
    poolId,
    poolToken,
    poolType,
    proposalType,
    stillLoading,
    strategy,
    strategyConfig,
  ]);

  useEffect(() => {
    if (poolPageDebugState == null) {
      return;
    }
    (
      window as typeof window & {
        __POOL_PAGE_DEBUG?: NonNullable<typeof poolPageDebugState>;
      }
    ).__POOL_PAGE_DEBUG = poolPageDebugState;
    console.info("[PoolPage] render checkpoint", poolPageDebugState);
  }, [poolPageDebugState]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const matchingPendingRecords = pendingIndexedPublishes.filter(
      (record) => {
        const containerId = record.publishPayload?.containerId;
        const normalizedContainerId =
          containerId != null ? String(containerId).toLowerCase() : undefined;

        return (
          record.chainId === Number(chain) &&
          (normalizedContainerId === strategyAddress ||
            (record.optimistic?.kind === "pool-governance" &&
              record.optimistic.strategyId.toLowerCase() === strategyAddress))
        );
      },
    );

    console.info("[PoolPage] render state", {
      route: {
        chain,
        community: _community,
        strategyAddress,
        newPoolId,
      },
      query: {
        fetching,
        hasData: Boolean(data),
        hasError: Boolean(error),
        error,
        cvstrategyCount: data?.cvstrategies?.length ?? 0,
        alloCount: data?.allos?.length ?? 0,
      },
      strategy: {
        exists: Boolean(strategy),
        id: strategy?.id,
        poolId,
        hasConfig: Boolean(strategyConfig),
        proposalType,
        poolType,
        hasRegistryCommunity: Boolean(strategy?.registryCommunity),
        hasGarden: Boolean(strategy?.registryCommunity?.garden),
        token: strategy?.token,
        metadataHash: strategy?.metadataHash,
        proposalCount: strategy?.proposals?.length ?? 0,
        totalEffectiveActivePoints: strategy?.totalEffectiveActivePoints,
      },
      loading: {
        stillLoading,
        isAwaitingNewPoolIndexing,
        hasResolvedInitialNewPoolLookup,
        isPoolTokenLoading,
        isMissingFundingToken,
        needsFundingToken,
        hasPoolToken: Boolean(poolToken),
      },
      pendingIndexing: matchingPendingRecords.map((record) => ({
        txHash: record.txHash,
        blockNumber: record.blockNumber,
        topic: record.publishPayload?.topic,
        function: record.publishPayload?.function,
        optimisticKind: record.optimistic?.kind,
      })),
    });
  }, [
    _community,
    chain,
    data,
    error,
    fetching,
    hasResolvedInitialNewPoolLookup,
    isAwaitingNewPoolIndexing,
    isMissingFundingToken,
    isPoolTokenLoading,
    needsFundingToken,
    newPoolId,
    pendingIndexedPublishes,
    poolId,
    poolToken,
    poolType,
    proposalType,
    stillLoading,
    strategy,
    strategyAddress,
    strategyConfig,
  ]);

  if ((!strategy || isMissingFundingToken) && stillLoading) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[PoolPage] returning loading spinner", {
        reason:
          !strategy ? "missing-strategy"
          : isMissingFundingToken ? "missing-funding-token"
          : "unknown",
        fetching,
        hasData: Boolean(data),
        hasError: Boolean(error),
        isAwaitingNewPoolIndexing,
        hasResolvedInitialNewPoolLookup,
        poolId,
        needsFundingToken,
        isPoolTokenLoading,
        hasPoolToken: Boolean(poolToken),
      });
    }

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
    if (process.env.NODE_ENV !== "production") {
      console.info("[PoolPage] returning pool unavailable", {
        isWrongNetwork,
        expectedChainId,
        connectedChainId,
        hasError: Boolean(error),
        error,
        fetching,
        hasData: Boolean(data),
        cvstrategyCount: data?.cvstrategies?.length ?? 0,
      });
    }

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

  if (!communityAddress) {
    return (
      <div className="col-span-12 mt-48 flex justify-center">
        <InfoBox infoBoxType="error" title="Pool community unavailable">
          We could not resolve the community for this pool from the subgraph.
        </InfoBox>
      </div>
    );
  }

  if (communityRouteMismatch) {
    return (
      <div className="col-span-12 mt-48 flex justify-center">
        <InfoBox infoBoxType="error" title="Pool URL mismatch">
          This pool belongs to a different community than the one in the URL.
          Open the pool from its canonical community page before joining or
          voting.
        </InfoBox>
      </div>
    );
  }

  if (poolId == null) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[PoolPage] returning pool id loading spinner", {
        strategyId: strategy.id,
        rawPoolId: strategy.poolId,
        fetching,
        hasConfig: Boolean(strategyConfig),
        proposalType,
      });
    }

    return (
      <div className="mt-96 col-span-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!effectiveStrategy) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[PoolPage] returning missing config error", {
        strategyId: strategy.id,
        hasConfig: Boolean(strategyConfig),
        proposalType,
        configKeys: strategyConfig ? Object.keys(strategyConfig) : [],
      });
    }

    return (
      <div className="col-span-12 mt-48 flex justify-center">
        <InfoBox infoBoxType="error" title="Pool configuration unavailable">
          We could not load this pool&apos;s configuration from the subgraph.
        </InfoBox>
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

  const totalEffectiveActivePoints = toBigInt(
    strategy?.totalEffectiveActivePoints,
  );
  const memberPoolWeight =
    memberPower != null && totalEffectiveActivePoints > 0n ?
      calculatePercentageBigInt(memberPower, totalEffectiveActivePoints)
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
          {showStreamingPoolInsufficientFunds && (
            <InfoBox
              infoBoxType="error"
              className="w-full"
              title="Pool is empty"
            >
              No funds available for streaming.
            </InfoBox>
          )}
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
                    freezeAtSnapshot={
                      hasFetchedLivePoolFlow && currentFlowRateForDisplay === 0n
                    }
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
          {currentFlowRateForDisplay === 0n &&
            !showStreamingPoolInsufficientFunds && (
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
              className="!w-full sm:!w-full"
              disabled={!isSyncStreamConnected || isSyncStreamWrongNetwork}
              tooltip={syncStreamButtonTooltip}
              forceShowTooltip
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
                    registrationStakeAmount={registerStakeAmountBn}
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
                    memberPower={memberPower}
                  />
                </CheckSybil>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
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
            isSuperTokenCandidateFetching={isSuperTokenCandidateFetching}
            superToken={superTokenInfo}
            setSuperTokenCandidate={setSuperTokenCandidate}
            minThGtTotalEffPoints={minThGtTotalEffPoints}
            communityName={communityName ?? ""}
          />
          {registerAndActivateFromPool}
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
        </div>

        {isEnabled && (
          <div className="hidden sm:col-span-12 xl:col-span-3 sm:flex flex-col gap-6">
            <>
              {poolToken && poolType !== "signaling" && (
                <PoolMetrics
                  communityAddress={communityAddress}
                  strategy={effectiveStrategy}
                  poolId={poolId}
                  poolToken={poolToken}
                  chainId={Number(chain)}
                  streamReceiver={
                    effectiveStrategy.stream?.superfluidGDA as
                      | Address
                      | undefined
                  }
                  streamSender={effectiveStrategy.id as Address}
                  superToken={superTokenInfo}
                />
              )}
            </>

            <PoolGovernance
              memberPoolWeight={memberPoolWeight}
              tokenDecimals={tokenDecimals}
              strategy={effectiveStrategy}
              communityAddress={communityAddress}
              memberTokensInCommunity={memberTokensInCommunity}
              memberPower={memberPower}
              isMemberCommunity={isMemberCommunity}
              memberActivatedStrategy={memberActivatedStrategy}
              membersStrategyData={
                membersStrategies ?
                  { memberStrategies: membersStrategies }
                : undefined
              }
              supportSnapshot={walletSupportSnapshot}
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
                  isSuperTokenCandidateFetching={isSuperTokenCandidateFetching}
                  superToken={superTokenInfo}
                  setSuperTokenCandidate={setSuperTokenCandidate}
                  minThGtTotalEffPoints={minThGtTotalEffPoints}
                  communityName={communityName ?? ""}
                />
                {poolToken && poolType !== "signaling" && (
                  <PoolMetrics
                    communityAddress={communityAddress}
                    strategy={effectiveStrategy}
                    poolId={poolId}
                    poolToken={poolToken}
                    chainId={Number(chain)}
                    streamReceiver={
                      effectiveStrategy.stream?.superfluidGDA as
                        | Address
                        | undefined
                    }
                    streamSender={effectiveStrategy.id as Address}
                    superToken={superTokenInfo}
                  />
                )}
              </div>
            )}

            {selectedTab === 1 && (
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
                  supportSnapshot={walletSupportSnapshot}
                />
                {registerAndActivateFromPool}
              </>
            )}
          </div>
        </div>
    </>
  );
}
