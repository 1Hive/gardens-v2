/* eslint-disable jsx-a11y/click-events-have-key-events */
"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  HandRaisedIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import { usePathname } from "next/navigation";
import { Address, formatUnits } from "viem";
import { useBalance, useContractRead } from "wagmi";
import {
  Allo,
  CVProposal,
  CVStrategyConfig,
  Maybe,
  ProposalMetadata,
} from "#/subgraph/.graphclient";
import { Countdown } from "./Countdown";
import { DisplayNumber } from "./DisplayNumber";
import { Divider } from "./Divider";
import { ProposalInputItem } from "./Proposals";
import TooltipIfOverflow from "./TooltipIfOverflow";
import { Badge, Card, EthAddress, LiveFlowingAmount } from "@/components";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { Skeleton } from "@/components/Skeleton";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import {
  ProposalDataLight,
  useConvictionRead,
} from "@/hooks/useConvictionRead";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSuperfluidStream } from "@/hooks/useSuperfluidStream";
import { cvStrategyABI } from "@/src/generated";
import { PoolTypes, ProposalStatus } from "@/types";
import {
  SEC_TO_MONTH,
  calculatePercentageBigInt,
  roundToSignificant,
  toBigInt,
} from "@/utils/numbers";
import { formatProposalSlug } from "@/utils/proposals";
import { prettyTimestamp } from "@/utils/text";

export type ProposalCardProps = {
  proposalData: Pick<
    CVProposal,
    | "id"
    | "proposalStatus"
    | "metadataHash"
    | "createdAt"
    | "submitter"
    | "executedAt"
    | "streamingEscrow"
  > &
    ProposalDataLight & {
      metadata?: Maybe<Pick<ProposalMetadata, "title">>;
      proposalStream?: Maybe<{
        currentFlowRate: bigint;
        streamedUntilSnapshot: bigint;
        lastSnapshotAt: bigint;
      }>;
      proposalStreams?: Array<{
        currentFlowRate: bigint;
        streamedUntilSnapshot: bigint;
        lastSnapshotAt: bigint;
      }>;
    };
  strategyConfig: Pick<
    CVStrategyConfig,
    | "decay"
    | "proposalType"
    | "allowlist"
    | "superfluidToken"
    | "weight"
    | "maxRatio"
    | "minThresholdPoints"
  >;
  inputData?: ProposalInputItem;
  stakedFilter: ProposalInputItem;
  poolToken?: {
    address: Address;
    symbol: string;
    decimals: number;
    balance: bigint;
    formatted: string;
  };
  isAllocationView: boolean;
  memberActivatedPoints: bigint;
  memberPoolWeight?: number;
  executeDisabled: boolean;
  tokenDecimals: number;
  alloInfo: Allo;
  isPoolEnabled: boolean;
  communityToken: Parameters<typeof useConvictionRead>[0]["tokenData"];
  inputHandler: (proposalId: string, value: bigint) => void;
  minThGtTotalEffPoints: boolean;
  poolAddress: string;
  onConvictionUpdate?: (id: string, conviction: bigint) => void;
};

export type ProposalHandle = {
  getProposalConviction: () => {
    conviction: bigint;
    convictionPct: number;
    threshold: number;
    support: number;
    timeToPass: number;
  };
};

