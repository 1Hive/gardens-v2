"use client";

import { Hashicon } from "@emeraldpay/hashicon-react";
import { FetchTokenResult } from "@wagmi/core";
import { usePathname } from "next/navigation";
import { formatUnits } from "viem";
import { Allo } from "#/subgraph/.graphclient";
import { DisplayNumber } from "./DisplayNumber";
import { ProposalInputItem } from "./Proposals";
import { getProposals } from "@/actions/getProposals";
import { Badge, Card } from "@/components";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/hooks/useCollectQueryParams";
import { useConvictionRead } from "@/hooks/useConvictionRead";
import { PoolTypes } from "@/types";
import { calculatePercentage } from "@/utils/numbers";

type ProposalCardProps = {
  proposalData: NonNullable<Awaited<ReturnType<typeof getProposals>>>[0];
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
  triggerRenderProposals: () => void;
};

export function ProposalCard({
  proposalData,
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
  const {
    metadata,
    id,
    proposalNumber,
    proposalStatus,
    requestedAmount,
    type,
  } = proposalData;
  const pathname = usePathname();

  const searchParams = useCollectQueryParams();
  // TODO: ADD border color when new proposal is added
  const isNewProposal =
    searchParams[QUERY_PARAMS.poolPage.newPropsoal] == proposalNumber;

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

  const isSignalingType = PoolTypes[type] === "signaling";

  const proposalCardContent = (
    <>
      <div
        className={`flex gap-3 justify-between py-3 flex-wrap  ${isAllocationView ? "section-layout" : ""}`}
      >
        <div className=" flex w-full">
          {/* icon title and id */}
          <div className={"flex gap-6 flex-1 "}>
            {/* <div className="hidden sm:visible"> */}
            <Hashicon value={id} size={45} />
            {/* </div> */}
            <div className="overflow-hidden">
              <h4 className="truncate first-letter:uppercase max-w-xl">
                {metadata.title}
              </h4>
              <h6 className="text-sm">ID {proposalNumber}</h6>
            </div>
          </div>

          {/* requestes and status */}
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
                    {Number(inputValue) > 0 ?
                      <>
                        <div className="flex gap-10">
                          <div className="flex flex-col items-center justify-center">
                            <p className="subtitle2">
                              <span className="text-2xl font-semibold text-primary-content">
                                {inputValue}
                              </span>
                              /100%
                            </p>
                            <p className="text-primary-content">
                              Total allocated
                            </p>
                          </div>
                          <div className="flex flex-col items-center justify-center">
                            <p className="subtitle2">
                              <span className="text-2xl font-semibold text-primary-content">
                                {poolWeightAllocatedInProposal}
                              </span>
                              /{memberPoolWeight}%
                            </p>
                            <p className="text-primary-content">Pool weight</p>
                          </div>
                        </div>
                      </>
                    : <p className="text-neutral-soft-content">No allocation</p>
                    }
                  </div>
                </div>
              </div>
            : <div className="w-full">
                {currentConvictionPct != null &&
                  thresholdPct != null &&
                  totalSupportPct != null && (
                    <div className="">
                      <p className="mb-2 text-sm">
                        Total Support: 5% of pool weight (at least 3.23% more
                        needed to pass)
                      </p>
                      <div className="h-4">
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
      {!isAllocationView && <p className="text-sm">3 Supporters</p>}
    </>
  );

  return (
    <>
      {isAllocationView ?
        proposalCardContent
      : <Card
          href={`${pathname}/${id}`}
          className={`py-4 ${isNewProposal ? "shadow-xl" : ""}`}
        >
          {proposalCardContent}
        </Card>
      }
    </>
  );
}

{
  /*<div className="col-span-3 self-center justify-self-start">
 {stakedFilter &&
  (stakedFilter?.value > 0 ?
    <p
      className="text-primary-content text-xs flex items-center justify-center
gap-3"
    >
      Total allocated{" "}
      <span className="font-medium text-2xl">
        {`${allocatedInProposal.toString()}%`}
      </span>
    </p>
  : <p className="text-xs text-neutral-soft-content text-center">
      No allocation yet
    </p>)} 
</div*/
}
