"use client";

import React, { useEffect } from "react";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
import { encodeAbiParameters, formatUnits } from "viem";
import { Address } from "wagmi";
import { Allo } from "#/subgraph/.graphclient";
import { DisplayNumber } from "./DisplayNumber";
import { ProposalInputItem } from "./Proposals";
import { getProposals } from "@/actions/getProposals";
import { Badge, Button, Card } from "@/components";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { QUERY_PARAMS } from "@/constants/query-params";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useCollectQueryParams } from "@/hooks/useCollectQueryParams";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useConvictionRead } from "@/hooks/useConvictionRead";
import { alloABI } from "@/src/generated";
import { LightCVStrategy, poolTypes } from "@/types";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { useErrorDetails } from "@/utils/getErrorName";
import { calculatePercentage } from "@/utils/numbers";
import { capitalize } from "@/utils/text";

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
  memberPoolWeight,
  executeDisabled,
  tooltipMessage,
  strategy,
  alloInfo,
  tokenData,
  inputHandler,
  triggerRenderProposals,
}: ProposalCardProps) {
  const { title, id, proposalNumber, proposalStatus, requestedAmount, type } =
    proposalData;
  const pathname = usePathname();

  const searchParams = useCollectQueryParams();
  // TODO: ADD border color when new proposal is added
  const isNewProposal = searchParams[QUERY_PARAMS.poolPage.newPropsoal] == proposalData.proposalNumber;

  const { publish } = usePubSubContext();
  const chainId = useChainIdFromPath();

  const { currentConvictionPct, thresholdPct, totalSupportPct } = useConvictionRead({
    proposalData,
    tokenData,
  });

  const calcPoolWeightUsed = (number: number) => {
    return memberPoolWeight == 0 ? 0 : (
      ((number / 100) * memberPoolWeight).toFixed(2)
    );
  };

  //encode proposal id to pass as argument to distribute function
  const encodedDataProposalId = (proposalId: number) => {
    const encodedProposalId = encodeAbiParameters(
      [{ name: "proposalId", type: "uint" }],
      [BigInt(proposalId)],
    );

    return encodedProposalId;
  };

  //executing proposal distribute function / alert error if not executable / notification if success
  const {
    write: writeDistribute,
    error: errorDistribute,
    isError: isErrorDistribute,
  } = useContractWriteWithConfirmations({
    address: alloInfo.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "distribute",
    contractName: "Allo",
    fallbackErrorMessage: "Error executing proposal. Please try again.",
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "distribute",
        id,
        containerId: strategy.poolId,
        chainId,
      });
      triggerRenderProposals();
    },
  });

  const distributeErrorName = useErrorDetails(errorDistribute);
  useEffect(() => {
    if (isErrorDistribute && distributeErrorName.errorName !== undefined) {
      toast.error("NOT EXECUTABLE:" + "  " + distributeErrorName.errorName);
    }
  }, [isErrorDistribute]);

  const inputValue = calculatePercentage(
    inputData.value,
    memberActivatedPoints,
  );

  const allocatedInProposal = calculatePercentage(stakedFilter?.value, memberActivatedPoints);

  console.log();

  const isSiganlingType = poolTypes[type] === "signaling";

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
              <h4 className="truncate">{capitalize(title)}</h4>
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
                {stakedFilter?.value > 0 ? (<p className="text-primary-content text-xs flex items-center justify-center
                  // TODO: calculate data when fetching ok from subgrpah
                gap-1">You allocate <span className="font-medium text-2xl">
                    {`${allocatedInProposal.toString()}%`}</span> pool weight</p>) : ( <p className="text-xs text-neutral-soft-content text-center">You have not allocate yet</p>)}
              </div>
              <div className="col-span-3 self-center flex flex-col gap-2">
                {currentConvictionPct != null && thresholdPct != null && totalSupportPct != null &&
                  <div className="h-4">
                    <ConvictionBarChart compact currentConvictionPct={currentConvictionPct} thresholdPct={isSiganlingType ? 0 : thresholdPct} proposalSupportPct={totalSupportPct} isSignalingType={isSiganlingType} proposalId={proposalNumber} />
                  </div>
                }
                {/* <div className="z-50">
                  <Button onClick={() => writeDistribute?.()}>Execute</Button>
                </div> */}
                {!isSiganlingType && (
                  <div className="flex items-baseline gap-1">

                    <p className="text-xs text-neutral-soft-content">Requested amount: </p>
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
                      className={"range range-md min-w-[460px] cursor-pointer bg-neutral-soft [--range-shdw:var(--color-green-500)]"}
                      step={memberActivatedPoints / 100}
                      onChange={(e) => inputHandler(index, Number(e.target.value))}
                    />
                    <div className="flex w-full justify-between px-2.5">
                      {[...Array(21)].map((_, i) => (
                        <span className="text-[8px]" key={"span_" + i}>
                          |
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mb-2">
                    {Number(inputValue) > 0 ? (
                      <>
                        <p className="flex items-center gap-2 text-primary-content">
                          Total allocated{" "}
                          <span className="font-chakra text-2xl font-semibold">
                            {inputValue}{" "}
                          </span>
                          %
                        </p>
                      </>
                    ) : (
                      <p className="text-neutral-soft-content">No allocation</p>
                    )}
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
      {isAllocationView ? (
        <ProposalCardContent isAllocationMode />
      ) : (

        <Card href={`${pathname}/${id}`} className={`py-4 ${isNewProposal ? "!border-accent !border-2" : ""}`}>
          <ProposalCardContent />
        </Card>
      )}
    </>
  );
}
