"use client";

import { Hashicon } from "@emeraldpay/hashicon-react";
import { FetchTokenResult } from "@wagmi/core";
import { usePathname } from "next/navigation";
import { formatUnits } from "viem";
import {
  Allo,
  CVStrategyConfig,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { DisplayNumber } from "./DisplayNumber";
import { ProposalInputItem } from "./Proposals";
import { Badge, Card } from "@/components";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { useConvictionRead } from "@/hooks/useConvictionRead";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { PoolTypes } from "@/types";
import { calculatePercentage } from "@/utils/numbers";
import { prettyTimestamp } from "@/utils/text";

type ProposalCardProps = {
  proposalData: getPoolDataQuery["cvstrategies"][number]["proposals"][number];
  strategyConfig: Pick<CVStrategyConfig, "decay" | "proposalType">;
  inputData: ProposalInputItem;
  stakedFilter: ProposalInputItem;
  index: number;
  poolToken: FetchTokenResult;
  isAllocationView: boolean;
  memberActivatedPoints: number;
  memberPoolWeight: number;
  executeDisabled: boolean;
  tooltipMessage: string;
  tokenDecimals: number;
  alloInfo: Allo;
  tokenData: Parameters<typeof useConvictionRead>[0]["tokenData"];
  inputHandler: (i: number, value: number) => void;
};

export function ProposalCard({
  proposalData,
  strategyConfig,
  inputData,
  stakedFilter,
  index,
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
  // TODO: ADD border color when new proposal is added
  const isNewProposal =
    searchParams[QUERY_PARAMS.poolPage.newProposal] ==
    proposalNumber.toString();

  const { currentConvictionPct, thresholdPct, totalSupportPct } =
    useConvictionRead({
      proposalData,
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

  const supportNeededToPass = (
    (thresholdPct ?? 0) - (totalSupportPct ?? 0)
  ).toFixed(2);

  const proposalCardContent = (
    <>
      <div
        className={`flex gap-3 justify-between py-3 flex-wrap ${isAllocationView ? "section-layout" : ""}`}
      >
        <div className="flex flex-col sm:flex-row w-full">
          {/* icon title and id */}
          <div className="flex gap-6 flex-1">
            <div className="hidden sm:block">
              <Hashicon value={id} size={45} />
            </div>
            <div className="overflow-hidden">
              <h4 className="truncate first-letter:uppercase sm:max-w-md lg:max-w-lg">
                {metadata ?
                  metadata.title
                : <div className="[--fallback-b3:#f0f0f0] skeleton w-96 h-7 rounded-md" />
                }
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
            {!isSignalingType && (
              <div className="flex items-center gap-1 justify-self-end">
                <p className="">Requested amount: </p>
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
                    <input
                      type="range"
                      min={0}
                      max={memberActivatedPoints}
                      value={inputData?.value}
                      className={
                        "range range-md min-w-[460px] cursor-pointer bg-neutral-soft [--range-shdw:var(--color-green-500)]"
                      }
                      step={memberActivatedPoints / 100}
                      onChange={(e) =>
                        inputHandler(index, Number(e.target.value))
                      }
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
                  <div className="mb-2">
                    {Number(inputValue) > 0 && (
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
                    <div className="">
                      <p className="mb-2 text-sm">
                        Total Support: <span>{totalSupportPct}%</span> of pool
                        weight{" "}
                        <span className="text-neutral-soft-content text-sm">
                          {Number(supportNeededToPass) > 0 ?
                            `(at least ${supportNeededToPass}% needed)`
                          : ""}
                        </span>
                      </p>
                      <div className="h-3">
                        <ConvictionBarChart
                          compact
                          currentConvictionPct={currentConvictionPct}
                          thresholdPct={isSignalingType ? 0 : thresholdPct}
                          proposalSupportPct={totalSupportPct}
                          isSignalingType={isSignalingType}
                          proposalId={proposalNumber}
                        />
                      </div>
                    </div>
                  )}
              </div>
            }
          </div>
        </div>
      </div>
      {
        <div className="">
          {!isAllocationView && stakedFilter && stakedFilter?.value > 0 && (
            <p className="flex items-baseline text-xs">
              Your support: {poolWeightAllocatedInProposal}%
            </p>
          )}
        </div>
      }
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
