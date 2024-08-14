"use client";

import { Hashicon } from "@emeraldpay/hashicon-react";
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
import { LightCVStrategy, PoolTypes } from "@/types";
import { calculatePercentage } from "@/utils/numbers";

type ProposalCardProps = {
  proposalData: NonNullable<Awaited<ReturnType<typeof getProposals>>>[0];
  inputData: ProposalInputItem;
  stakedFilter: ProposalInputItem;
  index: number;
  isAllocationView: boolean;
  memberActivatedPoints: number;
  memberPoolWeight: number;
  executeDisabled: boolean;
  tooltipMessage: string;
  strategy: LightCVStrategy;
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
  isAllocationView,
  memberActivatedPoints,
  strategy,
  tokenData,
  inputHandler,
}: ProposalCardProps) {
  const { title, id, proposalNumber, proposalStatus, requestedAmount, type } =
    proposalData;
  const pathname = usePathname();

  const searchParams = useCollectQueryParams();
  // TODO: ADD border color when new proposal is added
  const isNewProposal =
    searchParams[QUERY_PARAMS.poolPage.newPropsoal] ==
    proposalData.proposalNumber;

  const { currentConvictionPct, thresholdPct, totalSupportPct } =
    useConvictionRead({
      proposalData,
      tokenData,
    });

  //TODO: move execute func to proposalId page

  const inputValue = calculatePercentage(
    inputData.value,
    memberActivatedPoints,
  );

  const allocatedInProposal = calculatePercentage(
    stakedFilter?.value,
    memberActivatedPoints,
  );

  const isSignalingType = PoolTypes[type] === "signaling";

  const ProposalCardContent = ({
    isAllocationMode,
  }: {
    isAllocationMode?: boolean;
  }) => {
    return (
      <>
        <div
          className={`grid grid-cols-10 gap-8  py-3 ${isAllocationMode && "section-layout"}`}
        >
          <div
            className={`col-span-3 flex gap-6 ${isAllocationMode && "col-span-9"}`}
          >
            <Hashicon value={id} size={45} />
            <div className="overflow-hidden">
              <h4 className="truncate first-letter:uppercase">{title}</h4>
              <h6 className="text-sm">ID {proposalNumber}</h6>
            </div>
          </div>
          <Badge
            status={proposalStatus}
            classNames={`self-center ${isAllocationMode ? "justify-self-end" : "justify-self-start"}`}
          />
          {!isAllocationMode && (
            <>
              <div className="col-span-3 ml-10 self-center justify-self-start">
                {stakedFilter?.value > 0 ?
                  <p
                    className="text-primary-content text-xs flex items-center justify-center
                  // TODO: calculate data when fetching ok from subgrpah
                gap-1"
                  >
                    You allocate{" "}
                    <span className="font-medium text-2xl">
                      {`${allocatedInProposal.toString()}%`}
                    </span>{" "}
                    pool weight
                  </p>
                : <p className="text-xs text-neutral-soft-content text-center">
                    You have not allocate yet
                  </p>
                }
              </div>
              <div className="col-span-3 self-center flex flex-col gap-2">
                {currentConvictionPct != null &&
                  thresholdPct != null &&
                  totalSupportPct != null && (
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
                  )}
                {!isSignalingType && (
                  <div className="flex items-baseline gap-1">
                    <p className="text-xs text-neutral-soft-content">
                      Requested amount:{" "}
                    </p>
                    <DisplayNumber
                      number={formatUnits(requestedAmount, 18)}
                      tokenSymbol={strategy.registryCommunity.garden.symbol}
                      compact={true}
                      className="text-neutral-soft-content text-xs"
                    />
                  </div>
                )}
              </div>
            </>
          )}
          {isAllocationView && (
            <div className="col-span-10 mt-4">
              <div className=" flex w-full flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-8">
                  <div>
                    <input
                      type="range"
                      min={0}
                      max={memberActivatedPoints}
                      value={inputData.value}
                      className={
                        "range range-md min-w-[460px] cursor-pointer bg-neutral-soft [--range-shdw:var(--color-green-500)]"
                      }
                      step={memberActivatedPoints / 100}
                      onChange={(e) =>
                        inputHandler(index, Number(e.target.value))
                      }
                    />
                    <div className="flex w-full justify-between px-2.5">
                      {[...Array(21)].map((_) => (
                        <span className="text-[8px]" key={"span_"}>
                          |
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mb-2">
                    {Number(inputValue) > 0 ?
                      <>
                        <p className="flex items-center gap-2 text-primary-content">
                          Total allocated{" "}
                          <span className="font-chakra text-2xl font-semibold">
                            {inputValue}{" "}
                          </span>
                          %
                        </p>
                      </>
                    : <p className="text-neutral-soft-content">No allocation</p>
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      {isAllocationView ?
        <ProposalCardContent isAllocationMode />
      : <Card
          href={`${pathname}/${id}`}
          className={`py-4 ${isNewProposal ? "!border-accent !border-2" : ""}`}
        >
          <ProposalCardContent />
        </Card>
      }
    </>
  );
}
