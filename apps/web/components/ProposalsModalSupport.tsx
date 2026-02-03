/* eslint-disable jsx-a11y/click-events-have-key-events */
"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import {
  HandRaisedIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Address, formatUnits } from "viem";
import {
  Allo,
  CVProposal,
  CVStrategyConfig,
  Maybe,
  ProposalMetadata,
} from "#/subgraph/.graphclient";
import { DisplayNumber } from "./DisplayNumber";
import { ProposalInputItem } from "./Proposals";
import TooltipIfOverflow from "./TooltipIfOverflow";
import { Badge, EthAddress } from "@/components";
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
    "id" | "proposalStatus" | "metadataHash" | "createdAt" | "submitter"
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

export const ProposalsModalSupport = forwardRef<
  ProposalHandle,
  ProposalCardProps
>(
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
      inputHandler,
      minThGtTotalEffPoints,
    },
    ref,
  ) => {
    const { data: metadataResult } = useMetadataIpfsFetch({
      hash: proposalData.metadataHash,
      enabled: !proposalData.metadata,
    });

    const metadata = proposalData.metadata ?? metadataResult;

    const { proposalNumber, proposalStatus, requestedAmount, submitter } =
      proposalData;

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

    // useEffect(() => {
    //   if (updatedConviction != null && currentConvictionPct != null) {
    //   }
    // }, [updatedConviction, currentConvictionPct]);

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

    const alreadyExecuted = ProposalStatus[proposalStatus] === "executed";

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
                : "Threshold over 100%."}
              </span>
            </div>
          : (
            Number(supportNeededToPass) > 0 &&
            !alreadyExecuted &&
            !readyToBeExecuted
          ) ?
            `At least ${supportNeededToPass}% needed`
          : proposalWillPass ?
            "Estimated time to pass:"
          : !alreadyExecuted && readyToBeExecuted && !isSignalingType ?
            "Ready to be executed"
          : ""}
        </div>
      </>
    );

    const isProposalEnded =
      ProposalStatus[proposalStatus] === "cancelled" ||
      ProposalStatus[proposalStatus] === "rejected" ||
      ProposalStatus[proposalStatus] === "executed";

    return (
      <>
        <div
          className={`flex flex-wrap section-layout ${isNewProposal ? "shadow-2xl" : ""}`}
        >
          <div className="flex flex-col sm:flex-row w-full">
            {/* icon title and id */}
            <header className="flex-1 justify-between items-start gap-3">
              <div className="flex items-center justify-between gap-2">
                <Skeleton isLoading={!metadata}>
                  <h3 className="flex items-start max-w-[165px] sm:max-w-md">
                    <TooltipIfOverflow>{metadata?.title}</TooltipIfOverflow>
                  </h3>
                </Skeleton>
                {isPoolEnabled && (
                  <div className="flex items-center gap-4 ">
                    <Badge status={proposalStatus} icon={<HandRaisedIcon />} />
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
                      textColor="var(--color-grey-100)"
                    />
                  </div>
                  <div className="flex gap-6 text-neutral-soft-content justify-end">
                    {!isSignalingType && poolToken && (
                      <div className="flex items-center gap-1 justify-self-end">
                        <div className="hidden sm:block w-1 h-1 rounded-full bg-neutral-soft-content" />
                        <p className="text-sm ml-1 dark:text-neutral-soft-content">
                          Requesting:{""}
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
                      {prettyTimestamp(proposalData.createdAt ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            </header>
          </div>

          {/* support description or slider */}
          {isPoolEnabled && !isProposalEnded && (
            <div className="flex gap-12 flex-wrap w-full ">
              <div className="mt-4 w-full">
                {/* manage support view */}
                {isAllocationView ?
                  <div className="flex w-full flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-8 flex-grow flex-wrap">
                      <div className={"flex-grow sm:max-w-[460px] "}>
                        <input
                          type="range"
                          min={0}
                          max={Number(memberActivatedPoints)}
                          value={
                            inputData ? Number(inputData.value) : undefined
                          }
                          className={
                            "range range-md cursor-pointer bg-neutral-soft [--range-bg:var(--color-grey-200)] dark:[--range-bg:#373737] dark:bg-[#373737] [--range-shdw:var(--color-green-500)] dark:[--range-shdw:#4E9F80] "
                          }
                          step={Number(memberActivatedPoints) / 100}
                          onChange={(e) => {
                            inputHandler(
                              proposalData.id,
                              BigInt(Math.floor(Number(e.target.value))),
                            );
                          }}
                        />

                        <div className="flex w-full justify-between px-2.5">
                          {[...Array(21)].map((_, i) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <span className="text-[8px]" key={`span_${i}`}>
                              |
                            </span>
                          ))}
                        </div>
                      </div>

                      {inputValue > 0 && (
                        <div className="mb-2">
                          <>
                            <div className="flex gap-10">
                              <div className="flex flex-col items-center justify-center">
                                <p className="subtitle2">
                                  <span className="text-xl font-semibold text-primary-content">
                                    {poolWeightAllocatedInProposal} VP
                                  </span>
                                  {/* /{memberPoolWeight} VP */}
                                  <span className="text-neutral-soft-content text-sm ml-1">
                                    ({inputValue}% of your voting power)
                                  </span>
                                </p>
                                {/* <p className="text-primary-content">Support</p> */}
                              </div>
                            </div>
                          </>
                        </div>
                      )}
                    </div>
                  </div>
                : <div className="w-full ">
                    {currentConvictionPct != null &&
                      thresholdPct != null &&
                      totalSupportPct != null && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div>
                              <p className="text-xs sm:text-sm">
                                Total Support:{" "}
                                <span className="font-medium">
                                  {totalSupportPct}% of pool weight
                                </span>{" "}
                              </p>
                            </div>

                            {ProposalCountDown}
                          </div>
                        </div>
                      )}
                  </div>
                }
              </div>
            </div>
          )}
        </div>

        {/* TODO: fetch every member stake */}
        {/* {!isAllocationView && <p className="text-sm mt-1">3 Supporters</p>} */}
      </>
    );
  },
);

ProposalsModalSupport.displayName = "ProposalsModalSupport";
