"use client";

import { Hashicon } from "@emeraldpay/hashicon-react";
import { FetchTokenResult } from "@wagmi/core";
import { usePathname } from "next/navigation";
import { formatUnits } from "viem";
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
import { Badge, Button, Card } from "@/components";
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
import { calculatePercentage } from "@/utils/numbers";
import { prettyTimestamp } from "@/utils/text";

export type ProposalCardProps = {
  proposalData: Pick<
    CVProposal,
    "id" | "proposalStatus" | "metadataHash" | "createdAt"
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
  poolToken?: FetchTokenResult;
  isAllocationView: boolean;
  memberActivatedPoints: number;
  memberPoolWeight: number;
  executeDisabled: boolean;
  tokenDecimals: number;
  alloInfo: Allo;
  tokenData: Parameters<typeof useConvictionRead>[0]["tokenData"];
  inputHandler: (proposalId: string, value: number) => void;
};

export function ProposalCard({
  proposalData,
  strategyConfig,
  inputData,
  stakedFilter,
  poolToken,
  isAllocationView,
  memberActivatedPoints,
  memberPoolWeight,
  tokenData,
  inputHandler,
}: ProposalCardProps) {
  const { data: metadataResult } = useMetadataIpfsFetch({
    hash: proposalData.metadataHash,
    enabled: !proposalData.metadata,
  });

  const metadata = proposalData.metadata ?? metadataResult;

  const { id, proposalNumber, proposalStatus, requestedAmount } = proposalData;
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
  } = useConvictionRead({
    proposalData,
    strategyConfig,
    tokenData,
  });

  const inputValue =
    inputData ? calculatePercentage(inputData.value, memberActivatedPoints) : 0;

  const allocatedInProposal = calculatePercentage(
    stakedFilter?.value,
    memberActivatedPoints,
  );

  const poolWeightAllocatedInProposal = (
    (inputValue * memberPoolWeight) /
    100
  ).toFixed(2);

  const isSignalingType =
    PoolTypes[strategyConfig.proposalType] === "signaling";

  const alreadyExecuted = proposalStatus[proposalStatus] === "executed";

  const supportNeededToPass = (
    (thresholdPct ?? 0) - (totalSupportPct ?? 0)
  ).toFixed(2);

  const readyToBeExecuted = (currentConvictionPct ?? 0) >= (thresholdPct ?? 0);

  const proposalWillPass =
    Number(supportNeededToPass) < 0 &&
    (currentConvictionPct ?? 0) < (thresholdPct ?? 0) &&
    !alreadyExecuted;

  const ProposalCountDown = () => {
    return (
      <>
        <p className="text-neutral-soft-content text-sm">
          {(
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
        </p>
        {proposalWillPass && !readyToBeExecuted && (
          <Countdown
            endTimestamp={Number(timeToPass)}
            display="inline"
            className="text-neutral-soft-content text-sm"
            onTimeout={triggerConvictionRefetch}
            showTimeout={false}
          />
        )}
      </>
    );
  };

  const isProposalEnded =
    ProposalStatus[proposalStatus] === "cancelled" ||
    ProposalStatus[proposalStatus] === "rejected" ||
    ProposalStatus[proposalStatus] === "executed";

  const proposalCardContent = (
    <>
      <div
        className={`flex gap-3 justify-between py-3 flex-wrap ${isAllocationView ? `section-layout ${isNewProposal ? "shadow-2xl" : ""}` : ""}`}
      >
        <div className="flex flex-col sm:flex-row w-full">
          {/* icon title and id */}
          <div className="flex gap-6 flex-1">
            <div className="hidden sm:block">
              <Hashicon value={id} size={45} />
            </div>
            <div>
              <h4 className="sm:max-w-md lg:max-w-lg">
                <Skeleton isLoading={!metadata} className="w-96 h-5">
                  <TooltipIfOverflow className="first-letter:uppercase">
                    {metadata?.title}
                  </TooltipIfOverflow>
                </Skeleton>
              </h4>
              <div className="flex items-baseline gap-3">
                <h6 className="text-sm">ID {proposalNumber}</h6>
                <p className="text-sm text-neutral-soft-content">
                  {prettyTimestamp(proposalData.createdAt ?? 0)}
                </p>
              </div>
            </div>
          </div>
          {/* amount requested and proposal status */}
          <div className="flex gap-6 text-neutral-soft-content">
            {!isSignalingType && poolToken && (
              <div className="flex items-center gap-1 justify-self-end">
                <p>Requested amount: </p>
                <DisplayNumber
                  number={formatUnits(requestedAmount, poolToken.decimals)}
                  tokenSymbol={poolToken.symbol}
                  compact={true}
                />
              </div>
            )}
            <Badge
              status={proposalStatus}
              className="self-center justify-self-end"
            />
          </div>
        </div>

        {/* support description or slider */}
        <div className="flex gap-12 flex-wrap w-full ">
          <div className="mt-4 w-full">
            {isAllocationView ?
              <div className=" flex w-full flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-8">
                  <div>
                    <div
                      className={isProposalEnded ? "tooltip" : ""}
                      data-tip={
                        isProposalEnded ?
                          "Cannot change allocation when a proposal is ended"
                        : ""
                      }
                    >
                      <input
                        type="range"
                        min={0}
                        max={memberActivatedPoints}
                        value={inputData?.value}
                        className={`range range-md min-w-[460px] cursor-pointer bg-neutral-soft [--range-shdw:var(--color-green-500)] ${isProposalEnded ? "grayscale !cursor-not-allowed" : ""}`}
                        step={memberActivatedPoints / 100}
                        onChange={(e) =>
                          inputHandler(proposalData.id, Number(e.target.value))
                        }
                        disabled={isProposalEnded}
                      />
                    </div>
                    <div className="flex w-full justify-between px-2.5">
                      {[...Array(21)].map((_, i) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <span className="text-[8px]" key={`span_${i}`}>
                          |
                        </span>
                      ))}
                    </div>
                  </div>

                  {isProposalEnded && inputData?.value != 0 && (
                    <Button
                      className="mb-2 !p-2 !px-3"
                      btnStyle="outline"
                      onClick={() => inputHandler(proposalData.id, 0)}
                      tooltip="Clear allocation"
                    >
                      &times;
                    </Button>
                  )}
                  <div className="mb-2">
                    {inputValue > 0 && (
                      <>
                        <div className="flex gap-10">
                          <div className="flex flex-col items-center justify-center">
                            <p className="subtitle2">
                              <span className="text-2xl font-semibold text-primary-content">
                                {poolWeightAllocatedInProposal}
                              </span>
                              /{memberPoolWeight}%{" "}
                              <span className="text-neutral-soft-content text-sm">
                                ({allocatedInProposal}% of your total support)
                              </span>
                            </p>
                            {/* <p className="text-primary-content">Support</p> */}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            : <div className="w-full">
                {currentConvictionPct != null &&
                  thresholdPct != null &&
                  totalSupportPct != null && (
                    <div>
                      <div className="flex items-end gap-1 mb-2">
                        <div>
                          <p className="text-sm">
                            Total Support: <span>{totalSupportPct}%</span> of
                            pool weight.
                          </p>
                        </div>
                        <ProposalCountDown />
                      </div>
                      <div className="h-3">
                        <ConvictionBarChart
                          compact
                          currentConvictionPct={currentConvictionPct}
                          thresholdPct={isSignalingType ? 0 : thresholdPct}
                          proposalSupportPct={totalSupportPct}
                          isSignalingType={isSignalingType}
                          proposalNumber={proposalNumber}
                        />
                      </div>
                    </div>
                  )}
              </div>
            }
          </div>
        </div>
      </div>
      {!isAllocationView && stakedFilter && stakedFilter?.value > 0 && (
        <p className="flex items-baseline text-xs">
          Your support: {poolWeightAllocatedInProposal}%
        </p>
      )}
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
}
