"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Address } from "wagmi";
import { encodeAbiParameters } from "viem";
import { toast } from "react-toastify";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { ProposalInputItem } from "./Proposals";
import { Allo } from "#/subgraph/.graphclient";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import useErrorDetails from "@/utils/getErrorName";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { alloABI } from "@/src/generated";
import { calculatePercentage } from "@/utils/numbers";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { LightCVStrategy, poolTypes } from "@/types";
import { getProposals } from "@/actions/getProposals";
import useContractWriteWithConfirmations from "@/hooks/useContractWriteWithConfirmations";
import useChainIdFromPath from "@/hooks/useChainIdFromPath";

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
  alloInfo,
  inputHandler,
  triggerRenderProposals,
}: ProposalCard) {
  const { title, id, proposalNumber, proposalStatus } = proposalData;
  const pathname = usePathname();

  const { publish } = usePubSubContext();
  const chainId = useChainIdFromPath();

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
    transactionData: distributeTxData,
    write: writeDistribute,
    error: errorDistribute,
    isError: isErrorDistribute,
    status: distributeStatus,
  } = useContractWriteWithConfirmations({
    address: alloInfo.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "distribute",
    onConfirmations: () => {
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
  } = useTransactionNotification(distributeTxData);

  useEffect(() => {
    updateDistributeTransactionStatus(distributeStatus);
  }, [distributeStatus]);

  useEffect(() => {
    triggerRenderProposals();
  }, [distributeTxConfirmationHash]);

  return (
    <div
      className="bg-surface flex flex-col items-center justify-center gap-4 rounded-lg p-8"
      key={title + "_" + proposalNumber}
    >
      <div className="flex w-full items-center justify-between ">
        <div className="flex flex-[30%] flex-col items-baseline gap-2">
          <h4 className="text-xl font-bold">{title}</h4>
          <span className="text-md">ID {proposalNumber}</span>
        </div>

        <div className="flex items-center gap-8">
          <Badge status={proposalStatus} />
          {/* Button to test distribute */}
          {!isEditView && poolTypes[proposalData.type] == "funding" && (
            <Button
              // TODO: add flexible tooltip and func to check executability
              disabled={executeDisabled}
              tooltip={
                proposalStatus == 4
                  ? "Proposal already executed"
                  : tooltipMessage
              }
              onClick={() =>
                writeDistribute?.({
                  args: [
                    strategy.poolId,
                    [strategy.id],
                    encodedDataProposalId(proposalNumber),
                  ],
                })
              }
            >
              Execute proposal
            </Button>
          )}
          <>
            <Link href={`${pathname}/${id}`}>
              <Button btnStyle="outline">View Proposal</Button>
            </Link>
          </>
        </div>
      </div>
      {isEditView && (
        <div className="flex w-full flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <div>
              <input
                type="range"
                min={0}
                max={memberActivatedPoints}
                value={inputData?.value ?? 0}
                className={`range range-success range-sm min-w-[420px] cursor-pointer`}
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
          <div className="flex max-w-sm flex-1 items-baseline justify-center gap-2 px-8">
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
          </div>
        </div>
      )}
    </div>
  );
}
