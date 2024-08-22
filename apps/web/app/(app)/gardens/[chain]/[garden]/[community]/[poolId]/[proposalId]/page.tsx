"use client";
import { useEffect } from "react";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { InformationCircleIcon, UserIcon } from "@heroicons/react/24/outline";
import Markdown from "markdown-to-jsx";
import { toast } from "react-toastify";
import { Address, encodeAbiParameters, formatUnits } from "viem";
import { useAccount } from "wagmi";
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
  params: { proposalId, garden, poolId },
}: {
  params: {
    proposalId: string;
    poolId: string;
    chain: string;
    garden: string;
  };
}) {
  const { isDisconnected } = useAccount();
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
    proposalData?.proposalNumber ?
      BigInt(proposalData.proposalNumber)
    : undefined;

  const { publish } = usePubSubContext();
  const chainId = useChainIdFromPath();

  const { data: ipfsResult } = useProposalMetadataIpfsFetch({ hash: metadata });

  const {
    currentConvictionPct,
    thresholdPct,
    totalSupportPct,
    updateConvictionLast,
  } = useConvictionRead({
    proposalData,
    tokenData: data?.tokenGarden,
    enabled: proposalData?.proposalNumber != null,
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
    proposalIdNumber == null ||
    updateConvictionLast == null
  ) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  const status = ProposalStatus[proposalData.proposalStatus];

  return (
    <div className="page-layout">
      <header
        className={`section-layout flex flex-col gap-8 border ${status === "disputed" ? "!border-error-content" : ""} ${status === "executed" ? "!border-primary-content" : ""}`}
      >
        <div className="flex flex-col items-start gap-10 sm:flex-row">
          <div className="flex w-full items-center justify-center sm:w-auto">
            <Hashicon value={proposalId} size={90} />
          </div>
          <div className="flex w-full flex-col gap-8">
            <div>
              <div className="mb-4 flex flex-col items-start gap-4 sm:mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <h2>
                  {ipfsResult?.title} #{proposalIdNumber.toString()}
                </h2>
                <Badge type={proposalType} />
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-start">
                <Badge status={proposalData.proposalStatus} />
                <p className="">
                  Created:{" "}
                  <span className="font-semibold">
                    {prettyTimestamp(proposalData?.createdAt ?? 0)}
                  </span>
                </p>
              </div>
            </div>
            <Markdown
              options={{
                disableParsingRawHTML: true,
                overrides: {
                  h1: { props: { className: "text-2xl font-semibold my-3" } },
                  h2: { props: { className: "text-xl font-semibold my-2" } },
                  h3: { props: { className: "text-lg font-semibold my-1" } },
                  h4: { props: { className: "text-base font-semibold" } },
                  h5: { props: { className: "text-sm font-semibold" } },
                  h6: { props: { className: "text-xs font-semibold" } },
                },
              }}
            >
              {ipfsResult?.description ?? "No description found"}
            </Markdown>
            <div className="flex justify-between">
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
              <div className="flex items-end">
                <DisputeButton
                  proposalData={{ ...proposalData, ...ipfsResult }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>
      <section className="section-layout">
        {status && status !== "active" && status !== "disputed" ?
          <h4
            className={`text-center ${status === "executed" ? "text-primary-content" : "text-error-content"}`}
          >
            {status === "executed" ?
              "Proposal passed and executed successfully!"
            : `Proposal as been ${status}.`}
          </h4>
        : <>
            <div className="flex justify-between">
              <h2>Metrics</h2>
              {status === "active" && !isSignalingType && (
                <Button
                  onClick={() =>
                    writeDistribute?.({
                      args: [
                        BigInt(poolId),
                        [proposalData?.strategy.id as Address],
                        encodedDataProposalId(proposalIdNumber),
                      ],
                    })
                  }
                  disabled={
                    currentConvictionPct < thresholdPct || isDisconnected
                  }
                  tooltip={
                    isDisconnected ? "Connect wallet"
                    : currentConvictionPct < thresholdPct ?
                      "Proposal not executable"
                    : undefined
                  }
                >
                  Execute
                </Button>
              )}
            </div>
            <ConvictionBarChart
              currentConvictionPct={currentConvictionPct}
              thresholdPct={thresholdPct}
              proposalSupportPct={totalSupportPct}
              isSignalingType={isSignalingType}
              proposalId={Number(proposalIdNumber)}
            />
          </>
        }
        <div className="absolute top-8 right-10">
          {status === "active" && !isSignalingType && (
            <Button
              onClick={() =>
                writeDistribute?.({
                  args: [
                    BigInt(poolId),
                    [proposalData?.strategy.id as Address],
                    encodedDataProposalId(proposalIdNumber),
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
