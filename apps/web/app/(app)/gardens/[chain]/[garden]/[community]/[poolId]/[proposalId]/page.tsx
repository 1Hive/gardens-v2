"use client";
import { useEffect, useState } from "react";
import { Hashicon } from "@emeraldpay/hashicon-react";
import {
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Address, encodeAbiParameters, formatUnits } from "viem";
import { useAccount, useToken } from "wagmi";
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
import CancelButton from "@/components/CancelButton";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { DisputeButton } from "@/components/DisputeButton";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import MarkdownWrapper from "@/components/MarkdownWrapper";
import { Skeleton } from "@/components/Skeleton";
import { QUERY_PARAMS } from "@/constants/query-params";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useConvictionRead } from "@/hooks/useConvictionRead";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { alloABI } from "@/src/generated";
import { PoolTypes, ProposalStatus } from "@/types";

import { useErrorDetails } from "@/utils/getErrorName";
import { prettyTimestamp } from "@/utils/text";

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
  const [convictionRefreshing, setConvictionRefreshing] = useState(true);
  const router = useRouter();

  const { address } = useAccount();
  const [, proposalNumber] = proposalId.split("-");
  const { data } = useSubgraphQuery<getProposalDataQuery>({
    query: getProposalDataDocument,
    variables: {
      garden: garden.toLowerCase(),
      proposalId: proposalId.toLowerCase(),
    },
    changeScope: {
      topic: "proposal",
      containerId: poolId,
      id: proposalNumber,
      type: "update",
    },
  });

  const proposalData = data?.cvproposal;
  const proposalIdNumber =
    proposalData?.proposalNumber ?
      BigInt(proposalData.proposalNumber)
    : undefined;
  const poolTokenAddr = proposalData?.strategy.token as Address;

  const { publish } = usePubSubContext();
  const chainId = useChainIdFromPath();
  const { data: ipfsResult } = useMetadataIpfsFetch({
    hash: proposalData?.metadataHash,
    enabled: !proposalData?.metadata,
  });
  const path = usePathname();
  const metadata = proposalData?.metadata ?? ipfsResult;
  const isProposerConnected =
    proposalData?.submitter === address?.toLowerCase();

  const proposalType = proposalData?.strategy.config?.proposalType;
  const isSignalingType = PoolTypes[proposalType] === "signaling";
  const requestedAmount = proposalData?.requestedAmount;
  const beneficiary = proposalData?.beneficiary as Address | undefined;
  const submitter = proposalData?.submitter as Address | undefined;
  const proposalStatus = ProposalStatus[proposalData?.proposalStatus];

  const { data: poolToken } = useToken({
    address: poolTokenAddr,
    enabled: !!poolTokenAddr && !isSignalingType,
    chainId,
  });

  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons();

  const {
    currentConvictionPct,
    thresholdPct,
    totalSupportPct,
    updatedConviction,
    timeToPass,
    triggerConvictionRefetch,
  } = useConvictionRead({
    proposalData,
    strategyConfig: proposalData?.strategy?.config,
    tokenData: data?.tokenGarden?.decimals,
    enabled: proposalData?.proposalNumber != null,
  });

  useEffect(() => {
    if (convictionRefreshing && currentConvictionPct != null) {
      setConvictionRefreshing(false);
    }
  }, [convictionRefreshing, currentConvictionPct]);

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
    abi: alloABI,
    functionName: "distribute",
    contractName: "Allo",
    fallbackErrorMessage: "Error executing proposal, please report a bug.",
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "distribute",
        id: proposalNumber,
        containerId: poolId,
        chainId,
      });
    },
  });

  const manageSupportClicked = () => {
    const pathSegments = path.split("/");
    pathSegments.pop();
    if (pathSegments.length === 3) {
      pathSegments.pop();
    }
    const newPath = pathSegments.join("/");
    router.push(newPath + `?${QUERY_PARAMS.poolPage.allocationView}=true`);
  };
  const distributeErrorName = useErrorDetails(errorDistribute);
  useEffect(() => {
    if (isErrorDistribute && distributeErrorName.errorName !== undefined) {
      toast.error("NOT EXECUTABLE:" + "  " + distributeErrorName.errorName);
    }
  }, [isErrorDistribute]);

  if (
    !proposalData ||
    !metadata ||
    proposalIdNumber == null ||
    updatedConviction == null
  ) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  const handleRefreshConviction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConvictionRefreshing(true);
    await triggerConvictionRefetch?.();
    setConvictionRefreshing(false);
  };

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
                <Skeleton isLoading={!metadata} className="!w-96 h-8">
                  <h2>
                    {metadata?.title} #{proposalIdNumber.toString()}
                  </h2>
                </Skeleton>
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
            <div>
              <Skeleton rows={5} isLoading={!metadata}>
                <MarkdownWrapper>
                  {metadata?.description ?? "No description found"}
                </MarkdownWrapper>
              </Skeleton>
            </div>
            <div className="flex justify-between flex-wrap gap-2">
              <div className="flex flex-col gap-2">
                {!isSignalingType && (
                  <>
                    <Statistic
                      label={"request amount"}
                      icon={<InformationCircleIcon />}
                    >
                      <DisplayNumber
                        number={formatUnits(requestedAmount, 18)}
                        tokenSymbol={poolToken?.symbol}
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
                {isProposerConnected && proposalStatus === "active" ?
                  <CancelButton
                    proposalData={{ ...proposalData, ...metadata }}
                  />
                : <DisputeButton
                    proposalData={{ ...proposalData, ...metadata }}
                  />
                }
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
            : `Proposal has been ${status}.`}
          </h4>
        : <>
            <div className="flex justify-between">
              <h2>Metrics</h2>
              <Button
                icon={<AdjustmentsHorizontalIcon height={24} width={24} />}
                onClick={() => manageSupportClicked()}
                disabled={!isConnected || missmatchUrl}
                tooltip={tooltipMessage}
              >
                Manage support
              </Button>
            </div>
            <ConvictionBarChart
              currentConvictionPct={currentConvictionPct}
              thresholdPct={thresholdPct}
              proposalSupportPct={totalSupportPct}
              isSignalingType={isSignalingType}
              proposalNumber={Number(proposalIdNumber)}
              timeToPass={Number(timeToPass)}
              onReadyToExecute={triggerConvictionRefetch}
              defaultChartMaxValue
            />
            <div className="flex justify-center w-full">
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
                  disabled={currentConvictionPct < thresholdPct || !isConnected}
                  tooltip={
                    tooltipMessage ?? currentConvictionPct < thresholdPct ?
                      "Proposal not executable"
                    : undefined
                  }
                >
                  Execute
                </Button>
              )}
            </div>
          </>
        }
      </section>
    </div>
  );
}
