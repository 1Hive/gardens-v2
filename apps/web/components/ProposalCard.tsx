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
import { Badge, Card } from "@/components";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { QUERY_PARAMS } from "@/constants/query-params";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useCollectQueryParams } from "@/hooks/useCollectQueryParams";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
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
  index,
  isAllocationView,
  tooltipMessage,
  memberActivatedPoints,
  memberPoolWeight,
  executeDisabled,
  strategy,
  alloInfo,
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

  {
    /* TODO: minor improve here: have this when loading the data?  */
  }
  if (!inputData) {
    return <div>loading...</div>;
  }

  const inputValue = calculatePercentage(
    inputData.value,
    memberActivatedPoints,
  );

  const isSiganlingType = poolTypes[type] === "signaling";

  const ProposalCardContent = ({
    isAllocationMode,
  }: {
    isAllocationMode?: boolean;
  }) => {
    return (
      <>
        <div
          className={`grid grid-cols-10 gap-8 ${isAllocationMode && "section-layout"}`}
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
                {/* TODO: what to inform here ?  */}
                <p className="text-xs text-neutral-soft-content text-center">You have not allocate support</p>
                {/* TODO: just for testing is new feature */}
                {/* <p>{isNewProposal ? "new" : "not new"}</p> */}
              </div>

              <div className="col-span-3 self-center flex flex-col gap-2">
                <div className="h-4">
                  <ConvictionBarChart compact currentConvictionPct={1} thresholdPct={isSiganlingType ? 0 : 6} proposalSupportPct={3} isSignalingType={isSiganlingType} proposalId={proposalNumber} />
                </div>
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
