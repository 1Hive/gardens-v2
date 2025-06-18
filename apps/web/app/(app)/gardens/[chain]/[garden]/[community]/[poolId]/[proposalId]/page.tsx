"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
  UserIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Address, encodeAbiParameters, formatUnits } from "viem";
import { useAccount, useToken } from "wagmi";
import {
  getProposalDataDocument,
  getProposalDataQuery,
  getProposalSupportersQuery,
  getProposalSupportersDocument,
  isMemberDocument,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import {
  Badge,
  Button,
  DisplayNumber,
  EthAddress,
  InfoBox,
  Statistic,
  DataTable,
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
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { alloABI } from "@/src/generated";
import { PoolTypes, ProposalStatus, Column } from "@/types";

import { useErrorDetails } from "@/utils/getErrorName";
import { calculatePercentageBigInt } from "@/utils/numbers";
import { prettyTimestamp } from "@/utils/text";

type ProposalSupporter = {
  id: string;
  stakes: { amount: number }[];
};
type SupporterColumn = Column<ProposalSupporter>;

export default function Page({
  params: { proposalId, garden, community: communityAddr, poolId },
}: {
  params: {
    proposalId: string;
    community: string;
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
      communityId: communityAddr.toLowerCase(),
    },
    changeScope: {
      topic: "proposal",
      containerId: poolId,
      id: proposalNumber,
      type: "update",
    },
  });

  //query to get proposal supporters
  const { data: supportersData } = useSubgraphQuery<getProposalSupportersQuery>(
    {
      query: getProposalSupportersDocument,
      variables: {
        proposalId: proposalId.toLowerCase(),
      },
    },
  );

  //query to get member registry in community
  const { data: memberData } = useSubgraphQuery<isMemberQuery>({
    query: isMemberDocument,
    variables: {
      me: address?.toLowerCase(),
      comm: communityAddr?.toLowerCase(),
    },
    enabled: !!address,
  });

  const isMemberCommunity =
    !!memberData?.member?.memberCommunity?.[0]?.isRegistered;
  //

  const proposalData = data?.cvproposal;
  const proposalSupporters = supportersData?.members;

  const filteredAndSortedProposalSupporters: ProposalSupporter[] =
    proposalSupporters ?
      proposalSupporters
        .filter((item) => item.stakes && item.stakes.length > 0)
        .map((item) => ({
          id: item.id,
          stakes: item.stakes?.map((stake) => ({ amount: stake.amount })) ?? [],
        }))
        .sort((a, b) => {
          const maxStakeA = Math.max(
            ...(a.stakes ?? []).map((stake) => stake.amount),
          );
          const maxStakeB = Math.max(
            ...(b.stakes ?? []).map((stake) => stake.amount),
          );
          return maxStakeB - maxStakeA;
        })
    : [];
  const totalEffectiveActivePoints =
    proposalData?.strategy?.totalEffectiveActivePoints;

  //

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

  const disableManSupportBtn = useMemo<ConditionObject[]>(
    () => [
      {
        condition: !isMemberCommunity,
        message: "Join community to dispute",
      },
    ],
    [address],
  );

  const { tooltipMessage, isConnected, missmatchUrl } =
    useDisableButtons(disableManSupportBtn);

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
    !supportersData ||
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

  // const handleRefreshConviction = async (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   e.stopPropagation();
  //   setConvictionRefreshing(true);
  //   await triggerConvictionRefetch?.();
  //   setConvictionRefreshing(false);
  // };

  const status = ProposalStatus[proposalData.proposalStatus];
  return (
    <>
      <section className="col-span-12 lg:col-span-9">
        {/* Main Section */}
        <div
          className={`section-layout flex flex-col gap-8 ${status === "disputed" ? "!border-error-content" : ""} ${status === "executed" ? "!border-primary-content" : ""}`}
        >
          <div className="flex flex-col items-start gap-10 sm:flex-row">
            <div className="flex w-full flex-col gap-8">
              {/* Title - author - beneficairy - request - created - type */}
              <div>
                <header className="mb-4 flex flex-col items-start gap-4 sm:mb-2 ">
                  <div className=" flex items-center justify-between w-full gap-4 sm:gap-8">
                    <Skeleton isLoading={!metadata} className="!w-96 h-8">
                      <h2>{metadata?.title}</h2>
                    </Skeleton>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-md flex items-center bg-neutral-soft-2 rounded-md px-2 py-1 text-neutral-soft-content">
                          ID:{" "}
                          <span className="text-md ml-1 font-medium text-black">
                            {proposalIdNumber.toString()}
                          </span>
                        </p>
                      </div>

                      <Badge type={proposalType} />
                    </div>
                  </div>

                  <div className="w-full flex items-start justify-between">
                    <div className="flex flex-col gap-1 ">
                      <Statistic label={"Author"}>
                        <EthAddress
                          address={submitter}
                          actions="none"
                          textColor="var(--color-grey-900)"
                        />
                      </Statistic>
                      <Statistic label={"beneficiary"}>
                        <EthAddress
                          address={beneficiary}
                          actions="none"
                          textColor="var(--color-grey-900)"
                        />
                      </Statistic>
                    </div>

                    <div className="flex flex-col items-start justify-between gap-2">
                      <Statistic label={"Created"}>
                        <span className="text-black font-medium">
                          {prettyTimestamp(proposalData?.createdAt ?? 0)}
                        </span>
                      </Statistic>
                      {!isSignalingType && (
                        <>
                          <Statistic label={"request amount"} className="pt-2">
                            <DisplayNumber
                              number={formatUnits(
                                requestedAmount,
                                poolToken?.decimals ?? 18,
                              )}
                              tokenSymbol={poolToken?.symbol}
                              compact={true}
                              valueClassName="text-black font-medium"
                              symbolClassName="text-black font-medium"
                            />
                          </Statistic>
                        </>
                      )}
                    </div>
                  </div>
                </header>
              </div>

              {/* Conviction Progress */}
              {proposalData.strategy.isEnabled && (
                <div className="">
                  {status && status !== "active" && status !== "disputed" ?
                    <h4
                      className={`text-center ${status === "executed" ? "text-primary-content" : "text-error-content"}`}
                    >
                      {status === "executed" ?
                        "Proposal passed and executed successfully!"
                      : `Proposal has been ${status}.`}
                    </h4>
                  : <>
                      <div className="flex items-center justify-between">
                        <h4>Progress</h4>
                        {/* <Button
                          icon={
                            <AdjustmentsHorizontalIcon height={24} width={24} />
                          }
                          onClick={() => manageSupportClicked()}
                          disabled={
                            !isConnected || missmatchUrl || !isMemberCommunity
                          }
                          tooltip={tooltipMessage}
                        >
                          Manage support
                        </Button> */}
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        <ConvictionBarChart
                          currentConvictionPct={currentConvictionPct}
                          thresholdPct={thresholdPct}
                          proposalSupportPct={totalSupportPct}
                          isSignalingType={isSignalingType}
                          proposalNumber={Number(proposalIdNumber)}
                          timeToPass={Number(timeToPass)}
                          onReadyToExecute={triggerConvictionRefetch}
                          defaultChartMaxValue
                          proposalStatus={proposalStatus}
                        />
                        {/* <div className="flex justify-center lg:justify-end w-full  py-1">
                          {status === "active" && !isSignalingType && (
                            <Button
                              className="w-full"
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
                                currentConvictionPct <= thresholdPct ||
                                !isConnected ||
                                proposalStatus === "disputed"
                              }
                              tooltip={
                                (
                                  tooltipMessage ??
                                  currentConvictionPct <= thresholdPct
                                ) ?
                                  "Proposal has not reached the threshold yet"
                                : undefined
                              }
                            >
                              Execute
                            </Button>
                          )}
                        </div> */}
                      </div>
                    </>
                  }
                </div>
              )}
            </div>
          </div>
          {!proposalData.strategy.isEnabled && (
            <InfoBox infoBoxType="warning">The pool is not enabled.</InfoBox>
          )}
        </div>
      </section>

      {/* Right side */}
      <div className="col-span-12 lg:col-span-3">
        <div className="backdrop-blur-sm rounded-lg flex flex-col gap-4 sticky top-32">
          <section className="section-layout gap-4 flex flex-col">
            <h5>Status</h5>
            <Badge
              status={proposalData.proposalStatus}
              icon={
                <CheckCircleIcon className="w-5 h-5 text-primary-content" />
              }
            />
            <div className="flex items-end ">
              {isProposerConnected && proposalStatus === "active" ?
                <CancelButton proposalData={{ ...proposalData, ...metadata }} />
              : proposalData.strategy.isEnabled && (
                  <DisputeButton
                    isMemberCommunity={isMemberCommunity}
                    proposalData={{ ...proposalData, ...metadata }}
                  />
                )
              }
            </div>
          </section>

          {/* {filteredAndSortedProposalSupporters.length > 0 && (
            <section className="section-layout col-span-12 lg:col-span-3">
              <ProposalSupportersTable
                supporters={filteredAndSortedProposalSupporters}
                beneficiary={beneficiary}
                submitter={submitter}
                totalActivePoints={totalEffectiveActivePoints}
                totalStakedAmount={totalSupportPct}
              />
            </section>
          )} */}
        </div>
      </div>

      <section className="p-2 col-span-12 lg:col-span-9 mt-10 flex flex-col gap-4">
        <h4>Proposal Description</h4>
        <div>
          <Skeleton rows={5} isLoading={!metadata}>
            <MarkdownWrapper>
              {metadata?.description ?? "No description found"}
            </MarkdownWrapper>
          </Skeleton>
        </div>
      </section>
    </>
  );
}

const ProposalSupportersTable = ({
  supporters,
  beneficiary,
  submitter,
  totalActivePoints,
  totalStakedAmount,
}: {
  supporters: ProposalSupporter[];
  beneficiary: string | undefined;
  submitter: string | undefined;
  totalActivePoints: number;
  totalStakedAmount: number;
}) => {
  const columns: SupporterColumn[] = [
    {
      header: supporters.length > 1 ? "Supporters" : "Supporter",
      render: (supporter: ProposalSupporter) => (
        <EthAddress
          address={supporter.id as Address}
          actions="copy"
          shortenAddress={false}
          icon="ens"
        />
      ),
    },
    {
      header: "Role",
      render: (supporter: ProposalSupporter) =>
        supporter.id === beneficiary ? "Beneficiary"
        : supporter.id === submitter ? "Submitter"
        : "Member",
    },
    {
      header: "Support",
      render: (supporter: ProposalSupporter) =>
        totalActivePoints > 0 ?
          `${calculatePercentageBigInt(
            BigInt(supporter?.stakes[0]?.amount),
            BigInt(totalActivePoints),
          )} %`
        : undefined,
      className: "text-center",
    },
  ];

  return (
    <DataTable
      title="Supported By"
      description="A list of all the community members that are supporting this proposal."
      data={supporters}
      columns={columns}
      footer={
        //
        <div className="flex justify-between py-2 border-neutral-soft-content">
          <p className="subtitle">Total Support:</p>
          <p className="subtitle pr-0 sm:pr-14 lg:pr-16">
            {totalStakedAmount} %
          </p>
        </div>
      }
    />
  );
};
