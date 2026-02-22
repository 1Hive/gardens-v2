"use client";
import { useEffect, useMemo, useState } from "react";
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
import { useAccount, useBalance } from "wagmi";
import {
  getProposalDataDocument,
  getProposalDataQuery,
  getProposalSupportersQuery,
  getProposalSupportersDocument,
  isMemberDocument,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import {
  Badge,
  Button,
  DisplayNumber,
  EthAddress,
  InfoBox,
  Statistic,
  DataTable,
} from "@/components";
import CancelButton from "@/components/CancelButton";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { DisputeModal } from "@/components/DisputeModal";
import EditProposalButton from "@/components/EditProposalButton";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import MarkdownWrapper from "@/components/MarkdownWrapper";
import { Skeleton } from "@/components/Skeleton";
import { chainConfigMap } from "@/configs/chains";
import { isProd } from "@/configs/isProd";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useConvictionRead } from "@/hooks/useConvictionRead";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { MetadataV1, useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { usePoolToken } from "@/hooks/usePoolToken";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { useSuperfluidStream } from "@/hooks/useSuperfluidStream";
import { superTokenABI } from "@/src/customAbis";
import { alloABI, cvStrategyABI } from "@/src/generated";
import { PoolTypes, ProposalStatus, Column } from "@/types";

import { useErrorDetails } from "@/utils/getErrorName";
import {
  SEC_TO_MONTH,
  calculatePercentageBigInt,
  roundToSignificant,
} from "@/utils/numbers";
import { prettyTimestamp } from "@/utils/text";

type ProposalSupporter = {
  id: string;
  stakes: { amount: number }[];
};
type SupporterColumn = Column<ProposalSupporter>;

export type ProposalPageParams = {
  proposalId: string;
  community: string;
  poolId: string;
  chain: string;
  garden: string;
};

export type ClientPageProps = {
  params: ProposalPageParams;
};

export default function ClientPage({ params }: ClientPageProps) {
  const { proposalId, garden, community: communityAddr, poolId } = params;
  const [convictionRefreshing, setConvictionRefreshing] = useState(true);
  const [openSupportersModal, setOpenSupportersModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  const router = useRouter();

  const { address } = useAccount();
  const routerSearchParams = useSearchParams();
  const collectedParams = useCollectQueryParams();
  const [initialSearchParams] = useState<Record<string, string> | null>(() => {
    if (typeof window === "undefined") return null;
    return Object.fromEntries(new URLSearchParams(window.location.search));
  });

  const [, proposalNumber] = proposalId.split("-");
  const {
    data,
    fetching,
    refetch: refetchProposal,
  } = useSubgraphQuery<getProposalDataQuery>({
    query: getProposalDataDocument,
    variables: {
      garden: garden.toLowerCase(),
      proposalId: proposalId.toLowerCase(),
      communityId: communityAddr.toLowerCase(),
    },
    changeScope: {
      topic: "proposal",
      containerId: poolId,
      id: proposalNumber,
      type: "update",
    },
  });

  //query to get proposal supporters
  const { data: supportersData } = useSubgraphQuery<getProposalSupportersQuery>(
    {
      query: getProposalSupportersDocument,
      variables: {
        proposalId: proposalId.toLowerCase(),
      },
    },
  );

  //query to get member registry in community
  const { data: memberData } = useSubgraphQuery<isMemberQuery>({
    query: isMemberDocument,
    variables: {
      me: address?.toLowerCase(),
      comm: communityAddr?.toLowerCase(),
    },
    enabled: !!address,
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
  const proposalSupporters = supportersData?.members;

  const filteredAndSortedProposalSupporters: ProposalSupporter[] =
    proposalSupporters ?
      proposalSupporters
        .filter((item) => item.stakes && item.stakes.length > 0)
        .map((item) => ({
          id: item.id,
          stakes: item.stakes?.map((stake) => ({ amount: stake.amount })) ?? [],
        }))
        .sort((a, b) => {
          const maxStakeA = Math.max(
            ...(a.stakes ?? []).map((stake) => stake.amount),
          );
          const maxStakeB = Math.max(
            ...(b.stakes ?? []).map((stake) => stake.amount),
          );
          return maxStakeB - maxStakeA;
        })
    : [];
  const totalEffectiveActivePoints =
    proposalData?.strategy?.totalEffectiveActivePoints;

  //

  const proposalIdNumber =
    proposalData?.proposalNumber != null ?
      BigInt(proposalData.proposalNumber)
    : undefined;
  const [nowMs, setNowMs] = useState<bigint>(() => BigInt(Date.now()));
  const chainId = useChainIdFromPath();

  const poolTokenAddr = proposalData?.strategy?.token as Address;

  const { publish } = usePubSubContext();
  const { data: ipfsResult } = useMetadataIpfsFetch({
    hash: proposalData?.metadataHash,
    enabled: !proposalData?.metadata,
  });
  const path = usePathname();
  const metadata = proposalData?.metadata ?? ipfsResult ?? null;
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

  const isAwaitingProposal = !!pendingProposalParam && proposalData == null;

  useEffect(() => {
    if (fetching || !isAwaitingProposal) return;
    refetchProposal();
  }, [fetching, isAwaitingProposal]);

  const proposalType = proposalData?.strategy?.config?.proposalType;
  const isSignalingType = PoolTypes[proposalType] === "signaling";
  const isStreamingType = PoolTypes[proposalType] === "streaming";
  const requestedAmount = proposalData?.requestedAmount;
  const beneficiary = proposalData?.beneficiary as Address | undefined;
  const streamingEscrowFromSubgraph = proposalData?.streamingEscrow as
    | Address
    | undefined;

  const resolvedStreamingEscrow = streamingEscrowFromSubgraph;

  const submitter = proposalData?.submitter as Address | undefined;
  const superfluidExplorerBaseUrl =
    chainId != null ?
      chainConfigMap[chainId]?.superfluidExplorerUrl
    : undefined;
  const superfluidExplorerUrl =
    (
      superfluidExplorerBaseUrl != null &&
      superfluidExplorerBaseUrl !== "" &&
      resolvedStreamingEscrow != null
    ) ?
      `${superfluidExplorerBaseUrl}/accounts/${resolvedStreamingEscrow.toLowerCase()}?tab=streams`
    : undefined;
  const proposalStatus = ProposalStatus[proposalData?.proposalStatus];
  const shouldShowSupportersTab =
    proposalStatus !== "executed" && proposalStatus !== "cancelled";

  const poolToken = usePoolToken({
    poolAddress: proposalData?.strategy?.id,
    poolTokenAddr,
    enabled:
      !!poolTokenAddr && !!proposalData?.strategy?.id && !isSignalingType,
  });

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

  const proposalFlowRateBn =
    (
      proposalStream &&
      typeof proposalStream === "object" &&
      "currentFlowRate" in proposalStream
    ) ?
      toBigInt(proposalStream.currentFlowRate)
    : 0n;
  const streamedUntilSnapshotBn =
    (
      proposalStream &&
      typeof proposalStream === "object" &&
      "streamedUntilSnapshot" in proposalStream
    ) ?
      toBigInt(proposalStream.streamedUntilSnapshot)
    : 0n;
  const lastSnapshotAtBn =
    (
      proposalStream &&
      typeof proposalStream === "object" &&
      "lastSnapshotAt" in proposalStream
    ) ?
      toBigInt(proposalStream.lastSnapshotAt)
    : 0n;
  const lastSnapshotAtMs = lastSnapshotAtBn * 1000n;
  const elapsedMs =
    (
      proposalFlowRateBn > 0n &&
      lastSnapshotAtMs > 0n &&
      nowMs > lastSnapshotAtMs
    ) ?
      nowMs - lastSnapshotAtMs
    : 0n;
  const proposalTotalStreamedBn =
    streamedUntilSnapshotBn + (proposalFlowRateBn * elapsedMs) / 1000n;
  const { liveTotalStreamedBn: explorerTotalStreamedBn } = useSuperfluidStream({
    receiver: resolvedStreamingEscrow as Address,
    superToken: proposalData?.strategy?.config?.superfluidToken as Address,
    chainId,
    containerId: +poolId,
  });
  const shouldTickFallback = isStreamingType && explorerTotalStreamedBn == null;

  const proposalFlowPerMonth =
    (
      isStreamingType &&
      poolToken &&
      proposalFlowRateBn != null &&
      proposalFlowRateBn > 0n
    ) ?
      +formatUnits(proposalFlowRateBn, poolToken.decimals) * SEC_TO_MONTH
    : null;
  const proposalTotalStreamed =
    isStreamingType && poolToken ?
      +formatUnits(
        explorerTotalStreamedBn ?? proposalTotalStreamedBn,
        poolToken.decimals,
      )
    : null;
  const proposalTotalStreamedDisplay =
    poolToken ? (proposalTotalStreamed ?? 0).toFixed(4) : null;
  const streamInfo = proposalData?.strategy?.stream;
  const superTokenAddress = proposalData?.strategy?.config?.superfluidToken as
    | Address
    | undefined;
  const isBeneficiaryConnected = beneficiary === address?.toLowerCase();
  const streamTokenDecimals = poolToken?.decimals ?? 18;
  const maxFlowRateForDisplay = streamInfo?.maxFlowRate as
    | bigint
    | null
    | undefined;
  const currentFlowRateForDisplay = proposalFlowRateBn;
  const { data: beneficiarySuperTokenBalance, refetch: refetchSuperToken } =
    useBalance({
      address: beneficiary,
      token: superTokenAddress,
      chainId,
      enabled: isStreamingType && !!beneficiary && !!superTokenAddress,
    });

  const {
    currentConvictionPct,
    thresholdPct,
    totalSupportPct,
    updatedConviction,
    timeToPass,
    triggerConvictionRefetch,
  } = useConvictionRead({
    proposalData: proposalData as getProposalDataQuery["cvproposal"],
    strategyConfig: proposalData?.strategy?.config,
    tokenData: data?.tokenGarden?.decimals,
    enabled: proposalData?.proposalNumber != null && proposalData != null,
  });

  useEffect(() => {
    if (!shouldTickFallback) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setNowMs(BigInt(Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [shouldTickFallback]);

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
        containerId: poolId,
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

  const disableExecuteButton = useMemo<ConditionObject[]>(
    () => [
      {
        condition:
          currentConvictionPct == null ||
          thresholdPct == null ||
          currentConvictionPct <= thresholdPct,
        message: "Proposal has not reached the threshold yet",
      },
      {
        condition: proposalStatus === "disputed",
        message: "Proposal is being disputed",
      },
    ],
    [address, thresholdPct, currentConvictionPct, proposalStatus],
  );

  const {
    tooltipMessage: executeBtnTooltipMessage,
    isButtonDisabled: isExecuteButtonDisabled,
  } = useDisableButtons(disableExecuteButton);
  const { write: writeRebalance, isLoading: isRebalanceLoading } =
    useContractWriteWithConfirmations({
      address: proposalData?.strategy?.id as Address,
      abi: cvStrategyABI,
      functionName: "rebalance",
      contractName: "CVStrategy",
      fallbackErrorMessage:
        "Failed to sync stream for this strategy. Please try again.",
      onConfirmations: () => {
        publish({
          topic: "stream",
          containerId: poolId,
          function: "rebalance",
        });
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
      onSuccess: async () => {
        await refetchSuperToken();
      },
    });

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
  const availableToUnwrapDisplay =
    beneficiarySuperTokenBalance != null ?
      roundToSignificant(beneficiarySuperTokenBalance.formatted, 4)
    : "--";
  const showUnwrapSuperTokenButton =
    isStreamingType && (isProposerConnected || isBeneficiaryConnected);
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

  if (
    !proposalData ||
    !supportersData ||
    !metadata ||
    proposalIdNumber == null ||
    updatedConviction == null
  ) {
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

  return (
    <>
      {/* ================= DESKTOP ================= */}

      {/* main section: proposal details + conviction progress + vote proposals & execute buttons */}
      <section className="hidden sm:block sm:col-span-12 xl:col-span-9">
        <div
          className={`section-layout flex flex-col gap-8  ${status === "disputed" ? "!border-warning-content" : ""} ${status === "executed" ? "!border-primary-content" : ""}`}
        >
          <div className="flex flex-col items-start gap-10 sm:flex-row">
            <div className="flex w-full flex-col gap-6">
              {/* Title - author - beneficairy - request - created - type */}
              <header className="flex flex-col items-start gap-4 ">
                <div className="flex items-center justify-between flex-wrap w-full gap-2 sm:gap-4">
                  <Skeleton isLoading={metadata == null} className="!w-96 h-8">
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
                (isSignalingType ||
                  (thresholdPct != null && totalSupportPct != null)) && (
                  <div className="">
                    {(status === "active" || status === "disputed") && (
                      <div className="flex flex-col gap-2">
                        <div className="w-full h-[0.10px] bg-neutral-soft-content" />
                        <h4 className="mt-4">Progress</h4>
                        <div className="flex flex-col gap-2">
                          <ConvictionBarChart
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
                  disabled={!isConnected || missmatchUrl || !isMemberCommunity}
                  tooltip={tooltipMessage}
                  className="!w-full"
                  btnStyle="outline"
                >
                  Go to Vote on Proposals
                </Button>
                {!isSignalingType && !isStreamingType && (
                  <Button
                    icon={<BoltIcon height={18} width={18} />}
                    className="!w-full"
                    onClick={() =>
                      writeDistribute?.({
                        args: [
                          BigInt(poolId),
                          [proposalData?.strategy?.id as Address],
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
      </section>

      {/* Right side: Status + view supporters + cancel button */}
      <div className="hidden sm:block sm:col-span-12 xl:col-span-3 xl:h-10 xl:overflow-visible">
        <div className="backdrop-blur-sm rounded-lg flex flex-col gap-6 sticky top-32">
          {isStreamingType && (
            <section className="section-layout gap-4 flex flex-col">
              <h5>Stream Info</h5>
              <div className="rounded-lg border border-neutral-soft-content/20 p-3 flex flex-col gap-2">
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
                    {proposalTotalStreamedDisplay != null ?
                      <p className="text-right">
                        {proposalTotalStreamedDisplay}
                      </p>
                    : <p className="text-right">--</p>}
                    {poolToken?.address && poolToken?.symbol && (
                      <EthAddress
                        address={poolToken.address}
                        label={poolToken.symbol}
                        shortenAddress={false}
                        icon={false}
                        actions="none"
                        showPopup={false}
                      />
                    )}
                  </div>
                </div>
                {!isProd && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="subtitle2">Escrow</p>
                    {resolvedStreamingEscrow ?
                      <EthAddress
                        address={resolvedStreamingEscrow as Address}
                        shortenAddress={true}
                        icon={false}
                        actions="explorer"
                      />
                    : <p className="text-right">--</p>}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="subtitle2">Available to unwrap</p>
                  <div className="flex items-center gap-2">
                    {beneficiarySuperTokenBalance != null ?
                      <DisplayNumber
                        number={availableToUnwrapDisplay}
                        valueClassName="text-right font-semibold"
                      />
                    : <p className="text-right font-semibold">--</p>}
                    {superTokenAddress &&
                      beneficiarySuperTokenBalance?.symbol && (
                        <EthAddress
                          address={superTokenAddress}
                          label={beneficiarySuperTokenBalance.symbol}
                          actions="none"
                          shortenAddress={false}
                          icon={false}
                        />
                      )}
                  </div>
                </div>
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
              {(currentFlowRateForDisplay ?? 0n) === 0n && (
                <InfoBox
                  infoBoxType="info"
                  className="w-full"
                  title="No active stream"
                >
                  This pool currently has no active outflow.
                </InfoBox>
              )}
              <Button
                btnStyle="outline"
                color="primary"
                className="w-full"
                disabled={!isSyncStreamConnected || isSyncStreamWrongNetwork}
                tooltip={syncStreamTooltipMessage}
                isLoading={isRebalanceLoading}
                onClick={() => writeRebalance?.()}
              >
                Sync Stream
              </Button>
              {showUnwrapSuperTokenButton && (
                <Button
                  btnStyle="outline"
                  color="secondary"
                  className="w-full"
                  disabled={!isUnwrapConnected || isUnwrapWrongNetwork}
                  tooltip={unwrapSuperTokenTooltipMessage}
                  isLoading={isUnwrapSuperTokenLoading}
                  onClick={() =>
                    writeUnwrapSuperToken?.({
                      args: [beneficiarySuperTokenBalance?.value ?? 0n],
                    })
                  }
                >
                  Unwrap Super Token
                </Button>
              )}
            </section>
          )}
          <section className="section-layout gap-4 flex flex-col">
            <div className="flex items-center justify-between">
              <h5>Status</h5>
              <Badge status={proposalData.proposalStatus} />
            </div>

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
                    <p className="text-md font-semibold">Executed</p>
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
                            {proposalTotalStreamedDisplay}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              </ul>
            )}
            <div>
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
                      content={`${isSignalingType ? "This proposal is open and can be supported or disputed by the community. Only the proposal creator can cancel" : "This proposal is currently open. It will pass if nobody successfully disputes it and it receives enough support."}`}
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
                        "Stream funds are accumulated while this proposal is disputed. When the dispute is ruled, accumulated funds are sent to the beneficiary if approved, or returned to the pool if rejected."
                      : "This proposal is currently disputed. It cannot be executed until the dispute is ruled."
                    }
                  />
                )}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {(status === "active" || status === "disputed") &&
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
                    poolToken={poolToken}
                  />
                  <CancelButton proposalData={proposalDataForActions} />
                </>
              )}
            </section>
          )}

          {filteredAndSortedProposalSupporters.length > 0 &&
            totalSupportPct != null && (
              <section className="xl:max-h-10">
                <ProposalSupportersTable
                  supporters={filteredAndSortedProposalSupporters}
                  beneficiary={beneficiary}
                  submitter={submitter}
                  totalActivePoints={totalEffectiveActivePoints}
                  totalStakedAmount={totalSupportPct}
                  openSupportersModal={openSupportersModal}
                  setOpenSupportersModal={setOpenSupportersModal}
                />
              </section>
            )}
        </div>
      </div>

      {/* Proposal Description */}
      <section className="hidden section-layout col-span-12 xl:col-span-9 mt-6 sm:flex flex-col gap-6">
        <h3>Proposal Description</h3>
        <div>
          <Skeleton rows={5} isLoading={!Boolean(metadata)}>
            <MarkdownWrapper source={metadata?.description} />
          </Skeleton>
        </div>
      </section>

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
                      (isSignalingType ||
                        (thresholdPct != null && totalSupportPct != null)) && (
                        <div className="">
                          {(status === "active" || status === "disputed") && (
                            <div className="flex flex-col gap-2">
                              <div className="w-full h-[0.10px] bg-neutral-soft-content" />
                              <h4 className="mt-4">Progress</h4>
                              <div className="flex flex-col gap-2">
                                <ConvictionBarChart
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
                      {!isSignalingType && !isStreamingType && (
                        <Button
                          icon={<BoltIcon height={18} width={18} />}
                          className="w-full"
                          onClick={() =>
                            writeDistribute?.({
                              args: [
                                BigInt(poolId),
                                [proposalData?.strategy?.id as Address],
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
              <Skeleton rows={5} isLoading={!Boolean(metadata)}>
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
                  <div className="rounded-lg border border-neutral-soft-content/20 p-3 flex flex-col gap-2">
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
                        {proposalTotalStreamedDisplay != null ?
                          <p className="text-right">
                            {proposalTotalStreamedDisplay}
                          </p>
                        : <p className="text-right">--</p>}
                        {poolToken?.address && poolToken?.symbol && (
                          <EthAddress
                            address={poolToken.address}
                            label={poolToken.symbol}
                            shortenAddress={false}
                            icon={false}
                            actions="explorer"
                          />
                        )}
                      </div>
                    </div>
                    {!isProd && (
                      <div className="flex items-center justify-between gap-3">
                        <p className="subtitle2">StreamingEscrow</p>
                        {resolvedStreamingEscrow ?
                          <EthAddress
                            address={resolvedStreamingEscrow as Address}
                            actions="copy"
                            shortenAddress={true}
                          />
                        : <p className="text-right">--</p>}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <p className="subtitle2">Available to unwrap</p>
                      <div className="flex items-center gap-2">
                        {beneficiarySuperTokenBalance != null ?
                          <DisplayNumber
                            number={availableToUnwrapDisplay}
                            valueClassName="text-right font-semibold"
                          />
                        : <p className="text-right font-semibold">--</p>}
                        {superTokenAddress &&
                          beneficiarySuperTokenBalance?.symbol && (
                            <EthAddress
                              address={superTokenAddress}
                              label={beneficiarySuperTokenBalance.symbol}
                              shortenAddress={false}
                              icon={false}
                              actions="none"
                            />
                          )}
                      </div>
                    </div>
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
                  {(currentFlowRateForDisplay ?? 0n) === 0n && (
                    <InfoBox
                      infoBoxType="info"
                      className="w-full"
                      title="No active stream"
                    >
                      This pool currently has no active outflow.
                    </InfoBox>
                  )}
                  <Button
                    btnStyle="outline"
                    color="primary"
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
                  {showUnwrapSuperTokenButton && (
                    <Button
                      btnStyle="outline"
                      color="secondary"
                      className="w-full"
                      disabled={!isUnwrapConnected || isUnwrapWrongNetwork}
                      tooltip={unwrapSuperTokenTooltipMessage}
                      isLoading={isUnwrapSuperTokenLoading}
                      onClick={() =>
                        writeUnwrapSuperToken?.({
                          args: [beneficiarySuperTokenBalance?.value ?? 0n],
                        })
                      }
                    >
                      Unwrap Super Token
                    </Button>
                  )}
                </section>
              )}
              <section className="section-layout gap-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <h5>Status</h5>
                  <Badge status={proposalData.proposalStatus} />
                </div>
                <div>
                  {status !== "executed" &&
                    status !== "cancelled" &&
                    status !== "disputed" && (
                      <InfoBox
                        title="Information"
                        infoBoxType="info"
                        content={`${isSignalingType ? "This proposal is open and can be supported or disputed by the community. Only the proposal creator can cancel" : "This proposal is currently open. It will pass if nobody successfully disputes it and it receives enough support."}`}
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
                          "Stream funds are accumulated while this proposal is disputed. When the dispute is ruled, accumulated funds are sent to the beneficiary if approved, or returned to the pool if rejected."
                        : "This proposal is currently disputed. It cannot be executed until the dispute is ruled."
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
                          <p className="text-md font-semibold">Executed</p>
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
                                  {proposalTotalStreamedDisplay}
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
                  {(status === "active" || status === "disputed") &&
                    proposalData.strategy.isEnabled && (
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
                        poolToken={poolToken}
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
                beneficiary={beneficiary}
                submitter={submitter}
                totalActivePoints={totalEffectiveActivePoints}
                totalStakedAmount={totalSupportPct}
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
  totalStakedAmount,
  openSupportersModal,
  setOpenSupportersModal,
  beneficiary,
  submitter,
  withModal = true,
}: {
  supporters: ProposalSupporter[];
  beneficiary: string | undefined;
  submitter: string | undefined;
  totalActivePoints: number;
  totalStakedAmount: number;
  openSupportersModal: boolean;
  setOpenSupportersModal: (open: boolean) => void;
  withModal?: boolean;
}) => {
  const columns: SupporterColumn[] = [
    {
      header: `Member${(supporters?.length ?? 0) === 1 ? "" : "s"}`,
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
      header: "Role",
      render: (supporter: ProposalSupporter) =>
        supporter.id === beneficiary ? "Beneficiary"
        : supporter.id === submitter ? "Submitter"
        : "Member",
    },
    {
      header: "Support",
      render: (supporter: ProposalSupporter) =>
        totalActivePoints > 0 ?
          `${calculatePercentageBigInt(
            BigInt(supporter?.stakes[0]?.amount),
            BigInt(totalActivePoints),
          )} VP`
        : undefined,
      className: "flex items-center justify-end mt-2",
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
          <p className=""> {totalStakedAmount} VP</p>
        </div>
      }
      className="border1 rounded-lg bg-neutral p-2"
      withModal={withModal}
    />
  );
};