export const ProposalCard = forwardRef<ProposalHandle, ProposalCardProps>(
  (
    {
      proposalData,
      strategyConfig,
      isPoolEnabled,
      inputData,
      stakedFilter,
      poolToken,
      isAllocationView,
      memberActivatedPoints,
      memberPoolWeight,
      communityToken: tokenData,
      minThGtTotalEffPoints,
      poolAddress,
      onConvictionUpdate,
    },
    ref,
  ) => {
    const chainId = useChainIdFromPath();
    const {
      proposalNumber,
      proposalStatus,
      requestedAmount,
      submitter,
      createdAt,
      executedAt,
    } = proposalData;
    const shouldReadOnchainMetadataHash =
      !!proposalData?.strategy?.id &&
      proposalData?.proposalNumber != null &&
      !proposalData.metadata &&
      !proposalData.metadataHash;
    const proposalIdNumber =
      proposalData?.proposalNumber != null ?
        BigInt(proposalData.proposalNumber)
      : undefined;
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
      proposalData.metadataHash ?? onchainMetadataHash ?? undefined;
    const { data: metadataResult, fetching: isMetadataIpfsFetching } =
      useMetadataIpfsFetch({
        hash: resolvedMetadataHash,
        enabled: !!resolvedMetadataHash && !proposalData.metadata,
      });
    const isMetadataLoading =
      !proposalData.metadata &&
      ((shouldReadOnchainMetadataHash &&
        (isOnchainMetadataHashLoading || !isOnchainMetadataHashFetched)) ||
        (!!resolvedMetadataHash && isMetadataIpfsFetching));

    const metadata = proposalData.metadata ??
      metadataResult ?? {
        title: `Proposal #${proposalData.proposalNumber}`,
      };

    const proposalStatusCode = Number(proposalStatus);
    const pathname = usePathname();
    const proposalSlug = formatProposalSlug(proposalNumber);
    const searchParams = useCollectQueryParams();
    const { subscribe, unsubscribe } = usePubSubContext();
    const isNewProposal =
      searchParams[QUERY_PARAMS.poolPage.newProposal] ==
      proposalNumber.toString();
    const [optimisticProposalStatus, setOptimisticProposalStatus] = useState<
      string | null
    >(null);

    const {
      currentConvictionPct,
      thresholdPct,
      isThresholdBelowDisplayPrecision,
      hasReachedThreshold,
      totalSupportPct,
      timeToPass,
      triggerConvictionRefetch,
      updatedConviction,
    } = useConvictionRead({
      proposalData,
      strategyConfig,
      tokenData,
    });

    useEffect(() => {
      if (updatedConviction != null) {
        onConvictionUpdate?.(proposalData.id, updatedConviction);
      }
    }, [updatedConviction, onConvictionUpdate, proposalData.id]);

    useEffect(() => {
      setOptimisticProposalStatus(null);
    }, [proposalStatus]);

    useEffect(() => {
      const subscriptionId = subscribe(
        {
          topic: "proposal",
          type: "update",
          containerId: poolAddress,
          id: proposalNumber,
        },
        (payload) => {
          if (payload.function === "cancelProposal") {
            setOptimisticProposalStatus("cancelled");
          }
          if (payload.function === "disputeProposal") {
            setOptimisticProposalStatus("disputed");
          }
        },
      );

      return () => {
        unsubscribe(subscriptionId);
      };
    }, [poolAddress, proposalNumber, subscribe, unsubscribe]);

    useImperativeHandle(
      ref,
      () => ({
        getProposalConviction: () => ({
          conviction: updatedConviction ?? BigInt(0),
          convictionPct: currentConvictionPct ?? 0,
          support: totalSupportPct ?? 0,
          threshold: thresholdPct ?? 0,
          timeToPass: timeToPass ?? 0,
        }),
      }),
      [
        updatedConviction,
        currentConvictionPct,
        totalSupportPct,
        thresholdPct,
        timeToPass,
      ],
    );

    ProposalCard.displayName = "ProposalCard";

    const inputValue =
      inputData ?
        calculatePercentageBigInt(inputData.value, memberActivatedPoints)
      : 0;

    const poolWeightAllocatedInProposal = (
      (inputValue * Number(memberPoolWeight ?? 0)) /
      100
    ).toFixed(2);

    const isSignalingType =
      PoolTypes[strategyConfig.proposalType] === "signaling";
    const isStreamingType =
      PoolTypes[strategyConfig.proposalType] === "streaming";
    const [escrowBalanceSnapshotBn, setEscrowBalanceSnapshotBn] = useState<
      bigint | null
    >(null);
    const [escrowBalanceSnapshotAtMs, setEscrowBalanceSnapshotAtMs] =
      useState<bigint>(0n);

    const proposalStream =
      proposalData.proposalStream ?? proposalData.proposalStreams?.[0];

    const subgraphCurrentFlowRateBn = toBigInt(proposalStream?.currentFlowRate);
    const streamedUntilSnapshotBn = toBigInt(
      proposalStream?.streamedUntilSnapshot,
    );
    const lastSnapshotAtBn = toBigInt(proposalStream?.lastSnapshotAt);
    const resolvedProposalStatus =
      optimisticProposalStatus ?? ProposalStatus[proposalStatusCode];
    const alreadyExecuted = resolvedProposalStatus === "executed";
    const isFrozenStreamingProposal =
      isStreamingType &&
      (resolvedProposalStatus === "disputed" ||
        resolvedProposalStatus === "cancelled");

    const {
      currentFlowRateBn: liveCurrentFlowRateBn,
      liveTotalStreamedBn: explorerTotalStreamedBn,
      hasFetched: hasFetchedLiveProposalFlow,
    } = useSuperfluidStream({
      receiver: proposalData.streamingEscrow as Address,
      superToken: strategyConfig.superfluidToken as Address,
      chainId,
      containerId: poolAddress,
    });
    const currentFlowRateBn =
      liveCurrentFlowRateBn ?? subgraphCurrentFlowRateBn;
    const displayedNowMs = useMemo(
      () => BigInt(Date.now()),
      [
        currentFlowRateBn,
        streamedUntilSnapshotBn,
        lastSnapshotAtBn,
        explorerTotalStreamedBn,
        isFrozenStreamingProposal,
        escrowBalanceSnapshotBn,
        escrowBalanceSnapshotAtMs,
      ],
    );
    const lastSnapshotAtMs = lastSnapshotAtBn * 1000n;
    const elapsedMs =
      (
        !isFrozenStreamingProposal &&
        currentFlowRateBn > 0n &&
        lastSnapshotAtMs > 0n &&
        displayedNowMs > lastSnapshotAtMs
      ) ?
        displayedNowMs - lastSnapshotAtMs
      : 0n;
    const totalReceivedByEscrowBn =
      streamedUntilSnapshotBn + (currentFlowRateBn * elapsedMs) / 1000n;
    const isDisputedStreamingProposal =
      isStreamingType && resolvedProposalStatus === "disputed";

    useEffect(() => {
      setEscrowBalanceSnapshotBn(null);
      setEscrowBalanceSnapshotAtMs(0n);
    }, [proposalData.id, proposalData.streamingEscrow]);

    const proposalFlowPerMonth =
      (
        isStreamingType &&
        poolToken &&
        currentFlowRateBn != null &&
        currentFlowRateBn > 0n
      ) ?
        +formatUnits(currentFlowRateBn, poolToken.decimals) * SEC_TO_MONTH
      : null;
    const showStreamingInsufficientFunds =
      isStreamingType &&
      !isFrozenStreamingProposal &&
      !alreadyExecuted &&
      hasFetchedLiveProposalFlow &&
      currentFlowRateBn === 0n &&
      subgraphCurrentFlowRateBn > 0n &&
      (poolToken?.balance ?? 0n) === 0n;
    const showStreamingAboutToStart =
      isStreamingType &&
      !isFrozenStreamingProposal &&
      !alreadyExecuted &&
      hasFetchedLiveProposalFlow &&
      currentFlowRateBn === 0n &&
      subgraphCurrentFlowRateBn > 0n &&
      (poolToken?.balance ?? 0n) > 0n;
    const { data: escrowSuperTokenBalance } = useBalance({
      address: proposalData.streamingEscrow as Address,
      token: strategyConfig.superfluidToken as Address,
      chainId,
      enabled:
        isDisputedStreamingProposal &&
        !!proposalData.streamingEscrow &&
        !!strategyConfig.superfluidToken,
    });

    useEffect(() => {
      if (escrowSuperTokenBalance?.value == null) return;
      setEscrowBalanceSnapshotBn(escrowSuperTokenBalance.value);
      setEscrowBalanceSnapshotAtMs(BigInt(Date.now()));
    }, [escrowSuperTokenBalance?.value]);

    const escrowBalanceElapsedMs =
      (
        escrowBalanceSnapshotBn != null &&
        !isFrozenStreamingProposal &&
        currentFlowRateBn > 0n &&
        displayedNowMs > escrowBalanceSnapshotAtMs
      ) ?
        displayedNowMs - escrowBalanceSnapshotAtMs
      : 0n;
    const liveEscrowSuperTokenBalanceBn =
      escrowBalanceSnapshotBn != null ?
        escrowBalanceSnapshotBn +
        (currentFlowRateBn * escrowBalanceElapsedMs) / 1000n
      : null;
    const currentEscrowSuperTokenBalanceBn =
      isDisputedStreamingProposal ?
        liveEscrowSuperTokenBalanceBn ?? escrowSuperTokenBalance?.value ?? 0n
      : escrowSuperTokenBalance?.value ?? 0n;
    const totalStreamedToBeneficiaryBn =
      isStreamingType ?
        (() => {
          const totalReceivedBn =
            isFrozenStreamingProposal ?
              streamedUntilSnapshotBn
            : explorerTotalStreamedBn ?? totalReceivedByEscrowBn;
          return totalReceivedBn > currentEscrowSuperTokenBalanceBn ?
              totalReceivedBn - currentEscrowSuperTokenBalanceBn
            : 0n;
        })()
      : null;
    const proposalTotalStreamed =
      isStreamingType && poolToken && totalStreamedToBeneficiaryBn != null ?
        +formatUnits(totalStreamedToBeneficiaryBn, poolToken.decimals)
      : null;
    const proposalTotalStreamedRatePerSecond =
      (
        isStreamingType &&
        poolToken &&
        !isFrozenStreamingProposal &&
        currentFlowRateBn > 0n
      ) ?
        Number(formatUnits(currentFlowRateBn, poolToken.decimals))
      : 0;

    const hasThreshold = thresholdPct != null;
    const thresholdValue = thresholdPct ?? 0;
    const supportNeededToPass = (
      thresholdValue - (totalSupportPct ?? 0)
    ).toFixed(2);

    const readyToBeExecuted = hasThreshold && hasReachedThreshold === true;

    const hasInsufficientPoolFundsForRequest =
      requestedAmount != null &&
      poolToken?.balance != null &&
      requestedAmount > poolToken.balance;

    const proposalWillPass =
      hasThreshold &&
      Number(supportNeededToPass) < 0 &&
      (currentConvictionPct ?? 0) < thresholdValue &&
      !alreadyExecuted;

    const hasProposalPassCountdown =
      proposalWillPass &&
      !readyToBeExecuted &&
      timeToPass != null &&
      Number.isFinite(Number(timeToPass)) &&
      Number(timeToPass) > 0;

    const hasActiveStream = (currentFlowRateBn ?? 0n) > 0n;

    const impossibleToPass =
      hasThreshold && (thresholdValue >= 100 || minThGtTotalEffPoints);

    const streamingStatusLabel =
      isStreamingType ?
        resolvedProposalStatus === "cancelled" ? "Cancelled"
        : resolvedProposalStatus === "disputed" ? "Disputed"
        : resolvedProposalStatus === "executed" ? "Closed"
        : hasActiveStream ? "Streaming"
        : showStreamingAboutToStart || readyToBeExecuted ? "About to stream"
        : "Active"
      : undefined;

    const ProposalCountDown = (
      <>
        <div className="text-neutral-soft-content text-xs sm:text-sm">
          {!isSignalingType && hasInsufficientPoolFundsForRequest ?
            <div
              className="flex items-center justify-center gap-1 tooltip tooltip-right"
              data-tip="This proposal cannot execute until more funds are added to the pool."
            >
              <ExclamationTriangleIcon className="w-5 h-5 text-secondary-content" />
              <span className="text-xs sm:text-sm text-secondary-content">
                Insufficient pool funds
              </span>
            </div>
          : !isSignalingType && impossibleToPass ?
            <div
              className="flex items-center justify-center gap-1 tooltip tooltip-right"
              data-tip={`${
                minThGtTotalEffPoints ?
                  "Not enough eligible voters in this pool have activated their governance."
                : `This proposal will not pass unless more ${
                    minThGtTotalEffPoints ?
                      "eligible voters activate their governance"
                    : "funds are added"
                  }`
              }`}
            >
              <ExclamationTriangleIcon className="w-5 h-5 text-secondary-content" />
              <span className="text-xs sm:text-sm text-secondary-content">
                {minThGtTotalEffPoints ?
                  "Threshold out of reach"
                : "Threshold over 100%."}
              </span>
            </div>
          : (
            Number(supportNeededToPass) > 0 &&
            !alreadyExecuted &&
            !readyToBeExecuted
          ) ?
            `At least ${supportNeededToPass} VP needed`
          : hasProposalPassCountdown ?
            PoolTypes[strategyConfig.proposalType] === "funding" ?
              "Estimated time to pass:"
            : "Before streaming starts:"
          : (
            !alreadyExecuted &&
            resolvedProposalStatus !== "disputed" &&
            !hasActiveStream &&
            readyToBeExecuted &&
            !isSignalingType
          ) ?
            isStreamingType ?
              "About to stream"
            : "Ready to be executed"
          : ""}
        </div>
        {hasProposalPassCountdown && (
          <Countdown
            endTimestamp={Number(timeToPass)}
            display="inline"
            className="text-neutral-soft-content text-xs sm:text-sm"
            onTimeout={triggerConvictionRefetch}
            showTimeout={false}
          />
        )}
      </>
    );

    const isProposalEnded =
      resolvedProposalStatus === "cancelled" ||
      resolvedProposalStatus === "rejected" ||
      resolvedProposalStatus === "executed";

    const proposalCardContent = (
      <>
        <div
          className={`flex flex-wrap ${isAllocationView ? `section-layout ${isNewProposal ? "shadow-2xl" : ""}` : ""}`}
        >
          <div className="flex flex-col sm:flex-row w-full">
            {/* icon title and id */}
            <header className="flex-1 justify-between items-start gap-3">
              <div className="flex-1 items-start flex flex-col gap-1 sm:gap-2">
                <div className="flex items-center justify-between w-full">
                  <Skeleton
                    isLoading={isMetadataLoading}
                    className="max-w-[500px] w-full"
                  >
                    <h3 className="flex items-start  max-w-[150px] sm:max-w-md">
                      <TooltipIfOverflow>{metadata?.title}</TooltipIfOverflow>
                    </h3>
                  </Skeleton>
                  {isPoolEnabled && (
                    <div className="flex items-center gap-4">
                      <Badge
                        status={proposalStatusCode}
                        label={streamingStatusLabel}
                        icon={<HandRaisedIcon />}
                      />
                    </div>
                  )}
                </div>
                <div className="flex  justify-between items-center">
                  <div className="flex sm:items-center flex-col items-start sm:flex-row gap-1">
                    {submitter === proposalData.beneficiary ?
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                      >
                        <EthAddress
                          address={submitter as Address}
                          shortenAddress={true}
                          actions="copy"
                          textColor="var(--color-grey-900)"
                        />
                      </div>
                    : <>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                        >
                          <p>By</p>
                          <EthAddress
                            address={submitter as Address}
                            shortenAddress={true}
                            actions="copy"
                            textColor="var(--color-grey-900)"
                          />
                        </div>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                        >
                          <p>To</p>
                          <EthAddress
                            address={proposalData.beneficiary as Address}
                            shortenAddress={true}
                            actions="copy"
                            textColor="var(--color-grey-900)"
                          />
                        </div>
                      </>
                    }
                    <div className="flex gap-6 text-neutral-soft-content justify-end">
                      {!isSignalingType && poolToken && !isStreamingType && (
                        <div className="flex items-center gap-1 justify-self-end">
                          <div className="hidden sm:block w-1 h-1 rounded-full bg-neutral-soft-content" />
                          <p className="text-sm sm:ml-1 dark:text-neutral-soft-content">
                            Requesting:{" "}
                          </p>
                          <DisplayNumber
                            number={formatUnits(
                              requestedAmount,
                              poolToken.decimals,
                            )}
                            tokenSymbol={poolToken.symbol}
                            compact={true}
                            valueClassName="dark:text-neutral-soft-content"
                            symbolClassName="dark:text-neutral-soft-content"
                          />
                        </div>
                      )}
                      {poolToken && isStreamingType && (
                        <div className="flex items-center gap-2 justify-self-end">
                          <div className="hidden sm:block w-1 h-1 rounded-full bg-neutral-soft-content" />
                          <p className="text-sm dark:text-neutral-soft-content">
                            Stream:{" "}
                          </p>
                          <span className="text-sm font-mono tabular-nums dark:text-neutral-soft-content">
                            {showStreamingInsufficientFunds ?
                              "Pool empty"
                            : showStreamingAboutToStart ?
                              "About to stream"
                            : proposalFlowPerMonth != null ?
                              `${roundToSignificant(proposalFlowPerMonth, 4)} ${poolToken.symbol}/mo`
                            : "No active stream"}
                          </span>

                          <span className="hidden sm:inline text-neutral-soft-content">
                            ·
                          </span>
                          <p className="text-sm dark:text-neutral-soft-content">
                            Total:
                          </p>

                          <p className="text-sm font-mono tabular-nums dark:text-neutral-soft-content">
                            <LiveFlowingAmount
                              value={proposalTotalStreamed}
                              ratePerSecond={proposalTotalStreamedRatePerSecond}
                              suffix={poolToken?.symbol}
                              fractionDigits={5}
                              className="text-sm dark:text-neutral-soft-content"
                            />
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="hidden sm:block w-1 h-1 rounded-full bg-neutral-soft-content" />
                    <div>
                      <p className="text-sm text-neutral-soft-content">
                        {prettyTimestamp(createdAt ?? 0)}
                        {executedAt && " - " + prettyTimestamp(executedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </div>

          <Divider className="sm:hidden" />

          {isPoolEnabled && !isProposalEnded && (
            <div className="flex gap-4 flex-wrap w-full  mb-2">
              <div className={`w-full  ${isSignalingType ? "mt-0" : "mt-2"}`}>
                <div className="w-full ">
                  {currentConvictionPct != null && totalSupportPct != null && (
                    <div>
                      <div
                        className={`flex flex-col-reverse sm:flex-row items-baseline justify-between gap-1 ${isSignalingType ? "mb-0" : "mb-1"}`}
                      >
                        <div>
                          <span className="text-xs">{ProposalCountDown}</span>
                        </div>
                        <ul className="flex gap-1.5 sm:gap-2 items-center text-xs sm:text-sm">
                          <li>
                            <span className="text-xs text-[#74c898] dark:text-primary-dark-base text-justify ">
                              conviction: {currentConvictionPct} VP
                            </span>
                          </li>
                          <li>
                            <span className="text-xs text-primary-button dark:text-dark-chart-support">
                              support: {totalSupportPct} VP
                            </span>
                          </li>

                          {!isSignalingType && hasThreshold && (
                            <li>
                              <span className="text-xs text-neutral-soft-content">
                                threshold:{" "}
                                {impossibleToPass ? "too high" : `${thresholdPct} VP`}
                              </span>
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="flex items-center h-2 sm:h-3">
                        <ConvictionBarChart
                          compact
                          currentConvictionPct={currentConvictionPct}
                          thresholdPct={thresholdPct ?? 0}
                          proposalSupportPct={totalSupportPct ?? 0}
                          isSignalingType={isSignalingType}
                          proposalNumber={proposalNumber}
                          refreshConviction={triggerConvictionRefetch}
                          proposalStatus={resolvedProposalStatus}
                          proposalType={PoolTypes[strategyConfig.proposalType]}
                          hasInsufficientPoolFunds={
                            hasInsufficientPoolFundsForRequest
                          }
                          isThresholdOutOfReach={minThGtTotalEffPoints}
                          isThresholdBelowDisplayPrecision={
                            isThresholdBelowDisplayPrecision
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {isPoolEnabled && !isProposalEnded && stakedFilter?.value > 0 && (
            <Badge color="success" className="self-center justify-self-start">
              <p className="text-xs">
                Your support: {poolWeightAllocatedInProposal} VP
              </p>
            </Badge>
          )}
        </div>
        {/* TODO: fetch every member stake */}
        {/* {!isAllocationView && <p className="text-sm mt-1">3 Supporters</p>} */}
      </>
    );

    return (
      <>
        {isAllocationView ?
          proposalCardContent
        : <Card
            href={`${pathname}/${proposalSlug}`}
            className={`py-4 ${isNewProposal ? "shadow-2xl" : ""}`}
          >
            {proposalCardContent}
          </Card>
        }
      </>
    );
  },
);
