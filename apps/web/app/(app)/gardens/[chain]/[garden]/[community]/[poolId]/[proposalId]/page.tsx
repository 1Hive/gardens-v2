"use client";
import { useEffect, useState } from "react";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { InformationCircleIcon, UserIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { Address, encodeAbiParameters, formatUnits } from "viem";
import {
  getProposalDataDocument,
  getProposalDataQuery,
} from "#/subgraph/.graphclient";
import {
  Badge,
  Button,
  DisplayNumber,
  EthAddress,
  Statistic,
} from "@/components";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useConvictionRead } from "@/hooks/useConvictionRead";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { alloABI } from "@/src/generated";
import { poolTypes, proposalStatus } from "@/types";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { useErrorDetails } from "@/utils/getErrorName";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import { logOnce } from "@/utils/log";

const prettyTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);

  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

export default function Page({
  params: { proposalId, garden, poolId },
}: {
  params: {
    proposalId: string;
    poolId: string;
    chain: string;
    garden: string;
  };
}) {
  const { data } = useSubgraphQuery<getProposalDataQuery>({
    query: getProposalDataDocument,
    variables: {
      garden: garden,
      proposalId: proposalId,
    },
    changeScope: {
      topic: "proposal",
      id: proposalId,
      type: "update",
    },
  });

  const proposalData = data?.cvproposal;

  const metadata = proposalData?.metadata;

  const proposalIdNumber = proposalData?.proposalNumber as number;

  const { publish } = usePubSubContext();
  const chainId = useChainIdFromPath();

  const [ipfsResult, setIpfsResult] =
    useState<Awaited<ReturnType<typeof getIpfsMetadata>>>();

  useEffect(() => {
    if (metadata) {
      getIpfsMetadata(metadata).then((d) => {
        setIpfsResult(d);
      });
    }
  }, [metadata]);

  const isProposalEnded =
    !!proposalData &&
    (proposalStatus[proposalData.proposalStatus] === "executed" ||
      proposalStatus[proposalData.proposalStatus] === "cancelled");
  logOnce("debug", {
    isProposalEnded,
    proposalStatus: proposalStatus[proposalData?.proposalStatus],
  });

  const {
    currentConvictionPct,
    thresholdPct,
    totalSupportPct,
    updateConvictionLast,
  } = useConvictionRead({
    proposalData,
    tokenData: data?.tokenGarden,
  });

  const tokenSymbol = data?.tokenGarden?.symbol;
  const proposalType = proposalData?.strategy.config?.proposalType;
  const requestedAmount = proposalData?.requestedAmount;
  const beneficiary = proposalData?.beneficiary as Address | undefined;
  const submitter = proposalData?.submitter as Address | undefined;
  const status = proposalData?.proposalStatus;

  const isSignalingType = poolTypes[proposalType] === "signaling";

  //encode proposal id to pass as argument to distribute function
  const encodedDataProposalId = (proposalId_: number) => {
    if (!proposalId_) {
      return;
    }
    const encodedProposalId = encodeAbiParameters(
      [{ name: "proposalId", type: "uint" }],
      [BigInt(proposalId_)],
    );
    return encodedProposalId;
  };

  //distribution function from Allo contract
  //args: poolId, strategyId, encoded proposalId
  const {
    write: writeDistribute,
    error: errorDistribute,
    isError: isErrorDistribute,
  } = useContractWriteWithConfirmations({
    address: data?.allos[0]?.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "distribute",
    contractName: "Allo",
    fallbackErrorMessage: "Error executing proposal. Please try again.",
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "distribute",
        id: proposalId,
        containerId: data?.cvproposal?.strategy?.id,
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

  if (
    !proposalData ||
    !ipfsResult ||
    currentConvictionPct == null ||
    thresholdPct == null ||
    totalSupportPct == null ||
    !proposalIdNumber ||
    (updateConvictionLast == null && !isProposalEnded)
  ) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page-layout">
      <header className="section-layout flex flex-col items-start gap-10 sm:flex-row">
        <div className="flex w-full items-center justify-center sm:w-auto">
          <Hashicon value={proposalId} size={90} />
        </div>
        <div className="flex w-full flex-col gap-8">
          <div>
            <div className="mb-4 flex flex-col items-start gap-4 sm:mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <h2>
                {ipfsResult?.title} #{proposalIdNumber}
              </h2>
              <Badge type={proposalType} />
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-start">
              <Badge status={status} />
              <p className="subtitle2">
                Submitted: {prettyTimestamp(proposalData?.createdAt ?? 0)}
              </p>
            </div>
          </div>
          <p>{ipfsResult?.description}</p>
          <div className="flex flex-col gap-2">
            {!isSignalingType && (
              <>
                <Statistic
                  label={"requested amount"}
                  icon={<InformationCircleIcon />}
                >
                  <DisplayNumber
                    number={formatUnits(requestedAmount, 18)}
                    tokenSymbol={tokenSymbol}
                    compact={true}
                    className="font-bold text-black"
                  />
                </Statistic>
                <Statistic label={"beneficiary"} icon={<UserIcon />}>
                  <EthAddress
                    address={beneficiary}
                    actions="copy"
                    icon={"identicon"}
                  />
                </Statistic>
              </>
            )}
            <Statistic label={"created by"} icon={<UserIcon />}>
              <EthAddress address={submitter} actions="copy" icon="identicon" />
            </Statistic>
          </div>
        </div>
      </header>
      <section className="section-layout">
        <h2>Metrics</h2>
        {/* TODO: need designs for this entire section */}
        {status && proposalStatus[status] === "executed" ?
          <div className="my-8 flex w-full justify-center">
            <div className="badge badge-success p-4 text-primary">
              Proposal passed and executed successfully
            </div>
          </div>
        : <ConvictionBarChart
            currentConvictionPct={currentConvictionPct}
            thresholdPct={thresholdPct}
            proposalSupportPct={totalSupportPct}
            isSignalingType={isSignalingType}
            proposalId={proposalIdNumber}
          />
        }
        <div className="absolute top-8 right-10">
          {proposalStatus[status] !== "executed" && !isSignalingType && (
            <Button
              onClick={() =>
                writeDistribute?.({
                  args: [
                    poolId,
                    [data.cvproposal?.strategy.id],
                    encodedDataProposalId(Number(proposalIdNumber)),
                  ],
                })
              }
              disabled={currentConvictionPct < thresholdPct}
              tooltip="Proposal not executable"
            >
              Execute
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
