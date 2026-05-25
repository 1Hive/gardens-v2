"use client";
import { memo, useEffect, useMemo, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  CheckIcon,
  BoltIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { Address, encodeAbiParameters, formatUnits } from "viem";
import { useAccount, useBalance, useContractRead } from "wagmi";
import {
  getProposalDataDocument,
  getProposalDataQuery,
  getProposalSupportersQuery,
  getProposalSupportersDocument,
  isMemberDocument,
  isMemberQuery,
  getMembersStrategyDocument,
  getMembersStrategyQuery,
} from "#/subgraph/.graphclient";
import {
  Badge,
  Button,
  Countdown,
  DisplayNumber,
  EthAddress,
  InfoBox,
  LiveFlowingAmount,
  Statistic,
  DataTable,
} from "@/components";
import CancelButton from "@/components/CancelButton";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { DisputeModal } from "@/components/DisputeModal";
import EditProposalButton from "@/components/EditProposalButton";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { LoupeButton } from "@/components/LoupeButton";
import MarkdownWrapper from "@/components/MarkdownWrapper";
import { Skeleton } from "@/components/Skeleton";
import { chainConfigMap } from "@/configs/chains";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useConvictionRead } from "@/hooks/useConvictionRead";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useFlag } from "@/hooks/useFlag";
import { MetadataV1, useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { usePoolToken } from "@/hooks/usePoolToken";
import {
  dismissPendingSubgraphRefreshToast,
  useSubgraphQuery,
} from "@/hooks/useSubgraphQuery";
import { useSuperfluidStream } from "@/hooks/useSuperfluidStream";
import { useSuperfluidToken } from "@/hooks/useSuperfluidToken";
import { superTokenABI } from "@/src/customAbis";
import { alloABI, cvStrategyABI } from "@/src/generated";
import { PoolTypes, ProposalStatus, Column } from "@/types";

import { useErrorDetails } from "@/utils/getErrorName";
import { logOnce } from "@/utils/log";
import {
  SEC_TO_MONTH,
  calculatePercentageBigInt,
  roundToSignificant,
} from "@/utils/numbers";
import {
  buildProposalEntityId,
  extractProposalNumber,
} from "@/utils/proposals";
import { prettyTimestamp } from "@/utils/text";

type ProposalSupporter = {
  id: string;
  stakes: { amount: number | string | bigint }[];
  activatedPoints?: number | string | bigint | null;
};
type SupporterColumn = Column<ProposalSupporter>;
const SYNC_STREAM_HIDE_WINDOW_SECONDS = 15 * 60;

const toBigIntValue = (value: unknown): bigint => {
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

const getSupporterStakeAmount = (supporter: ProposalSupporter) =>
  (supporter.stakes ?? []).reduce(
    (total, stake) => total + toBigIntValue(stake.amount),
    0n,
  );

const getSupporterVotingPowerUsedPct = (supporter: ProposalSupporter) => {
  const activatedPoints = toBigIntValue(supporter.activatedPoints);
  return activatedPoints > 0n ?
      calculatePercentageBigInt(
        getSupporterStakeAmount(supporter),
        activatedPoints,
      )
    : undefined;
};

const getSupporterPoolVotingPower = (
  supporter: ProposalSupporter,
  totalActivePoints: number | string | bigint | undefined,
) => {
  const activePoints = toBigIntValue(totalActivePoints);
  return activePoints > 0n ?
      calculatePercentageBigInt(
        getSupporterStakeAmount(supporter),
        activePoints,
      )
    : undefined;
};

const getMemberIdFromMemberStrategyId = (
  memberStrategyId: string,
  strategyId: string,
) => {
  const normalizedMemberStrategyId = memberStrategyId.toLowerCase();
  const strategySuffix = `-${strategyId.toLowerCase()}`;
  return normalizedMemberStrategyId.endsWith(strategySuffix) ?
      normalizedMemberStrategyId.slice(0, -strategySuffix.length)
    : undefined;
};

const formatVotingPowerPct = (value: number | undefined) =>
  value == null ? "--" : (
    `${value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}%`
  );

const formatVotingPower = (value: number | undefined) =>
  value == null ? "--" : (
    `${value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })} VP`
  );

const getElapsedMs = ({
  flowRateBn,
  lastSnapshotAtMs,
  nowMs,
}: {
  flowRateBn: bigint;
  lastSnapshotAtMs: bigint;
  nowMs: bigint;
}) =>
  flowRateBn > 0n && lastSnapshotAtMs > 0n && nowMs > lastSnapshotAtMs ?
    nowMs - lastSnapshotAtMs
  : 0n;

const getLiveEscrowBalanceBn = ({
  escrowBalanceSnapshotBn,
  escrowBalanceSnapshotAtMs,
  proposalFlowRateBn,
  nowMs,
  fallbackEscrowBalanceBn,
}: {
  escrowBalanceSnapshotBn: bigint | null;
  escrowBalanceSnapshotAtMs: bigint;
  proposalFlowRateBn: bigint;
  nowMs: bigint;
  fallbackEscrowBalanceBn?: bigint;
}) => {
  const escrowBalanceElapsedMs =
    (
      escrowBalanceSnapshotBn != null &&
      proposalFlowRateBn > 0n &&
      nowMs > escrowBalanceSnapshotAtMs
    ) ?
      nowMs - escrowBalanceSnapshotAtMs
    : 0n;

  return escrowBalanceSnapshotBn != null ?
      escrowBalanceSnapshotBn +
        (proposalFlowRateBn * escrowBalanceElapsedMs) / 1000n
    : fallbackEscrowBalanceBn;
};

const getProposalTotalStreamedToBeneficiaryBn = ({
  proposalFlowRateBn,
  streamedUntilSnapshotBn,
  lastSnapshotAtBn,
  nowMs,
  explorerTotalStreamedBn,
  isDisputedStreamingProposal,
  escrowBalanceSnapshotBn,
  escrowBalanceSnapshotAtMs,
  escrowSuperTokenBalanceValue,
}: {
  proposalFlowRateBn: bigint;
  streamedUntilSnapshotBn: bigint;
  lastSnapshotAtBn: bigint;
  nowMs: bigint;
  explorerTotalStreamedBn?: bigint | null;
  isDisputedStreamingProposal: boolean;
  escrowBalanceSnapshotBn: bigint | null;
  escrowBalanceSnapshotAtMs: bigint;
  escrowSuperTokenBalanceValue?: bigint;
}) => {
  const lastSnapshotAtMs = lastSnapshotAtBn * 1000n;
  const elapsedMs = getElapsedMs({
    flowRateBn: proposalFlowRateBn,
    lastSnapshotAtMs,
    nowMs,
  });
  const totalReceivedByEscrowBn =
    streamedUntilSnapshotBn + (proposalFlowRateBn * elapsedMs) / 1000n;
  const liveEscrowSuperTokenBalanceBn = getLiveEscrowBalanceBn({
    escrowBalanceSnapshotBn,
    escrowBalanceSnapshotAtMs,
    proposalFlowRateBn,
    nowMs,
    fallbackEscrowBalanceBn: escrowSuperTokenBalanceValue,
  });
  const currentEscrowSuperTokenBalanceBn =
    isDisputedStreamingProposal ?
      liveEscrowSuperTokenBalanceBn ?? 0n
    : escrowSuperTokenBalanceValue ?? liveEscrowSuperTokenBalanceBn ?? 0n;
  const totalReceivedBn = explorerTotalStreamedBn ?? totalReceivedByEscrowBn;

  return totalReceivedBn > currentEscrowSuperTokenBalanceBn ?
      totalReceivedBn - currentEscrowSuperTokenBalanceBn
    : 0n;
};

const getLiveBeneficiaryBalanceBn = ({
  beneficiaryBalanceSnapshotBn,
  beneficiaryBalanceSnapshotAtMs,
  proposalFlowRateBn,
  nowMs,
}: {
  beneficiaryBalanceSnapshotBn: bigint | null;
  beneficiaryBalanceSnapshotAtMs: bigint;
  proposalFlowRateBn: bigint;
  nowMs: bigint;
}) => {
  const beneficiaryElapsedMs =
    (
      beneficiaryBalanceSnapshotBn != null &&
      proposalFlowRateBn > 0n &&
      nowMs > beneficiaryBalanceSnapshotAtMs
    ) ?
      nowMs - beneficiaryBalanceSnapshotAtMs
    : 0n;

  return beneficiaryBalanceSnapshotBn != null ?
      beneficiaryBalanceSnapshotBn +
        (proposalFlowRateBn * beneficiaryElapsedMs) / 1000n
    : null;
};

const LiveAccumulatedAmount = memo(function LiveAccumulatedAmount({
  poolToken,
  proposalFlowRateBn,
  escrowBalanceSnapshotBn,
  escrowBalanceSnapshotAtMs,
  escrowSuperTokenBalanceValue,
  escrowDepositAmount,
}: {
  poolToken?: { decimals: number; symbol: string } | null;
  proposalFlowRateBn: bigint;
  escrowBalanceSnapshotBn: bigint | null;
  escrowBalanceSnapshotAtMs: bigint;
  escrowSuperTokenBalanceValue?: bigint;
  escrowDepositAmount?: bigint;
}) {
  const [nowMs, setNowMs] = useState<bigint>(() => BigInt(Date.now()));

  useEffect(() => {
    if (proposalFlowRateBn <= 0n) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setNowMs(BigInt(Date.now()));
    }, 100);
    return () => clearInterval(interval);
  }, [proposalFlowRateBn]);

  const escrowBalanceElapsedMs =
    (
      escrowBalanceSnapshotBn != null &&
      proposalFlowRateBn > 0n &&
      nowMs > escrowBalanceSnapshotAtMs
    ) ?
      nowMs - escrowBalanceSnapshotAtMs
    : 0n;
  const liveEscrowSuperTokenBalanceBn =
    escrowBalanceSnapshotBn != null ?
      escrowBalanceSnapshotBn +
      (proposalFlowRateBn * escrowBalanceElapsedMs) / 1000n
    : null;
  const currentEscrowSuperTokenBalanceBn =
    liveEscrowSuperTokenBalanceBn ?? escrowSuperTokenBalanceValue ?? 0n;
  const accumulatedAmountBn =
    (
      escrowDepositAmount != null &&
      currentEscrowSuperTokenBalanceBn > escrowDepositAmount
    ) ?
      currentEscrowSuperTokenBalanceBn - escrowDepositAmount
    : 0n;
  const accumulatedAmountDisplay =
    poolToken ?
      Number(formatUnits(accumulatedAmountBn, poolToken.decimals)).toFixed(6)
    : "--";

  return (
    <span className="font-mono tabular-nums">{accumulatedAmountDisplay}</span>
  );
});

