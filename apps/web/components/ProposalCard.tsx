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
import { capitalize } from "@/utils/text";

type ProposalCard = {
  proposalData: NonNullable<Awaited<ReturnType<typeof getProposals>>>[0];
  inputData: ProposalInputItem;
  stakedFilter: ProposalInputItem;
  i: number;
  isAllocationView: boolean;
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
  isAllocationView,
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

  const inputValue = Number(
    (inputData?.value * 100) / memberActivatedPoints,
  ).toFixed(2);

  const ProposalCardContent = ({
    isAllocationMode,
  }: {
    isAllocationMode?: boolean;
  }) => {
    return (
      <>
        <div
          className={`grid grid-cols-10 gap-3 ${isAllocationMode && "section-layout"}`}
        >
          <div className={`col-span-3 ${isAllocationMode && "col-span-9"}`}>
            <h4 className="overflow-hidden truncate">{capitalize(title)}</h4>
            <h6 className="text-sm">ID {proposalNumber}</h6>
          </div>
          <Badge
            status={proposalStatus}
            classNames={`self-center justify-self-start ${isAllocationMode && "justify-self-end"}`}
          />
          {!isAllocationMode && (
            <>
              <div className="col-span-3 ml-10 self-center justify-self-start">
                <Statistic
                  label={"requested: "}
                  icon={<InformationCircleIcon />}
                  count={formatUnits(requestedAmount, 18)}
                ></Statistic>
              </div>
              <div className="border2 col-span-3 self-center">mini CVChart</div>
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
                      value={inputData?.value ?? 0}
                      className={`range range-md min-w-[460px] cursor-pointer bg-neutral-soft [--range-shdw:var(--color-green-500)]`}
                      step={memberActivatedPoints / 100}
                      onChange={(e) => inputHandler(i, Number(e.target.value))}
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
        <Card href={`${pathname}/proposals/${id}`} className="py-4">
          <ProposalCardContent />
        </Card>
      )}
    </>
  );
}
