/* eslint-disable jsx-a11y/click-events-have-key-events */
"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import {
  HandRaisedIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { Address, formatUnits } from "viem";
import {
  Allo,
  CVProposal,
  CVStrategyConfig,
  Maybe,
  ProposalMetadata,
} from "#/subgraph/.graphclient";
import { Countdown } from "./Countdown";
import { DisplayNumber } from "./DisplayNumber";
import { ProposalInputItem } from "./Proposals";
import TooltipIfOverflow from "./TooltipIfOverflow";
import { Badge, Card, EthAddress } from "@/components";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { Skeleton } from "@/components/Skeleton";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import {
  ProposalDataLight,
  useConvictionRead,
} from "@/hooks/useConvictionRead";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { PoolTypes, ProposalStatus } from "@/types";
import { calculatePercentageBigInt } from "@/utils/numbers";
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
  > &
    ProposalDataLight & {
      metadata?: Maybe<Pick<ProposalMetadata, "title">>;
    };
  strategyConfig: Pick<
    CVStrategyConfig,
    "decay" | "proposalType" | "allowlist"
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
    },
    ref,
  ) => {
    const { data: metadataResult } = useMetadataIpfsFetch({
      hash: proposalData.metadataHash,
      enabled: !proposalData.metadata,
    });

    const metadata = proposalData.metadata ?? metadataResult;

    const {
      id,
      proposalNumber,
      proposalStatus,
      requestedAmount,
      submitter,
      createdAt,
      executedAt,
    } = proposalData;
    const pathname = usePathname();

    const searchParams = useCollectQueryParams();
    const isNewProposal =
      searchParams[QUERY_PARAMS.poolPage.newProposal] ==
      proposalNumber.toString();

    const {
      currentConvictionPct,
      thresholdPct,
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
      if (updatedConviction != null && currentConvictionPct != null) {
      }
    }, [updatedConviction, currentConvictionPct]);

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
      (inputValue * Number(memberPoolWeight)) /
      100
    ).toFixed(2);

    const isSignalingType =
      PoolTypes[strategyConfig.proposalType] === "signaling";

    const alreadyExecuted = proposalStatus[proposalStatus] === "executed";

    const supportNeededToPass = (
      (thresholdPct ?? 0) - (totalSupportPct ?? 0)
    ).toFixed(2);

    const readyToBeExecuted = (currentConvictionPct ?? 0) > (thresholdPct ?? 0);

    const proposalWillPass =
      Number(supportNeededToPass) < 0 &&
      (currentConvictionPct ?? 0) < (thresholdPct ?? 0) &&
      !alreadyExecuted;

    const impossibleToPass =
      (thresholdPct != null && thresholdPct >= 100) || thresholdPct === 0;

    const ProposalCountDown = (
      <>
        <div className="text-neutral-soft-content text-xs sm:text-sm">
          {!isSignalingType && impossibleToPass ?
            <div
              className="flex items-center justify-center gap-1 tooltip tooltip-top sm:tooltip-right"
              data-tip={`${
                thresholdPct === 0 ?
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
                {thresholdPct === 0 ?
                  "Threshold out of reach"
                : "Threshold over 100 VP"}
              </span>
            </div>
          : (
            Number(supportNeededToPass) > 0 &&
            !alreadyExecuted &&
            !readyToBeExecuted
          ) ?
            `At least ${supportNeededToPass} VP needed`
          : proposalWillPass ?
            "Estimated time to pass:"
          : !alreadyExecuted && readyToBeExecuted && !isSignalingType ?
            "Ready to be executed"
          : ""}
        </div>
        {proposalWillPass && !readyToBeExecuted && timeToPass != null && (
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
      ProposalStatus[proposalStatus] === "cancelled" ||
      ProposalStatus[proposalStatus] === "rejected" ||
      ProposalStatus[proposalStatus] === "executed";

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
                  <Skeleton isLoading={!metadata}>
                    <h3 className="flex items-start  max-w-[150px] sm:max-w-md">
                      <TooltipIfOverflow>{metadata?.title}</TooltipIfOverflow>
                    </h3>
                  </Skeleton>
                  {isPoolEnabled && (
                    <div className="flex items-center gap-4">
                      <Badge
                        status={proposalStatus}
                        icon={<HandRaisedIcon />}
                      />
                    </div>
                  )}
                </div>
                <div className="flex  justify-between items-center">
                  <div className="flex sm:items-center flex-col items-start sm:flex-row gap-2">
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
                    <div className="flex gap-6 text-neutral-soft-content justify-end">
                      {!isSignalingType && poolToken && (
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

          {/* support description or slider */}
          {isPoolEnabled && !isProposalEnded && (
            <div className="flex gap-4 flex-wrap w-full">
              <div className={`w-full ${isSignalingType ? "mt-2" : "mt-4"}`}>
                {/* manage support view */}
                <div className="w-full ">
                  {currentConvictionPct != null &&
                    (isSignalingType ||
                      (thresholdPct != null && totalSupportPct != null)) && (
                      <div>
                        <div
                          className={`flex items-baseline justify-between gap-4 ${isSignalingType ? "mb-0" : "mb-1"}`}
                        >
                          <div>
                            <span className="text-xs">{ProposalCountDown}</span>
                          </div>
                          <ul className="flex gap-2 items-baseline text-xs sm:text-sm">
                            <li>
                              <span className="text-xs text-[#74c898] dark:text-primary-dark-base ">
                                conviction: {currentConvictionPct} VP
                              </span>
                            </li>
                            <li>
                              <span className="text-xs text-primary-button dark:text-dark-chart-support">
                                support: {totalSupportPct} VP
                              </span>
                            </li>

                            {!isSignalingType && (
                              <li>
                                <span className="text-xs text-neutral-soft-content">
                                  threshold: {thresholdPct} VP
                                </span>
                              </li>
                            )}
                          </ul>
                        </div>

                        <div
                          className={`flex items-center h-2 sm:h-3 ${isSignalingType ? "mb-1" : "mb-3"}`}
                        >
                          <ConvictionBarChart
                            compact
                            currentConvictionPct={currentConvictionPct}
                            thresholdPct={thresholdPct ?? 0}
                            proposalSupportPct={totalSupportPct ?? 0}
                            isSignalingType={isSignalingType}
                            proposalNumber={proposalNumber}
                            refreshConviction={triggerConvictionRefetch}
                            proposalStatus={proposalStatus}
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
            href={`${pathname}/${id}`}
            className={`py-4 ${isNewProposal ? "shadow-2xl" : ""}`}
          >
            {proposalCardContent}
          </Card>
        }
      </>
    );
  },
);