export type ProposalPageParams = {
  proposalId: string;
  community: string;
  pool: string;
  chain: string;
};

export type ClientPageProps = {
  params: ProposalPageParams;
};

export default function ClientPage({ params }: ClientPageProps) {
  const {
    proposalId: proposalSlug,
    community: communityAddr,
    pool: poolSlug,
  } = params;

  useEffect(() => {
    logOnce(
      "debug",
      "Loading page: (app)/gardens/[chain]/[community]/[pool]/[proposalId]/page.tsx",
    );
  }, []);

  const strategyAddress = poolSlug.toLowerCase();
  const [convictionRefreshing, setConvictionRefreshing] = useState(true);
  const [openSupportersModal, setOpenSupportersModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [nowTs, setNowTs] = useState(() => Math.floor(Date.now() / 1000));
  const [escrowBalanceSnapshotBn, setEscrowBalanceSnapshotBn] = useState<
    bigint | null
  >(null);
  const [escrowBalanceSnapshotAtMs, setEscrowBalanceSnapshotAtMs] =
    useState<bigint>(0n);
  const [beneficiaryBalanceSnapshotBn, setBeneficiaryBalanceSnapshotBn] =
    useState<bigint | null>(null);
  const [beneficiaryBalanceSnapshotAtMs, setBeneficiaryBalanceSnapshotAtMs] =
    useState<bigint>(0n);

  const router = useRouter();

  const { address } = useAccount();
  const routerSearchParams = useSearchParams();

  const collectedParams = useCollectQueryParams();
  const [initialSearchParams] = useState<Record<string, string> | null>(() => {
    if (typeof window === "undefined") return null;
    return Object.fromEntries(new URLSearchParams(window.location.search));
  });

  const proposalNumber = extractProposalNumber(proposalSlug);
  const proposalEntityId = buildProposalEntityId(strategyAddress, proposalSlug);
  const {
    data,
    fetching,
    refetch: refetchProposal,
  } = useSubgraphQuery<getProposalDataQuery>({
    query: getProposalDataDocument,
    variables: {
      proposalId: proposalEntityId?.toLowerCase(),
      communityId: communityAddr?.toLowerCase(),
    },
    changeScope:
      strategyAddress != null ?
        {
          topic: "proposal",
          containerId: strategyAddress,
          id: proposalNumber,
          type: "update",
        }
      : undefined,
  });

  //query to get proposal supporters
  const { data: supportersData } = useSubgraphQuery<getProposalSupportersQuery>(
    {
      query: getProposalSupportersDocument,
      variables: {
        proposalId: proposalEntityId.toLowerCase(),
      },
    },
  );

  const { data: membersStrategyData } =
    useSubgraphQuery<getMembersStrategyQuery>({
      query: getMembersStrategyDocument,
      variables: {
        strategyId: strategyAddress,
      },
      changeScope:
        strategyAddress != null ?
          {
            topic: "proposal",
            containerId: strategyAddress,
            type: "update",
          }
        : undefined,
    });

  //query to get member registry in community
  const { data: memberData } = useSubgraphQuery<isMemberQuery>({
    query: isMemberDocument,
    variables: {
      me: address?.toLowerCase(),
      comm: communityAddr?.toLowerCase(),
    },
    enabled: !!address && !!communityAddr,
  });

  const isMemberCommunity =
    !!memberData?.member?.memberCommunity?.[0]?.isRegistered;
  //

  type ProposalData = NonNullable<getProposalDataQuery["cvproposal"]>;
  const proposalData:
    | (ProposalData & {
        registryCommunity?: getProposalDataQuery["registryCommunity"];
      })
    | undefined =
    data?.cvproposal ?
      {
        ...data.cvproposal,
        registryCommunity: data?.registryCommunity,
      }
    : undefined;
  const proposalSupporters = supportersData?.members ?? [];
  const activatedPointsByMember = useMemo(() => {
    const activatedPoints = new Map<string, bigint>();
    membersStrategyData?.memberStrategies.forEach((memberStrategy) => {
      const memberId = getMemberIdFromMemberStrategyId(
        memberStrategy.id,
        strategyAddress,
      );
      if (memberId == null) return;
      activatedPoints.set(
        memberId,
        toBigIntValue(memberStrategy.activatedPoints),
      );
    });
    return activatedPoints;
  }, [membersStrategyData?.memberStrategies, strategyAddress]);
  const totalEffectiveActivePoints =
    proposalData?.strategy?.totalEffectiveActivePoints;

  const filteredAndSortedProposalSupporters: ProposalSupporter[] =
    proposalSupporters
      .filter((item) => item.stakes && item.stakes.length > 0)
      .map((item) => ({
        id: item.id,
        stakes: item.stakes?.map((stake) => ({ amount: stake.amount })) ?? [],
        activatedPoints: activatedPointsByMember.get(item.id.toLowerCase()),
      }))
      .sort((a, b) => {
        const stakeA = getSupporterStakeAmount(a);
        const stakeB = getSupporterStakeAmount(b);
        return (
          stakeA === stakeB ? 0
          : stakeA < stakeB ? 1
          : -1
        );
      });
  //

  const proposalIdNumber =
    proposalData?.proposalNumber != null ?
      BigInt(proposalData.proposalNumber)
    : undefined;
  const chainId = useChainIdFromPath();
  const shouldReadOnchainMetadataHash =
    !!proposalData?.strategy?.id &&
    proposalIdNumber != null &&
    !proposalData?.metadata &&
    !proposalData?.metadataHash;

  const poolTokenAddr = proposalData?.strategy?.token as Address;

  const { publish } = usePubSubContext();
  const {
    data: onchainMetadataHash,
    isLoading: isOnchainMetadataHashLoading,
    isFetched: isOnchainMetadataHashFetched,
  } = useContractRead({
    address: proposalData?.strategy?.id as Address,
    abi: cvStrategyABI,
    functionName: "getProposalMetadataPointer",
    args: proposalIdNumber != null ? [proposalIdNumber] : ([0n] as const),
    chainId,
    enabled: shouldReadOnchainMetadataHash,
  });
  const resolvedMetadataHash =
    proposalData?.metadataHash ?? onchainMetadataHash ?? undefined;
  const { data: ipfsResult, fetching: isIpfsMetadataFetching } =
    useMetadataIpfsFetch({
      hash: resolvedMetadataHash,
      enabled: !!resolvedMetadataHash && !proposalData?.metadata,
    });
  const isMetadataLoading =
    !!proposalData &&
    !proposalData.metadata &&
    ((shouldReadOnchainMetadataHash &&
      (isOnchainMetadataHashLoading || !isOnchainMetadataHashFetched)) ||
      (!!resolvedMetadataHash && isIpfsMetadataFetching));
  const path = usePathname();
  const metadata: MetadataV1 | null =
    proposalData ?
      proposalData.metadata ??
      ipfsResult ?? {
        title: `Proposal #${proposalData.proposalNumber ?? proposalNumber}`,
        description: "",
      }
    : null;
  const metadataForActions: MetadataV1 = (metadata ?? {
    title: undefined,
    description: undefined,
  }) as MetadataV1;
  const proposalDataForActions =
    proposalData ?
      {
        ...proposalData,
        ...metadataForActions,
        metadata: metadataForActions,
      }
    : undefined;
  const isProposerConnected =
    proposalData?.submitter === address?.toLowerCase();
  const pendingProposalParam =
    collectedParams[QUERY_PARAMS.proposalPage.pendingProposal] ??
    routerSearchParams.get(QUERY_PARAMS.proposalPage.pendingProposal) ??
    initialSearchParams?.[QUERY_PARAMS.proposalPage.pendingProposal] ??
    undefined;
  const pendingProposalTitleParam =
    collectedParams[QUERY_PARAMS.proposalPage.pendingProposalTitle] ??
    routerSearchParams.get(QUERY_PARAMS.proposalPage.pendingProposalTitle) ??
    initialSearchParams?.[QUERY_PARAMS.proposalPage.pendingProposalTitle] ??
    undefined;
  const pendingProposalTitle =
    pendingProposalTitleParam ?
      (() => {
        try {
          return decodeURIComponent(pendingProposalTitleParam);
        } catch (error) {
          console.warn("Unable to decode pending proposal title", {
            pendingProposalTitleParam,
            error,
          });
          return pendingProposalTitleParam;
        }
      })()
    : undefined;

  const proposalType = proposalData?.strategy?.config?.proposalType;
  const isSignalingType = PoolTypes[proposalType] === "signaling";
  const isStreamingType = PoolTypes[proposalType] === "streaming";
  const requestedAmount = proposalData?.requestedAmount;
  const beneficiary = proposalData?.beneficiary as Address | undefined;
  const streamingEscrowFromSubgraph = ((
    proposalData as
      | {
          streamingEscrow?: Address | null;
        }
      | undefined
  )?.streamingEscrow ?? undefined) as Address | undefined;

  const resolvedStreamingEscrow = streamingEscrowFromSubgraph;
  const submitter = proposalData?.submitter as Address | undefined;
  const superfluidExplorerBaseUrl =
    chainId != null ?
      (
        chainConfigMap as Record<
          string | number,
          { superfluidExplorerUrl?: string }
        >
      )[chainId]?.superfluidExplorerUrl
    : undefined;
  const superfluidExplorerUrl =
    (
      superfluidExplorerBaseUrl != null &&
      superfluidExplorerBaseUrl !== "" &&
      resolvedStreamingEscrow != null
    ) ?
      `${superfluidExplorerBaseUrl}/accounts/${resolvedStreamingEscrow.toLowerCase()}?tab=streams`
    : undefined;
  const showEscrow = useFlag("showEscrow");
  const proposalStatus = ProposalStatus[proposalData?.proposalStatus];
  const shouldShowSupportersTab =
    proposalStatus !== "executed" && proposalStatus !== "cancelled";

  const poolTokenResult = usePoolToken({
    poolAddress: strategyAddress,
    poolTokenAddr,
    chainId,
    enabled: !!poolTokenAddr && !!strategyAddress && !isSignalingType,
  });
  const poolToken = poolTokenResult?.poolToken;
  const { superToken: poolSuperToken } = useSuperfluidToken({
    token: poolTokenAddr,
    chainId,
    enabled: isStreamingType && !!poolTokenAddr,
  });
  const isPureSuperfluidPoolToken = poolSuperToken?.sameAsUnderlying === true;

  const proposalStream =
    // Backward-compatible read while graph client schema catches up.
    (proposalData as { proposalStream?: unknown; proposalStreams?: unknown[] })
      ?.proposalStream ??
    (
      proposalData as {
        proposalStream?: unknown;
        proposalStreams?: unknown[];
      }
    )?.proposalStreams?.[0];

  const proposalFlowRateBn =
    (
      proposalStream &&
      typeof proposalStream === "object" &&
      "currentFlowRate" in proposalStream
    ) ?
      toBigIntValue(proposalStream.currentFlowRate)
    : 0n;
  const streamedUntilSnapshotBn =
    (
      proposalStream &&
      typeof proposalStream === "object" &&
      "streamedUntilSnapshot" in proposalStream
    ) ?
      toBigIntValue(proposalStream.streamedUntilSnapshot)
    : 0n;
  const lastSnapshotAtBn =
    (
      proposalStream &&
      typeof proposalStream === "object" &&
      "lastSnapshotAt" in proposalStream
    ) ?
      toBigIntValue(proposalStream.lastSnapshotAt)
    : 0n;
  const minThresholdPointsBn = toBigIntValue(
    proposalData?.strategy?.config?.minThresholdPoints ?? 0,
  );
  const superfluidStreamResult = useSuperfluidStream({
    receiver: resolvedStreamingEscrow as Address,
    superToken: proposalData?.strategy?.config?.superfluidToken as Address,
    chainId,
    containerId: strategyAddress,
  });
  const explorerTotalStreamedBn = (
    superfluidStreamResult as typeof superfluidStreamResult & {
      liveTotalStreamedBn?: bigint | null;
    }
  )?.liveTotalStreamedBn;
  const isDisputedStreamingProposal =
    isStreamingType && proposalStatus === "disputed";

  const proposalFlowPerMonth =
    (
      isStreamingType &&
      poolToken &&
      proposalFlowRateBn != null &&
      proposalFlowRateBn > 0n
    ) ?
      +formatUnits(proposalFlowRateBn, poolToken.decimals) * SEC_TO_MONTH
    : null;
  const superTokenAddress = proposalData?.strategy?.config?.superfluidToken as
    | Address
    | undefined;
  const isBeneficiaryConnected = beneficiary === address?.toLowerCase();
  const streamTokenDecimals = poolToken?.decimals ?? 18;
  const currentFlowRateForDisplay = proposalFlowRateBn;
  const isThresholdOutOfReach =
    minThresholdPointsBn >
    BigInt(proposalData?.strategy?.totalEffectiveActivePoints ?? 0);
  const { data: beneficiarySuperTokenBalance, refetch: refetchSuperToken } =
    useBalance({
      address: beneficiary,
      token: superTokenAddress,
      chainId,
      enabled: isStreamingType && !!beneficiary && !!superTokenAddress,
    });
  const { data: escrowSuperTokenBalance } = useBalance({
    address: resolvedStreamingEscrow as Address,
    token: superTokenAddress,
    chainId,
    enabled:
      isStreamingType && !!resolvedStreamingEscrow && !!superTokenAddress,
  });
  const displayedNowMs = useMemo(
    () => BigInt(Date.now()),
    [
      proposalFlowRateBn,
      streamedUntilSnapshotBn,
      lastSnapshotAtBn,
      explorerTotalStreamedBn,
      isDisputedStreamingProposal,
      escrowBalanceSnapshotBn,
      escrowBalanceSnapshotAtMs,
      escrowSuperTokenBalance?.value,
      beneficiaryBalanceSnapshotBn,
      beneficiaryBalanceSnapshotAtMs,
    ],
  );
  const {
    currentConvictionPct,
    thresholdPct,
    isThresholdBelowDisplayPrecision,
    hasReachedThreshold,
    totalSupportPct,
    updatedConviction,
    timeToPass,
    triggerConvictionRefetch,
  } = useConvictionRead({
    proposalData: proposalData as getProposalDataQuery["cvproposal"],
    strategyConfig: proposalData?.strategy?.config,
    tokenData: proposalData?.strategy?.registryCommunity?.garden?.decimals,
    chainId,
    enabled: proposalData?.proposalNumber != null && proposalData != null,
  });

  const isProposalCoreReady =
    proposalData != null &&
    proposalIdNumber != null &&
    strategyAddress != null;

  const isAwaitingProposal =
    !!pendingProposalParam &&
    !isProposalCoreReady;

  useEffect(() => {
    if (fetching || !isAwaitingProposal) return;
    refetchProposal({ showToast: false });
  }, [fetching, isAwaitingProposal]);

  useEffect(() => {
    if (pendingProposalParam && !isAwaitingProposal) {
      dismissPendingSubgraphRefreshToast();
    }
  }, [isAwaitingProposal, pendingProposalParam]);

  useEffect(() => {
    if (escrowSuperTokenBalance?.value == null) return;
    setEscrowBalanceSnapshotBn(escrowSuperTokenBalance.value);
    setEscrowBalanceSnapshotAtMs(BigInt(Date.now()));
  }, [escrowSuperTokenBalance?.value]);

  useEffect(() => {
    if (beneficiarySuperTokenBalance?.value == null) return;
    setBeneficiaryBalanceSnapshotBn(beneficiarySuperTokenBalance.value);
    setBeneficiaryBalanceSnapshotAtMs(BigInt(Date.now()));
  }, [beneficiarySuperTokenBalance?.value]);

  useEffect(() => {
    if (convictionRefreshing && currentConvictionPct != null) {
      setConvictionRefreshing(false);
    }
  }, [convictionRefreshing, currentConvictionPct]);

  useEffect(() => {
    if (!shouldShowSupportersTab && selectedTab === 3) {
      setSelectedTab(0);
    }
  }, [selectedTab, shouldShowSupportersTab]);

  //encode proposal id to pass as argument to distribute function
  const encodedDataProposalId = (proposalId_: bigint) => {
    const encodedProposalId = encodeAbiParameters(
      [{ name: "proposalId", type: "uint" }],
      [proposalId_],
    );
    return encodedProposalId;
  };

  //distribution function from Allo contract
  //args: poolId, strategyId, encoded proposalId
  const {
    write: writeDistribute,
    error: errorDistribute,
    isError: isErrorDistribute,
  } = useContractWriteWithConfirmations({
    address: data?.allos[0]?.id as Address,
    abi: alloABI,
    functionName: "distribute",
    contractName: "Allo",
    fallbackErrorMessage: "Error executing proposal, please report a bug.",
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "distribute",
        id: proposalNumber,
        containerId: strategyAddress,
        chainId,
      });
    },
  });

  const manageSupportClicked = () => {
    const pathSegments = path.split("/");
    pathSegments.pop();
    if (pathSegments.length === 3) {
      pathSegments.pop();
    }
    const newPath = pathSegments.join("/");
    router.push(newPath + `?${QUERY_PARAMS.poolPage.allocationView}=true`);
  };
  const distributeErrorName = useErrorDetails(errorDistribute);

  useEffect(() => {
    if (isErrorDistribute && distributeErrorName.errorName !== undefined) {
      toast.error("NOT EXECUTABLE:" + "  " + distributeErrorName.errorName);
    }
  }, [isErrorDistribute]);

  const disableManSupportBtn = useMemo<ConditionObject[]>(
    () => [
      {
        condition: !isMemberCommunity,
        message: "Join community to support",
      },
    ],
    [address],
  );

  const { tooltipMessage, isConnected, missmatchUrl } =
    useDisableButtons(disableManSupportBtn);
  const {
    tooltipMessage: syncStreamTooltipMessage,
    isConnected: isSyncStreamConnected,
    missmatchUrl: isSyncStreamWrongNetwork,
  } = useDisableButtons();

  const hasInsufficientPoolFunds =
    !isSignalingType &&
    !isStreamingType &&
    requestedAmount != null &&
    poolToken?.balance != null &&
    BigInt(requestedAmount) > poolToken.balance;

  const disableExecuteButton = useMemo<ConditionObject[]>(
    () => [
      {
        condition: hasInsufficientPoolFunds,
        message: "Insufficient funds in the pool to execute this proposal.",
      },
      {
        condition:
          currentConvictionPct == null ||
          thresholdPct === undefined ||
          currentConvictionPct <= thresholdPct,
        message: "Proposal has not reached the threshold yet.",
      },
      {
        condition: proposalStatus === "disputed",
        message: "Proposal is being disputed",
      },
    ],
    [
      thresholdPct,
      currentConvictionPct,
      proposalStatus,
      hasInsufficientPoolFunds,
    ],
  );

  const {
    tooltipMessage: executeBtnTooltipMessage,
    isButtonDisabled: isExecuteButtonDisabled,
  } = useDisableButtons(disableExecuteButton);
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
      address: proposalData?.strategy?.id as Address,
      abi: cvStrategyABI,
      functionName: "lastRebalanceAt",
      chainId,
      enabled: isStreamingType && !!proposalData?.strategy?.id,
      watch: true,
    } as any);
  const { data: isAuthorizedRebalanceCaller } = useContractRead({
    address: proposalData?.strategy?.id as Address,
    abi: cvStrategyABI,
    functionName: "isAuthorizedRebalanceCaller",
    args: address ? [address] : undefined,
    chainId,
    enabled: isStreamingType && !!proposalData?.strategy?.id && !!address,
    watch: true,
  } as any);

  const { data: escrowDepositAmount } = useContractRead({
    address: resolvedStreamingEscrow as Address,
    chainId,
    abi: [
      {
        type: "function",
        stateMutability: "view",
        name: "depositAmount",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
      },
    ] as const,
    functionName: "depositAmount",
    enabled: isDisputedStreamingProposal && !!resolvedStreamingEscrow,
  } as any);

  const lastRebalanceAt = Number(lastRebalanceAtValue ?? 0n);
  const hideSyncStreamButton =
    lastRebalanceAt > 0 &&
    nowTs - lastRebalanceAt < SYNC_STREAM_HIDE_WINDOW_SECONDS;
  const showSyncStreamButton =
    !hideSyncStreamButton && !!address && isAuthorizedRebalanceCaller === true;

  const { write: writeRebalance, isLoading: isRebalanceLoading } =
    useContractWriteWithConfirmations({
      address: proposalData?.strategy?.id as Address,
      abi: cvStrategyABI,
      functionName: "rebalance" as any,
      contractName: "CVStrategy",
      fallbackErrorMessage:
        "Failed to sync stream for this strategy. Please try again.",
      onConfirmations: () => {
        void refetchLastRebalanceAt();
        publish({
          topic: "stream",
          containerId: strategyAddress,
          function: "rebalance",
        } as any);
      },
    });

  const { write: writeUnwrapSuperToken, isLoading: isUnwrapSuperTokenLoading } =
    useContractWriteWithConfirmations({
      address: superTokenAddress as Address,
      abi: superTokenABI,
      functionName: "downgrade",
      contractName: "SuperToken",
      fallbackErrorMessage:
        "Failed to unwrap super token for this proposal. Please try again.",
      onConfirmations: async () => {
        setBeneficiaryBalanceSnapshotBn(0n);
        setBeneficiaryBalanceSnapshotAtMs(BigInt(Date.now()));
        await refetchSuperToken();
      },
    });

  const handleClaimClick = async () => {
    // Refetch latest balance before claiming
    const latestBalance = await refetchSuperToken();
    const balanceToUnwrap =
      latestBalance.data?.value ?? beneficiarySuperTokenBalance?.value ?? 0n;
    writeUnwrapSuperToken?.({
      args: [balanceToUnwrap],
    });
  };

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
  const totalStreamedToBeneficiaryBn = getProposalTotalStreamedToBeneficiaryBn({
    proposalFlowRateBn,
    streamedUntilSnapshotBn,
    lastSnapshotAtBn,
    nowMs: displayedNowMs,
    explorerTotalStreamedBn,
    isDisputedStreamingProposal,
    escrowBalanceSnapshotBn,
    escrowBalanceSnapshotAtMs,
    escrowSuperTokenBalanceValue: escrowSuperTokenBalance?.value,
  });
  const totalStreamedDisplayValue =
    isStreamingType && poolToken ?
      Number(formatUnits(totalStreamedToBeneficiaryBn, poolToken.decimals))
    : null;
  const totalStreamedRatePerSecond =
    (
      isStreamingType &&
      poolToken &&
      !isDisputedStreamingProposal &&
      proposalFlowRateBn > 0n
    ) ?
      Number(formatUnits(proposalFlowRateBn, poolToken.decimals))
    : 0;
  const liveBeneficiarySuperTokenBalanceBn = getLiveBeneficiaryBalanceBn({
    beneficiaryBalanceSnapshotBn,
    beneficiaryBalanceSnapshotAtMs,
    proposalFlowRateBn: currentFlowRateForDisplay ?? 0n,
    nowMs: displayedNowMs,
  });
  const claimableBn =
    liveBeneficiarySuperTokenBalanceBn != null ?
      liveBeneficiarySuperTokenBalanceBn < totalStreamedToBeneficiaryBn ?
        liveBeneficiarySuperTokenBalanceBn
      : totalStreamedToBeneficiaryBn
    : totalStreamedToBeneficiaryBn;
  const claimableDisplayValue =
    isStreamingType && poolToken ?
      Number(formatUnits(claimableBn, poolToken.decimals))
    : null;
  const claimableRatePerSecond =
    (
      isStreamingType &&
      poolToken &&
      !isDisputedStreamingProposal &&
      currentFlowRateForDisplay > 0n
    ) ?
      Number(formatUnits(currentFlowRateForDisplay, poolToken.decimals))
    : 0;
  const liveBeneficiarySuperTokenBalanceForClaimBn = claimableBn;
  const minimumClaimableDisplayBn =
    streamTokenDecimals > 6 ? 10n ** BigInt(streamTokenDecimals - 6) : 1n;
  const hasMeaningfulClaimableAmount =
    liveBeneficiarySuperTokenBalanceForClaimBn >= minimumClaimableDisplayBn;

  const showUnwrapSuperTokenButton =
    isStreamingType &&
    !isPureSuperfluidPoolToken &&
    isBeneficiaryConnected &&
    hasMeaningfulClaimableAmount;
  const disableUnwrapBtnConditions: ConditionObject[] = [
    {
      condition: !isBeneficiaryConnected,
      message: "Connect with beneficiary to unwrap super token",
    },
    {
      condition: !superTokenAddress,
      message: "Super token unavailable for this proposal",
    },
    {
      condition: (beneficiarySuperTokenBalance?.value ?? 0n) <= 0n,
      message: "No super token balance to unwrap",
    },
  ];
  const {
    tooltipMessage: unwrapSuperTokenTooltipMessage,
    isConnected: isUnwrapConnected,
    missmatchUrl: isUnwrapWrongNetwork,
  } = useDisableButtons(disableUnwrapBtnConditions);
  if (isAwaitingProposal) {
    return (
      <div className="col-span-12 flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <InfoBox
          infoBoxType="info"
          title="Finalizing proposal creation"
          className="max-w-2xl"
        >
          {`Waiting for "${pendingProposalTitle ?? "newly created proposal"}" to be indexed...`}
        </InfoBox>
      </div>
    );
  }

  if (!isProposalCoreReady) {
    return (
      <div className="col-span-12 flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // const handleRefreshConviction = async (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   setConvictionRefreshing(true);
  //   await triggerConvictionRefetch?.();
  //   setConvictionRefreshing(false);

  // };
  const status = ProposalStatus[proposalData.proposalStatus];
  const canOpenDisputeModal =
    status === "active" || status === "disputed" || status === "rejected";
  const streamingStatusLabel =
    isStreamingType ?
      status === "cancelled" ? "Cancelled"
      : status === "disputed" ? "Disputed"
      : status === "executed" ? "Closed"
      : currentFlowRateForDisplay > 0n ? "Streaming"
      : hasReachedThreshold ? "About to stream"
      : status === "active" ? "Active"
      : undefined
    : undefined;
  const hasThreshold = thresholdPct != null;
  const alreadyStreaming = (currentFlowRateForDisplay ?? 0n) > 0n;
  const proposalWillPass =
    isStreamingType &&
    hasThreshold &&
    Number((thresholdPct - (totalSupportPct ?? 0)).toFixed(2)) < 0 &&
    (currentConvictionPct ?? 0) < thresholdPct &&
    !alreadyStreaming;

  return (
    <>
      {/* ================= DESKTOP ================= */}

      <div className="hidden sm:block sm:col-span-12 xl:col-span-9">
        <div className="flex flex-col gap-6">
          {/* main section: proposal details + conviction progress + vote proposals & execute buttons */}
          <section
            className={`section-layout flex flex-col gap-8  ${status === "disputed" ? "!border-warning-content" : ""} ${status === "executed" ? "!border-primary-content" : ""}`}
          >
            <div className="flex flex-col items-start gap-10 sm:flex-row">
              <div className="flex w-full flex-col gap-6">
                {/* Title - author - beneficairy - request - created - type */}
                <header className="flex flex-col items-start gap-4 ">
                  <div className="flex items-center justify-between flex-wrap w-full gap-2 sm:gap-4">
                    <Skeleton
                      isLoading={metadata == null}
                      className="!w-96 h-8"
                    >
                      <h2>{metadata?.title}</h2>
                    </Skeleton>
                    <div className="flex items-center gap-2">
                      <Badge type={proposalType} />
                    </div>
                  </div>

                  <div className="w-full flex flex-col sm:flex-row items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 ">
                      <Statistic label={"Author"}>
                        <EthAddress
                          address={submitter}
                          actions="none"
                          textColor="var(--color-grey-900)"
                        />
                      </Statistic>
                      {!isSignalingType && (
                        <Statistic label={"beneficiary"}>
                          <EthAddress
                            address={beneficiary}
                            actions="none"
                            textColor="var(--color-grey-900)"
                          />
                        </Statistic>
                      )}
                    </div>

                    {status !== "executed" && (
                      <div className="flex flex-col items-start justify-between gap-3 sm:items-end">
                        <Statistic label={"Created"}>
                          <span className="font-medium dark:text-neutral-content">
                            {prettyTimestamp(proposalData?.createdAt ?? 0)}
                          </span>
                        </Statistic>

                        {!isSignalingType && !isStreamingType && (
                          <Statistic label={"request amount"}>
                            <DisplayNumber
                              number={formatUnits(
                                requestedAmount,
                                poolToken?.decimals ?? 18,
                              )}
                              tokenSymbol={poolToken?.symbol}
                              compact={true}
                              valueClassName="font-medium dark:text-neutral-content"
                              symbolClassName="font-medium dark:text-neutral-content"
                            />
                          </Statistic>
                        )}
                      </div>
                    )}
                  </div>
                </header>
                {/* Divider */}

                {/* Conviction Progress */}
                {proposalData.strategy?.isEnabled &&
                  currentConvictionPct != null &&
                  totalSupportPct != null && (
                    <div className="">
                      {(status === "active" || status === "disputed") && (
                        <div className="flex flex-col gap-2">
                          <div className="w-full h-[0.10px] bg-neutral-soft-content" />
                          <h4 className="mt-4">Progress</h4>
                          <div className="flex flex-col gap-2">
                            <ConvictionBarChart
                              hasInsufficientPoolFunds={
                                hasInsufficientPoolFunds
                              }
                              currentConvictionPct={currentConvictionPct}
                              thresholdPct={thresholdPct ?? 0}
                              proposalSupportPct={totalSupportPct ?? 0}
                              isSignalingType={isSignalingType}
                              proposalNumber={Number(proposalIdNumber)}
                              timeToPass={Number(timeToPass)}
                              onReadyToExecute={triggerConvictionRefetch}
                              defaultChartMaxValue
                              proposalStatus={proposalStatus}
                              proposalType={
                                PoolTypes[
                                  proposalData.strategy.config.proposalType
                                ]
                              }
                              isThresholdOutOfReach={isThresholdOutOfReach}
                              isThresholdBelowDisplayPrecision={
                                isThresholdBelowDisplayPrecision
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>

            {!proposalData.strategy?.isEnabled && (
              <InfoBox infoBoxType="warning">The pool is not enabled.</InfoBox>
            )}

            {/* Action Buttons */}
            {status && status === "active" && (
              <div className="flex flex-col gap-2 -mt-2">
                <div className="w-full h-[0.10px] bg-neutral-soft-content" />
                <h6 className="mt-4 mb-2">Actions</h6>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                  <Button
                    icon={<AdjustmentsHorizontalIcon height={18} width={18} />}
                    onClick={() => manageSupportClicked()}
                    disabled={
                      !isConnected || missmatchUrl || !isMemberCommunity
                    }
                    tooltip={tooltipMessage}
                    className="!w-full"
                    btnStyle="outline"
                  >
                    Go to Vote on Proposals
                  </Button>
                  {!isSignalingType &&
                    !isStreamingType &&
                    proposalData?.strategy != null && (
                      <Button
                        icon={<BoltIcon height={18} width={18} />}
                        className="!w-full"
                        testId="btn-execute-proposal"
                        onClick={() =>
                          writeDistribute?.({
                            args: [
                              BigInt(proposalData.strategy.poolId),
                              [proposalData.strategy.id as Address],
                              encodedDataProposalId(proposalIdNumber),
                            ],
                          })
                        }
                        disabled={
                          isExecuteButtonDisabled ||
                          !isConnected ||
                          missmatchUrl ||
                          proposalStatus === "disputed"
                        }
                        tooltip={executeBtnTooltipMessage}
                      >
                        Execute
                      </Button>
                    )}
                </div>
              </div>
            )}
          </section>

          {/* Proposal Description */}
          <section className="section-layout flex flex-col gap-6">
            <h3>Proposal Description</h3>
            <div>
              <Skeleton rows={5} isLoading={isMetadataLoading}>
                <MarkdownWrapper source={metadata?.description} />
              </Skeleton>
            </div>
          </section>
        </div>
      </div>

      {/* Right side: Status + view supporters + cancel button */}
      <div className="hidden sm:block sm:col-span-12 xl:col-span-3">
        <div className="backdrop-blur-sm rounded-lg flex flex-col gap-6 sticky top-32">
          {isStreamingType && (
            <section className="section-layout gap-4 flex flex-col">
              <h5>Stream Info</h5>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="subtitle2">Streaming</p>
                  <p className="text-right font-mono tabular-nums">
                    {formatFlowPerMonth(currentFlowRateForDisplay)}/m
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="subtitle2">Total</p>
                  <div className="flex items-center gap-2">
                    <p className="text-right font-mono tabular-nums">
                      <LiveFlowingAmount
                        value={totalStreamedDisplayValue}
                        ratePerSecond={totalStreamedRatePerSecond}
                        suffix={poolToken?.symbol}
                        fractionDigits={5}
                      />
                    </p>
                  </div>
                </div>
                {showEscrow && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="subtitle2">Escrow</p>
                    {resolvedStreamingEscrow ?
                      <div className="flex items-center gap-2">
                        <EthAddress
                          address={resolvedStreamingEscrow as Address}
                          shortenAddress={true}
                          icon={false}
                          actions="explorer"
                        />
                        <LoupeButton
                          diamond={resolvedStreamingEscrow}
                          chainId={chainId}
                        />
                      </div>
                    : <p className="text-right">--</p>}
                  </div>
                )}
                {!isPureSuperfluidPoolToken && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="subtitle2">Claimable</p>
                    <div className="min-w-0 flex-1">
                      <LiveFlowingAmount
                        value={claimableDisplayValue}
                        ratePerSecond={claimableRatePerSecond}
                        suffix={poolToken?.symbol}
                        fractionDigits={6}
                        className="block w-full text-right"
                      />
                    </div>
                  </div>
                )}
                {isDisputedStreamingProposal && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="subtitle2">Accumulated</p>
                    <div className="flex items-center gap-2">
                      <p className="text-right font-semibold font-mono tabular-nums">
                        <LiveAccumulatedAmount
                          poolToken={poolToken}
                          proposalFlowRateBn={proposalFlowRateBn}
                          escrowBalanceSnapshotBn={escrowBalanceSnapshotBn}
                          escrowBalanceSnapshotAtMs={escrowBalanceSnapshotAtMs}
                          escrowSuperTokenBalanceValue={
                            escrowSuperTokenBalance?.value
                          }
                          escrowDepositAmount={
                            escrowDepositAmount as bigint | undefined
                          }
                        />
                      </p>
                      {superTokenAddress && poolToken?.symbol && (
                        <EthAddress
                          address={superTokenAddress}
                          label={poolToken.symbol}
                          actions="none"
                          shortenAddress={false}
                          icon={false}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
              {superfluidExplorerUrl != null &&
                superfluidExplorerUrl !== "" && (
                  <a
                    href={superfluidExplorerUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm underline underline-offset-2 w-fit inline-flex items-center gap-1"
                  >
                    <span className="text-sm hover:opacity-70">
                      View on Superfluid Explorer
                    </span>
                    <ArrowTopRightOnSquareIcon
                      className="h-4 w-4"
                      aria-hidden
                    />
                  </a>
                )}
              {showSyncStreamButton && (
                <Button
                  btnStyle="outline"
                  color="tertiary"
                  className="w-full"
                  disabled={!isSyncStreamConnected || isSyncStreamWrongNetwork}
                  tooltip={syncStreamTooltipMessage}
                  isLoading={isRebalanceLoading}
                  onClick={() => writeRebalance?.()}
                >
                  Sync Stream
                </Button>
              )}
              {showUnwrapSuperTokenButton && (
                <Button
                  btnStyle="outline"
                  color="primary"
                  className="w-full"
                  disabled={!isUnwrapConnected || isUnwrapWrongNetwork}
                  tooltip={unwrapSuperTokenTooltipMessage}
                  isLoading={isUnwrapSuperTokenLoading}
                  onClick={handleClaimClick}
                >
                  Claim funds
                </Button>
              )}
            </section>
          )}
          <section className="section-layout gap-4 flex flex-col">
            <div className="flex items-center justify-between">
              <h5>Status</h5>
              <Badge
                status={proposalData.proposalStatus}
                label={streamingStatusLabel}
              />
            </div>
            {proposalWillPass && timeToPass != null && (
              <div className="flex items-center gap-2 text-sm text-neutral-soft-content">
                <p>Before streaming starts:</p>
                <Countdown
                  endTimestamp={Number(timeToPass)}
                  display="inline"
                  showTimeout={false}
                  onTimeout={triggerConvictionRefetch}
                />
              </div>
            )}

            {status === "executed" && (
              <ul className="timeline timeline-vertical relative">
                <li className=" flex items-center justify-start z-50">
                  <div className="timeline-middle rounded-full text-tertiary-soft bg-primary-content m-0.5">
                    <CheckIcon className="w-4 m-0.5" />
                  </div>
                  <div className="timeline-end  flex flex-col">
                    <p className="text-md font-semibold">Created</p>
                    <p className="text-sm text-neutral-soft-content">
                      {prettyTimestamp(proposalData?.createdAt)}
                    </p>
                  </div>
                  {/* <hr className="bg-tertiary-content w-8" />; */}
                </li>

                <div className="bg-primary-content h-20 w-[4px] absolute left-[9.5px] top-6" />
                <li className=" flex items-center justify-start mt-4">
                  <div className="timeline-middle rounded-full text-tertiary-soft bg-primary-content m-0.5">
                    <CheckIcon className="w-4 m-0.5" />
                  </div>
                  <div className="timeline-end  flex flex-col pt-2">
                    <p className="text-md font-semibold">
                      {isStreamingType ? "Closed" : "Executed"}
                    </p>
                    <p className="text-sm text-neutral-soft-content">
                      {prettyTimestamp(proposalData?.executedAt)}
                    </p>

                    {!isSignalingType && !isStreamingType && (
                      <div
                        className="flex items-baseline
                            gap-1"
                      >
                        <h6 className="text-neutral-soft-content">Funded: </h6>
                        <DisplayNumber
                          number={formatUnits(
                            requestedAmount,
                            poolToken?.decimals ?? 18,
                          )}
                          tokenSymbol={poolToken?.symbol}
                          compact={true}
                          valueClassName="text-neutral-soft-content"
                          symbolClassName="text-neutral-soft-content "
                        />
                      </div>
                    )}
                    {isStreamingType && (
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-baseline gap-1">
                          <h6 className="text-neutral-soft-content">
                            Stream:{" "}
                          </h6>
                          <p className="text-neutral-soft-content text-sm">
                            {proposalFlowPerMonth != null ?
                              `${roundToSignificant(proposalFlowPerMonth, 4)} ${poolToken?.symbol ?? ""}/mo`
                            : "No active stream"}
                          </p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <h6 className="text-neutral-soft-content">Total:</h6>
                          <p className="text-neutral-soft-content text-sm">
                            <LiveFlowingAmount
                              value={totalStreamedDisplayValue}
                              ratePerSecond={totalStreamedRatePerSecond}
                              suffix={poolToken?.symbol}
                              fractionDigits={5}
                              className="text-sm text-neutral-soft-content"
                            />
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              </ul>
            )}
            <div className="flex flex-col gap-2">
              {!isSignalingType && status === "cancelled" && (
                <>
                  <div className="flex items-center gap-2">
                    <XMarkIcon className="w-5 h-5 text-error-content" />
                    <p className="text-error-content subtitle2">Cancelled</p>
                  </div>
                </>
              )}
              {status !== "executed" &&
                status !== "cancelled" &&
                status !== "disputed" && (
                  <InfoBox
                    title="Information"
                    infoBoxType="info"
                    content={`${
                      isSignalingType ?
                        "This proposal is open and can be supported or disputed by the community. Only the proposal creator can cancel"
                      : isStreamingType ?
                        alreadyStreaming ?
                          "This proposal is currently streaming. It can still be disputed while active."
                        : "This proposal is active. Once it reaches the threshold, it will start streaming automatically unless successfully disputed."
                      : "This proposal is currently open. It will pass if nobody successfully disputes it and it receives enough support."
                    }`}
                  />
                )}
              {status === "disputed" && (
                <InfoBox
                  title={
                    isStreamingType ?
                      "Streaming During Dispute"
                    : "Proposal Disputed"
                  }
                  infoBoxType="warning"
                  content={
                    isStreamingType ?
                      "While disputed, the stream keeps accumulating. If the dispute succeeds, the proposal is rejected and the accumulated funds are returned to the pool. If the ruling favors the proposal creator, the accumulated funds are sent to the beneficiary and the stream continues."
                    : "This proposal is currently disputed. It cannot proceed until the dispute is ruled."
                  }
                />
              )}
            </div>
            <div className="flex flex-col gap-4">
              {canOpenDisputeModal &&
                proposalData.strategy?.isEnabled &&
                proposalDataForActions && (
                  <DisputeModal
                    isMemberCommunity={isMemberCommunity}
                    proposalData={proposalDataForActions}
                  />
                )}
              {status !== "executed" && status !== "cancelled" && (
                <Button
                  onClick={() => setOpenSupportersModal(!openSupportersModal)}
                  btnStyle="outline"
                  color="tertiary"
                  className=""
                  // icon={<ChevronUpIcon className="h-4 w-4" />}
                >
                  View Supporters
                </Button>
              )}
            </div>
          </section>

          {isProposerConnected && proposalStatus === "active" && (
            <section className="section-layout gap-4 flex flex-col">
              <InfoBox
                infoBoxType="info"
                content="As the original author, you can edit or cancel this proposal."
                title="Actions"
              />
              {proposalDataForActions && (
                <>
                  <EditProposalButton
                    proposalData={proposalDataForActions}
                    poolToken={poolTokenResult}
                  />
                  <CancelButton proposalData={proposalDataForActions} />
                </>
              )}
            </section>
          )}

          {filteredAndSortedProposalSupporters.length > 0 &&
            totalSupportPct != null && (
              <section>
                <ProposalSupportersTable
                  supporters={filteredAndSortedProposalSupporters}
                  totalActivePoints={totalEffectiveActivePoints}
                  totalVotingPowerUsedPct={totalSupportPct}
                  openSupportersModal={openSupportersModal}
                  setOpenSupportersModal={setOpenSupportersModal}
                />
              </section>
            )}
        </div>
      </div>

      {/* ================= MOBILE ================= */}
      <div className="block md:hidden col-span-12">
        <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div
            role="tablist"
            className={`tabs tabs-boxed border1 bg-neutral ${shouldShowSupportersTab ? " inline-flex min-w-full justify-between" : ""}`}
            aria-label="Proposal sections"
          >
            {[
              "Overview",
              "Description",
              "Status",
              ...(shouldShowSupportersTab ? ["Supporters"] : []),
            ].map((label, index) => (
              <button
                key={label}
                type="button"
                role="tab"
                className={`tab rounded-lg border-0 px-4 text-neutral-soft-content ${selectedTab === index ? "tab-active !bg-primary-button dark:!bg-primary-dark-base !text-neutral-inverted-content" : "hover:text-neutral-content"}`}
                aria-selected={selectedTab === index}
                onClick={(event) => {
                  setSelectedTab(index);
                  event.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  });
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {/* Overview  */}
          {selectedTab === 0 && (
            <div className="flex flex-col gap-6">
              <div
                className={`section-layout flex flex-col gap-8  ${status === "disputed" ? "!border-error-content" : ""} ${status === "executed" ? "!border-primary-content" : ""}`}
              >
                <div className="flex flex-col items-start gap-10 sm:flex-row">
                  <div className="flex w-full flex-col gap-6">
                    {/* Title - author - beneficairy - request - created - type */}
                    <header className="flex flex-col items-start gap-4">
                      <div className="flex flex-col items-start justify-between w-full gap-4">
                        <Skeleton
                          isLoading={metadata == null}
                          className="!w-96 h-8"
                        >
                          <h2>{metadata?.title}</h2>
                        </Skeleton>
                        <div className="flex items-center gap-2">
                          <Badge type={proposalType} />
                        </div>
                      </div>

                      <div className="w-full flex flex-col sm:flex-row items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <Statistic label={"Author"}>
                            <EthAddress
                              address={submitter}
                              actions="none"
                              textColor="var(--color-grey-900)"
                            />
                          </Statistic>
                          {!isSignalingType && (
                            <Statistic label={"beneficiary"}>
                              <EthAddress
                                address={beneficiary}
                                actions="none"
                                textColor="var(--color-grey-900)"
                              />
                            </Statistic>
                          )}
                        </div>

                        {status !== "executed" && (
                          <div className="flex flex-col items-start justify-between gap-3 sm:items-end">
                            <Statistic label={"Created"}>
                              <span className="font-medium dark:text-neutral-content">
                                {prettyTimestamp(proposalData?.createdAt ?? 0)}
                              </span>
                            </Statistic>

                            {!isSignalingType && !isStreamingType && (
                              <Statistic label={"request amount"}>
                                <DisplayNumber
                                  number={formatUnits(
                                    requestedAmount,
                                    poolToken?.decimals ?? 18,
                                  )}
                                  tokenSymbol={poolToken?.symbol}
                                  compact={true}
                                  valueClassName="font-medium dark:text-neutral-content"
                                  symbolClassName="font-medium dark:text-neutral-content"
                                />
                              </Statistic>
                            )}
                          </div>
                        )}

                        {/* <div className="flex flex-col items-start justify-between gap-1">
                          <Statistic label={"Created"}>
                            <span className="font-medium dark:text-neutral-content">
                              {prettyTimestamp(proposalData?.createdAt ?? 0)}
                            </span>
                          </Statistic>
                          {!isSignalingType && (
                            <Statistic
                              label={"request amount"}
                              className="pt-2"
                            >
                              <DisplayNumber
                                number={formatUnits(
                                  requestedAmount,
                                  poolToken?.decimals ?? 18,
                                )}
                                tokenSymbol={poolToken?.symbol}
                                compact={true}
                                valueClassName="font-medium dark:text-neutral-content"
                                symbolClassName="font-medium dark:text-neutral-content"
                              />
                            </Statistic>
                          )}
                        </div> */}
                      </div>
                    </header>

                    {/* Conviction Progress */}
                    {proposalData.strategy.isEnabled &&
                      currentConvictionPct != null &&
                      totalSupportPct != null && (
                        <div className="">
                          {(status === "active" || status === "disputed") && (
                            <div className="flex flex-col gap-2">
                              <div className="w-full h-[0.10px] bg-neutral-soft-content" />
                              <h4 className="mt-4">Progress</h4>
                              <div className="flex flex-col gap-2">
                                <ConvictionBarChart
                                  hasInsufficientPoolFunds={
                                    hasInsufficientPoolFunds
                                  }
                                  currentConvictionPct={currentConvictionPct}
                                  thresholdPct={thresholdPct ?? 0}
                                  proposalSupportPct={totalSupportPct ?? 0}
                                  isSignalingType={isSignalingType}
                                  proposalNumber={Number(proposalIdNumber)}
                                  timeToPass={Number(timeToPass)}
                                  onReadyToExecute={triggerConvictionRefetch}
                                  defaultChartMaxValue
                                  proposalStatus={proposalStatus}
                                  proposalType={
                                    PoolTypes[
                                      proposalData.strategy.config.proposalType
                                    ]
                                  }
                                  isThresholdOutOfReach={isThresholdOutOfReach}
                                  isThresholdBelowDisplayPrecision={
                                    isThresholdBelowDisplayPrecision
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                {!proposalData.strategy.isEnabled && (
                  <InfoBox infoBoxType="warning">
                    The pool is not enabled.
                  </InfoBox>
                )}

                {/* Action Buttons */}
                {status && status === "active" && (
                  <div className="flex flex-col gap-2 -mt-2">
                    <div className="w-full h-[0.10px] bg-neutral-soft-content" />
                    <h6 className="mt-4 mb-2">Actions</h6>
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                      <Button
                        icon={
                          <AdjustmentsHorizontalIcon height={18} width={18} />
                        }
                        onClick={() => manageSupportClicked()}
                        disabled={
                          !isConnected || missmatchUrl || !isMemberCommunity
                        }
                        tooltip={tooltipMessage}
                        className="w-full"
                        btnStyle="outline"
                      >
                        Vote on Proposals
                      </Button>
                      {!isSignalingType &&
                        !isStreamingType &&
                        proposalData?.strategy != null && (
                          <Button
                            icon={<BoltIcon height={18} width={18} />}
                            className="w-full"
                            onClick={() =>
                              writeDistribute?.({
                                args: [
                                  BigInt(proposalData.strategy.poolId),
                                  [proposalData.strategy.id as Address],
                                  encodedDataProposalId(proposalIdNumber),
                                ],
                              })
                            }
                            disabled={
                              isExecuteButtonDisabled ||
                              !isConnected ||
                              missmatchUrl ||
                              proposalStatus === "disputed"
                            }
                            tooltip={executeBtnTooltipMessage}
                          >
                            Execute
                          </Button>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {selectedTab === 1 && (
            <section className="section-layout">
              <h3 className="mb-4">Proposal Description</h3>
              <Skeleton rows={5} isLoading={isMetadataLoading}>
                <MarkdownWrapper source={metadata?.description} />
              </Skeleton>
            </section>
          )}

          {/* Status */}
          {selectedTab === 2 && (
            <>
              {isStreamingType && (
                <section className="section-layout gap-4 flex flex-col mb-4">
                  <h5>Stream Info</h5>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="subtitle2">Streaming</p>
                      <p className="text-right font-mono tabular-nums">
                        {formatFlowPerMonth(currentFlowRateForDisplay)}/m
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="subtitle2">Total</p>
                      <div className="flex items-center gap-2">
                        <p className="text-right font-mono tabular-nums">
                          <LiveFlowingAmount
                            value={totalStreamedDisplayValue}
                            ratePerSecond={totalStreamedRatePerSecond}
                            suffix={poolToken?.symbol}
                            fractionDigits={5}
                          />
                        </p>
                      </div>
                    </div>
                    {showEscrow && (
                      <div className="flex items-center justify-between gap-3">
                        <p className="subtitle2">StreamingEscrow</p>
                        {resolvedStreamingEscrow ?
                          <div className="flex items-center gap-2">
                            <EthAddress
                              address={resolvedStreamingEscrow as Address}
                              actions="copy"
                              shortenAddress={true}
                            />
                            <LoupeButton
                              diamond={resolvedStreamingEscrow}
                              chainId={chainId}
                            />
                          </div>
                        : <p className="text-right">--</p>}
                      </div>
                    )}
                    {!isPureSuperfluidPoolToken && (
                      <div className="flex items-center justify-between gap-3">
                        <p className="subtitle2">Claimable</p>
                        <div className="min-w-0 flex-1">
                          <LiveFlowingAmount
                            value={claimableDisplayValue}
                            ratePerSecond={claimableRatePerSecond}
                            suffix={poolToken?.symbol}
                            fractionDigits={6}
                            className="block w-full text-right"
                          />
                        </div>
                      </div>
                    )}
                    {isDisputedStreamingProposal && (
                      <div className="flex items-center justify-between gap-3">
                        <p className="subtitle2">Accumulated</p>
                        <div className="flex items-center gap-2">
                          <p className="text-right font-semibold font-mono tabular-nums">
                            <LiveAccumulatedAmount
                              poolToken={poolToken}
                              proposalFlowRateBn={proposalFlowRateBn}
                              escrowBalanceSnapshotBn={escrowBalanceSnapshotBn}
                              escrowBalanceSnapshotAtMs={
                                escrowBalanceSnapshotAtMs
                              }
                              escrowSuperTokenBalanceValue={
                                escrowSuperTokenBalance?.value
                              }
                              escrowDepositAmount={
                                escrowDepositAmount as bigint | undefined
                              }
                            />
                          </p>
                          {superTokenAddress && poolToken?.symbol && (
                            <EthAddress
                              address={superTokenAddress}
                              label={poolToken.symbol}
                              actions="none"
                              shortenAddress={false}
                              icon={false}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {superfluidExplorerUrl != null &&
                    superfluidExplorerUrl !== "" && (
                      <a
                        href={superfluidExplorerUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sm underline underline-offset-2 w-fit inline-flex items-center gap-1"
                      >
                        <span className="text-sm hover:opacity-70">
                          View on Superfluid Explorer
                        </span>
                        <ArrowTopRightOnSquareIcon
                          className="h-4 w-4"
                          aria-hidden
                        />
                      </a>
                    )}
                  {showSyncStreamButton && (
                    <Button
                      btnStyle="outline"
                      color="tertiary"
                      className="w-full"
                      disabled={
                        !isSyncStreamConnected || isSyncStreamWrongNetwork
                      }
                      tooltip={syncStreamTooltipMessage}
                      isLoading={isRebalanceLoading}
                      onClick={() => writeRebalance?.()}
                    >
                      Sync Stream
                    </Button>
                  )}
                  {showUnwrapSuperTokenButton && (
                    <Button
                      btnStyle="outline"
                      color="primary"
                      className="w-full"
                      disabled={!isUnwrapConnected || isUnwrapWrongNetwork}
                      tooltip={unwrapSuperTokenTooltipMessage}
                      isLoading={isUnwrapSuperTokenLoading}
                      onClick={handleClaimClick}
                    >
                      Claim funds
                    </Button>
                  )}
                </section>
              )}
              <section className="section-layout gap-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <h5>Status</h5>
                  <Badge
                    status={proposalData.proposalStatus}
                    label={streamingStatusLabel}
                  />
                </div>
                {proposalWillPass && timeToPass != null && (
                  <div className="flex items-center gap-2 text-sm text-neutral-soft-content">
                    <p>Before streaming starts:</p>
                    <Countdown
                      endTimestamp={Number(timeToPass)}
                      display="inline"
                      showTimeout={false}
                      onTimeout={triggerConvictionRefetch}
                    />
                  </div>
                )}
                <div>
                  {status !== "executed" &&
                    status !== "cancelled" &&
                    status !== "disputed" && (
                      <InfoBox
                        title="Information"
                        infoBoxType="info"
                        content={`${
                          isSignalingType ?
                            "This proposal is open and can be supported or disputed by the community. Only the proposal creator can cancel"
                          : isStreamingType ?
                            alreadyStreaming ?
                              "This proposal is currently streaming. It can still be disputed while active."
                            : "This proposal is active. Once it reaches the threshold, it will start streaming automatically unless successfully disputed."
                          : "This proposal is currently open. It will pass if nobody successfully disputes it and it receives enough support."
                        }`}
                      />
                    )}
                  {status === "disputed" && (
                    <InfoBox
                      title={
                        isStreamingType ?
                          "Streaming During Dispute"
                        : "Proposal Disputed"
                      }
                      infoBoxType="warning"
                      content={
                        isStreamingType ?
                          "While disputed, the stream keeps accumulating. If the dispute succeeds, the proposal is rejected and the accumulated funds are returned to the pool. If the ruling favors the proposal creator, the accumulated funds are sent to the beneficiary and the stream continues."
                        : "This proposal is currently disputed. It cannot proceed until the dispute is ruled."
                      }
                    />
                  )}
                  {status === "executed" && (
                    <ul className="timeline timeline-vertical relative">
                      <li className=" flex items-center justify-start z-50">
                        <div className="timeline-middle rounded-full text-tertiary-soft bg-primary-content m-0.5">
                          <CheckIcon className="w-4 m-0.5" />
                        </div>
                        <div className="timeline-end  flex flex-col">
                          <p className="text-md font-semibold">Created</p>
                          <p className="text-sm text-neutral-soft-content">
                            {prettyTimestamp(proposalData?.createdAt)}
                          </p>
                        </div>
                        {/* <hr className="bg-tertiary-content w-8" />; */}
                      </li>

                      <div className="bg-primary-content h-20 w-[4px] absolute left-[9.5px] top-6" />
                      <li className=" flex items-center justify-start mt-4">
                        <div className="timeline-middle rounded-full text-tertiary-soft bg-primary-content m-0.5">
                          <CheckIcon className="w-4 m-0.5" />
                        </div>
                        <div className="timeline-end  flex flex-col pt-2">
                          <p className="text-md font-semibold">
                            {isStreamingType ? "Closed" : "Executed"}
                          </p>
                          <p className="text-sm text-neutral-soft-content">
                            {prettyTimestamp(proposalData?.executedAt)}
                          </p>

                          {!isSignalingType && !isStreamingType && (
                            <div
                              className="flex items-baseline
                            gap-1"
                            >
                              <h6 className="text-neutral-soft-content">
                                Funded:{" "}
                              </h6>
                              <DisplayNumber
                                number={formatUnits(
                                  requestedAmount,
                                  poolToken?.decimals ?? 18,
                                )}
                                tokenSymbol={poolToken?.symbol}
                                compact={true}
                                valueClassName="text-neutral-soft-content"
                                symbolClassName="text-neutral-soft-content "
                              />
                            </div>
                          )}
                          {isStreamingType && (
                            <div className="flex flex-col items-start gap-1">
                              <div className="flex items-baseline gap-1">
                                <h6 className="text-neutral-soft-content">
                                  Stream:{" "}
                                </h6>
                                <p className="text-neutral-soft-content text-sm">
                                  {proposalFlowPerMonth != null ?
                                    `${roundToSignificant(proposalFlowPerMonth, 4)} ${poolToken?.symbol ?? ""}/mo`
                                  : "No active stream"}
                                </p>
                              </div>
                              <div className="flex items-baseline gap-1">
                                <h6 className="text-neutral-soft-content">
                                  Total:
                                </h6>
                                <p className="text-neutral-soft-content text-sm">
                                  <LiveFlowingAmount
                                    value={totalStreamedDisplayValue}
                                    ratePerSecond={totalStreamedRatePerSecond}
                                    suffix={poolToken?.symbol}
                                    fractionDigits={5}
                                    className="text-sm text-neutral-soft-content"
                                  />
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    </ul>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  {canOpenDisputeModal && proposalData.strategy.isEnabled && (
                    <DisputeModal
                      isMemberCommunity={isMemberCommunity}
                      proposalData={{ ...proposalData, ...metadata }}
                    />
                  )}
                </div>
              </section>
              {isProposerConnected && proposalStatus === "active" && (
                <section className="section-layout gap-4 flex flex-col mt-4">
                  <InfoBox
                    infoBoxType="info"
                    content="As the original author, you can edit or cancel this proposal."
                    title="Actions"
                  />
                  {proposalDataForActions && (
                    <>
                      <EditProposalButton
                        proposalData={proposalDataForActions}
                        poolToken={poolTokenResult}
                      />
                      <CancelButton proposalData={proposalDataForActions} />
                    </>
                  )}
                </section>
              )}
            </>
          )}

          {shouldShowSupportersTab &&
            selectedTab === 3 &&
            filteredAndSortedProposalSupporters.length > 0 &&
            totalSupportPct != null && (
              <ProposalSupportersTable
                supporters={filteredAndSortedProposalSupporters}
                totalActivePoints={totalEffectiveActivePoints}
                totalVotingPowerUsedPct={totalSupportPct}
                openSupportersModal={openSupportersModal}
                setOpenSupportersModal={setOpenSupportersModal}
                withModal={false}
              />
            )}
        </div>
      </div>
    </>
  );
}

const ProposalSupportersTable = ({
  supporters,
  totalActivePoints,
  totalVotingPowerUsedPct,
  openSupportersModal,
  setOpenSupportersModal,
  withModal = true,
}: {
  supporters: ProposalSupporter[];
  totalActivePoints: number | string | bigint | undefined;
  totalVotingPowerUsedPct: number;
  openSupportersModal: boolean;
  setOpenSupportersModal: (open: boolean) => void;
  withModal?: boolean;
}) => {
  const columns: SupporterColumn[] = [
    {
      header: "Member",
      render: (supporter: ProposalSupporter) => (
        <EthAddress
          address={supporter.id as Address}
          actions="none"
          shortenAddress={true}
          icon="ens"
          textColor="var(--color-grey-900)"
        />
      ),
    },
    {
      header: (
        <span className="block w-full text-right text-neutral-soft-content">
          Voting Power
        </span>
      ),
      render: (supporter: ProposalSupporter) => (
        <span className="block w-full text-right">
          {formatVotingPower(
            getSupporterPoolVotingPower(supporter, totalActivePoints),
          )}
        </span>
      ),
      className: "text-right min-w-[9rem]",
    },
    {
      header: (
        <span className="block w-full text-right text-neutral-soft-content">
          Voting power used
        </span>
      ),
      render: (supporter: ProposalSupporter) => (
        <span className="block w-full text-right">
          {formatVotingPowerPct(getSupporterVotingPowerUsedPct(supporter))}
        </span>
      ),
      className: "text-right min-w-[8rem]",
    },
  ];

  return (
    <DataTable
      openModal={openSupportersModal}
      setOpenModal={setOpenSupportersModal}
      title="Proposal Supporters"
      data={supporters}
      columns={columns}
      footer={
        <div className="flex justify-between items-end gap-2 mr-1 sm:mr-10">
          <p className="subtitle">Total Support: </p>
          <p>{formatVotingPower(totalVotingPowerUsedPct)}</p>
        </div>
      }
      className="border1 rounded-lg bg-neutral p-2"
      withModal={withModal}
    />
  );
};
