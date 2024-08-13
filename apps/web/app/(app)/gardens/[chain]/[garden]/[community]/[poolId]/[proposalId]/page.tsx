"use client";
import { useEffect } from "react";
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
import { DisputeButton } from "@/components/DisputeButton";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useConvictionRead } from "@/hooks/useConvictionRead";
import { useProposalMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { alloABI } from "@/src/generated";
import { PoolTypes, ProposalStatus } from "@/types";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { useErrorDetails } from "@/utils/getErrorName";

const prettyTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);

  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

export default function Page({
  params: { proposalId, garden },
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
  const proposalIdNumber =
    !!proposalData ? BigInt(proposalData.proposalNumber) : undefined;

  const { publish } = usePubSubContext();
  const chainId = useChainIdFromPath();

  const { data: ipfsResult } = useProposalMetadataIpfsFetch({ hash: metadata });

  const status = proposalData?.proposalStatus;

  const isProposalEnded =
    !!proposalData &&
    (ProposalStatus[status] === "executed" ||
      ProposalStatus[status] === "cancelled");
  const isDisputed = ProposalStatus[status] === "disputed";

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
  const isSignalingType = PoolTypes[proposalType] === "signaling";

  //encode proposal id to pass as argument to distribute function
  const encodedDataProposalId = (proposalId_: bigint) => {
    const encodedProposalId = encodeAbiParameters(
      [{ name: "proposalId", type: "uint" }],
      [proposalId_],
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
    !proposalIdNumber ||
    updateConvictionLast == null
  ) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page-layout">
      <header className="section-layout flex flex-col gap-8">
        <div className="flex flex-col items-start gap-10 sm:flex-row">
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
                <p className="font-semibold">
                  {prettyTimestamp(proposalData?.createdAt ?? 0)}
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
                    <EthAddress address={beneficiary} actions="copy" />
                  </Statistic>
                </>
              )}
              <Statistic label={"created by"} icon={<UserIcon />}>
                <EthAddress address={submitter} actions="copy" />
              </Statistic>
            </div>
          </div>
        </div>
        <div className="w-full justify-end flex gap-4">
          {(ProposalStatus[proposalData.proposalStatus] === "active" ||
            ProposalStatus[proposalData.proposalStatus] === "disputed") && (
            <div className="flex w-full justify-end">
              <DisputeButton
                proposalData={{ ...proposalData, ...ipfsResult }}
              />
            </div>
          )}
          {ProposalStatus[status] !== "executed" && !isSignalingType && (
            <Button
              onClick={() => {
                if (!proposalIdNumber) {
                  toast.error("Error executing proposal. Please try again.");
                  console.error("ProposalIdNumber undefined");
                  return;
                }
                writeDistribute?.({
                  args: [[], encodedDataProposalId(proposalIdNumber), "0x0"],
                });
              }}
              disabled={
                !currentConvictionPct ||
                !thresholdPct ||
                currentConvictionPct < thresholdPct
              }
              tooltip="Proposal not executable"
            >
              Execute
            </Button>
          )}
        </div>
      </header>

      {!isDisputed && (
        <section className="section-layout">
          <h2>Metrics</h2>
          {/* TODO: need designs for this entire section */}
          {status && ProposalStatus[status] === "executed" ?
            <div className="my-8 flex w-full justify-center">
              <div className="badge badge-success p-4 text-primary">
                Proposal passed and executed successfully
              </div>
            </div>
          : <ConvictionBarChart
              currentConvictionPct={currentConvictionPct!}
              thresholdPct={thresholdPct!}
              proposalSupportPct={totalSupportPct!}
              isSignalingType={isSignalingType}
              proposalId={Number(proposalIdNumber)}
            />
          }
        </section>
      )}
    </div>
  );
}
