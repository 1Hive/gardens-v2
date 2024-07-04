"use client";
import React, { useEffect } from "react";
import { Badge, Button, Card, Statistic } from "@/components";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProposalInputItem, ProposalTypeVoter } from "./Proposals";
import { Allo, CVStrategy } from "#/subgraph/.graphclient";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import useErrorDetails from "@/utils/getErrorName";
import {
  Address,
  useChainId,
  useContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { encodeAbiParameters, formatUnits } from "viem";
import { alloABI } from "@/src/generated";
import { toast } from "react-toastify";
import { calculatePercentage } from "@/utils/numbers";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { chainDataMap } from "@/configs/chainServer";
import { LightCVStrategy, poolTypes } from "@/types";
import { getProposals } from "@/actions/getProposals";
import { DisplayNumber } from "./DisplayNumber";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

type ProposalCard = {
  proposalData: NonNullable<Awaited<ReturnType<typeof getProposals>>>[0];
  inputData: ProposalInputItem;
  stakedFilter: ProposalInputItem;
  i: number;
  isEditView: boolean;
  tooltipMessage: string;
  memberActivatedPoints: number;
  memberPoolWeight: number;
  executeDisabled: boolean;
  strategy: LightCVStrategy;
  tokenDecimals: number;
  alloInfo: Allo;
  inputHandler: (i: number, value: number) => void;
  triggerRenderProposals: () => void;
};

export function ProposalCard({
  proposalData,
  inputData,
  stakedFilter,
  i,
  isEditView,
  tooltipMessage,
  memberActivatedPoints,
  memberPoolWeight,
  executeDisabled,
  strategy,
  tokenDecimals,
  alloInfo,
  inputHandler,
  triggerRenderProposals,
}: ProposalCard) {
  const { title, id, proposalNumber, proposalStatus, requestedAmount } =
    proposalData;
  const pathname = usePathname();

  const { publish } = usePubSubContext();
  const chainId = useChainId();

  const calcPoolWeightUsed = (number: number) => {
    return memberPoolWeight == 0
      ? 0
      : ((number / 100) * memberPoolWeight).toFixed(2);
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
    data: distributeData,
    write: writeDistribute,
    error: errorDistribute,
    isSuccess: isSuccessDistribute,
    isError: isErrorDistribute,
    status: distributeStatus,
  } = useContractWrite({
    address: alloInfo.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "distribute",
  });

  useWaitForTransaction({
    hash: distributeData?.hash,
    confirmations: chainDataMap[chainId].confirmations,
    onSuccess: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "distribute",
        id,
        containerId: strategy.poolId,
        chainId,
      });
    },
  });

  const distributeErrorName = useErrorDetails(errorDistribute);
  useEffect(() => {
    if (isErrorDistribute && distributeErrorName.errorName !== undefined) {
      toast.error("NOT EXECUTABLE:" + "  " + distributeErrorName.errorName);
    }
  }, [isErrorDistribute]);

  const {
    updateTransactionStatus: updateDistributeTransactionStatus,
    txConfirmationHash: distributeTxConfirmationHash,
  } = useTransactionNotification(distributeData);

  useEffect(() => {
    updateDistributeTransactionStatus(distributeStatus);
  }, [distributeStatus]);

  useEffect(() => {
    triggerRenderProposals();
  }, [distributeTxConfirmationHash]);

  const ProposalCardContent = ({
    isAllocationMode,
  }: {
    isAllocationMode?: boolean;
  }) => {
    return (
      <>
        <div
          className={`flex items-center justify-between gap-3 ${isAllocationMode && "section-layout flex flex-col px-6 py-4"}`}
        >
          <div className="flex w-full flex-1 justify-between gap-8">
            <div
              className={`flex items-center gap-1 ${isAllocationMode ? "flex-1" : "max-w-60"}`}
            >
              <div className="overflow-hidden truncate">
                <h4 className="truncate">{title}</h4>
                <h6 className="text-sm">ID {proposalNumber}</h6>
              </div>
            </div>
            <div
              className={`flex flex-1 items-center ${isAllocationMode ? "justify-end" : "justify-between"}`}
            >
              <Badge status={proposalStatus} />
              {!isAllocationMode && (
                <>
                  <Statistic
                    label={"requested amount"}
                    icon={<InformationCircleIcon />}
                    count={formatUnits(requestedAmount, 18)}
                  ></Statistic>
                  {stakedFilter?.value > 0 ? (
                    <div className=" flex flex-col items-center">
                      <div className="stat-title">Your allocation</div>
                      <div className="stat-value text-lg text-tertiary-content">
                        {" "}
                        {calcPoolWeightUsed(
                          calculatePercentage(
                            inputData?.value ?? 0,
                            memberActivatedPoints,
                          ),
                        )}{" "}
                        %
                      </div>
                      <div className="stat-desc">
                        {" "}
                        {Number(
                          (inputData?.value * 100) / memberActivatedPoints,
                        ).toFixed(2)}{" "}
                        % of you gorvernance weight
                      </div>
                    </div>
                  ) : (
                    <p className=" max-w-[150px] text-center text-sm text-neutral-soft-content">
                      You have not allocate pool weight yet
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {isEditView && (
            <div className=" flex w-full flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-8">
                <div>
                  <input
                    type="range"
                    min={0}
                    max={memberActivatedPoints}
                    value={inputData?.value ?? 0}
                    className={`range range-md min-w-[460px] cursor-pointer bg-neutral-soft [--range-shdw:#65AD18]`}
                    step={memberActivatedPoints / 100}
                    onChange={(e) => inputHandler(i, Number(e.target.value))}
                  />
                  <div className="flex w-full justify-between px-[10px]">
                    {[...Array(21)].map((_, i) => (
                      <span className="text-[8px]" key={"span_" + i}>
                        |
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mb-2">
                  <p className="text-xl font-semibold">
                    {Number(
                      (inputData?.value * 100) / memberActivatedPoints,
                    ).toFixed(2)}
                    %
                  </p>
                </div>
              </div>
              {/* <div className="flex max-w-sm flex-1 items-baseline justify-center gap-2 px-8">
                {inputData?.value < stakedFilter?.value ? (
                  <p className="text-center">
                    Removing to
                    <span className="px-2 py-1 text-xl font-semibold text-info">
                      {calcPoolWeightUsed(
                        calculatePercentage(
                          inputData?.value ?? 0,
                          memberActivatedPoints,
                        ),
                      )}
                    </span>
                    % of pool weight
                  </p>
                ) : (
                  <p className="text-center">
                    Assigning
                    <span className="px-2 py-2 text-2xl font-semibold text-info">
                      {calcPoolWeightUsed(
                        calculatePercentage(
                          inputData?.value ?? 0,
                          memberActivatedPoints,
                        ),
                      )}
                    </span>
                    % of pool weight
                  </p>
                )}
              </div> */}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      {isEditView ? (
        <ProposalCardContent isAllocationMode />
      ) : (
        <Card href={`${pathname}/proposals/${id}`} className="py-4">
          <ProposalCardContent />
        </Card>
      )}
    </>
  );
}

// <div
//   className="bg-surface flex flex-col items-center justify-center gap-4 rounded-lg p-8"
//   key={title + "_" + proposalNumber}
// >
// </div>
