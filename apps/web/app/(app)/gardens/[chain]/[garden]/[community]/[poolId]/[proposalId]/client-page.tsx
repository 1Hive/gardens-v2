"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  CheckIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { Address, encodeAbiParameters, formatUnits } from "viem";
import { useAccount } from "wagmi";
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
import { DisputeModal } from "@/components/DisputeModal";
import EditProposalButton from "@/components/EditProposalButton";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import MarkdownWrapper from "@/components/MarkdownWrapper";
import { Skeleton } from "@/components/Skeleton";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useConvictionRead } from "@/hooks/useConvictionRead";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { MetadataV1, useMetadataIpfsFetch } from "@/hooks/useIpfsFetch";
import { usePoolToken } from "@/hooks/usePoolToken";
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

export type ProposalPageParams = {
  proposalId: string;
  community: string;
  poolId: string;
  chain: string;
  garden: string;
};

export type ClientPageProps = {
  params: ProposalPageParams;
};

export default function ClientPage({ params }: ClientPageProps) {
  const { proposalId, garden, community: communityAddr, poolId } = params;
  const [convictionRefreshing, setConvictionRefreshing] = useState(true);
  const router = useRouter();

  const { address } = useAccount();
  const routerSearchParams = useSearchParams();
  const collectedParams = useCollectQueryParams();
  const [initialSearchParams] = useState<Record<string, string> | null>(() => {
    if (typeof window === "undefined") return null;
    return Object.fromEntries(new URLSearchParams(window.location.search));
  });

  const [, proposalNumber] = proposalId.split("-");
  const {
    data,
    fetching,
    refetch: refetchProposal,
  } = useSubgraphQuery<getProposalDataQuery>({
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

  type ProposalData = NonNullable<getProposalDataQuery["cvproposal"]>;
  const proposalData:
    | (ProposalData & {
        registryCommunity?: getProposalDataQuery["registryCommunity"];
      })
    | undefined =
    data?.cvproposal ?
      {
        ...data.cvproposal,
        registryCommunity: data?.registryCommunity,
      }
    : undefined;
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

  const poolTokenAddr = proposalData?.strategy?.token as Address;

  const { publish } = usePubSubContext();
  const chainId = useChainIdFromPath();
  const { data: ipfsResult } = useMetadataIpfsFetch({
    hash: proposalData?.metadataHash,
    enabled: !proposalData?.metadata,
  });
  const path = usePathname();
  const metadata = proposalData?.metadata ?? ipfsResult ?? null;
  const metadataForActions: MetadataV1 = (metadata ?? {
    title: undefined,
    description: undefined,
  }) as MetadataV1;
  const proposalDataForActions =
    proposalData ?
      {
        ...proposalData,
        ...metadataForActions,
        metadata: metadataForActions,
      }
    : undefined;
  const isProposerConnected =
    proposalData?.submitter === address?.toLowerCase();
  const pendingProposalParam =
    collectedParams[QUERY_PARAMS.proposalPage.pendingProposal] ??
    routerSearchParams.get(QUERY_PARAMS.proposalPage.pendingProposal) ??
    initialSearchParams?.[QUERY_PARAMS.proposalPage.pendingProposal] ??
    undefined;
  const pendingProposalTitleParam =
    collectedParams[QUERY_PARAMS.proposalPage.pendingProposalTitle] ??
    routerSearchParams.get(QUERY_PARAMS.proposalPage.pendingProposalTitle) ??
    initialSearchParams?.[QUERY_PARAMS.proposalPage.pendingProposalTitle] ??
    undefined;
  const pendingProposalTitle =
    pendingProposalTitleParam ?
      (() => {
        try {
          return decodeURIComponent(pendingProposalTitleParam);
        } catch (error) {
          console.warn("Unable to decode pending proposal title", {
            pendingProposalTitleParam,
            error,
          });
          return pendingProposalTitleParam;
        }
      })()
    : undefined;

  const isAwaitingProposal = !!pendingProposalParam && proposalData == null;

  useEffect(() => {
    if (fetching || !isAwaitingProposal) return;
    refetchProposal();
  }, [fetching, isAwaitingProposal]);

  const proposalType = proposalData?.strategy?.config?.proposalType;
  const isSignalingType = PoolTypes[proposalType] === "signaling";
  const requestedAmount = proposalData?.requestedAmount;
  const beneficiary = proposalData?.beneficiary as Address | undefined;
  const submitter = proposalData?.submitter as Address | undefined;
  const proposalStatus = ProposalStatus[proposalData?.proposalStatus];

  const poolToken = usePoolToken({
    poolAddress: proposalData?.strategy?.id,
    poolTokenAddr,
    enabled:
      !!poolTokenAddr && !!proposalData?.strategy?.id && !isSignalingType,
  });

  const {
    currentConvictionPct,
    thresholdPct,
    totalSupportPct,
    updatedConviction,
    timeToPass,
    triggerConvictionRefetch,
  } = useConvictionRead({
    proposalData: proposalData as getProposalDataQuery["cvproposal"],
    strategyConfig: proposalData?.strategy?.config,
    tokenData: data?.tokenGarden?.decimals,
    enabled: proposalData?.proposalNumber != null && proposalData != null,
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

  const disableManSupportBtn = useMemo<ConditionObject[]>(
    () => [
      {
        condition: !isMemberCommunity,
        message: "Join community to support",
      },
    ],
    [address],
  );

  const { tooltipMessage, isConnected, missmatchUrl } =
    useDisableButtons(disableManSupportBtn);

  const convictionPctLessThanSupport =
    thresholdPct != null &&
    currentConvictionPct != null &&
    currentConvictionPct <= thresholdPct;

  const disableExecuteButton = useMemo<ConditionObject[]>(
    () => [
      {
        condition: convictionPctLessThanSupport,
        message: "Proposal has not reached the threshold yet",
      },
      {
        condition: proposalStatus === "disputed",
        message: "Proposal is being disputed",
      },
    ],
    [
      address,
      thresholdPct,
      currentConvictionPct,
      convictionPctLessThanSupport,
      proposalStatus,
    ],
  );

  const { tooltipMessage: executeBtnTooltipMessage } =
    useDisableButtons(disableExecuteButton);

  if (isAwaitingProposal) {
    return (
      <div className="col-span-12 flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <InfoBox
          infoBoxType="info"
          title="Finalizing proposal creation"
          className="max-w-2xl"
        >
          {`Waiting for "${pendingProposalTitle ?? "newly created proposal"}" to be indexed...`}
        </InfoBox>
      </div>
    );
  }

  if (
    !proposalData ||
    !supportersData ||
    !metadata ||
    proposalIdNumber == null ||
    updatedConviction == null
  ) {
    return (
      <div className="col-span-12 flex min-h-[40vh] items-center justify-center">
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
      {/* main section */}
      <section className="col-span-12 xl:col-span-9">
        <div
          className={`section-layout flex flex-col gap-8  ${status === "disputed" ? "!border-error-content" : ""} ${status === "executed" ? "!border-primary-content" : ""}`}
        >
          <div className="flex flex-col items-start gap-10  sm:flex-row">
            <div className="flex w-full flex-col gap-6">
              {/* Title - author - beneficairy - request - created - type */}
              <header className="flex flex-col items-start gap-4">
                <div className=" flex items-center justify-between w-full gap-4 sm:gap-8">
                  <Skeleton isLoading={metadata == null} className="!w-96 h-8">
                    <h2>{metadata?.title}</h2>
                  </Skeleton>
                  <div className="flex items-center gap-2">
                    <Badge type={proposalType} />
                  </div>
                </div>

                <div className="w-full flex flex-col sm:flex-row items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 ">
                    <Statistic label={"Author"}>
                      <EthAddress
                        address={submitter}
                        actions="none"
                        textColor="var(--color-grey-900)"
                      />
                    </Statistic>
                    {!isSignalingType && (
                      <Statistic label={"beneficiary"}>
                        <EthAddress
                          address={beneficiary}
                          actions="none"
                          textColor="var(--color-grey-900)"
                        />
                      </Statistic>
                    )}
                  </div>

                  <div className="flex flex-col items-start justify-between gap-2">
                    <Statistic label={"Created"}>
                      <span className="font-medium dark:text-neutral-content">
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
                            valueClassName="font-medium dark:text-neutral-content"
                            symbolClassName="font-medium dark:text-neutral-content"
                          />
                        </Statistic>
                      </>
                    )}
                  </div>
                </div>
              </header>
              {/* Divider */}

              {/* Conviction Progress */}
              {proposalData.strategy?.isEnabled &&
                currentConvictionPct != null &&
                thresholdPct != null &&
                totalSupportPct != null && (
                  <div className="">
                    {(status === "active" || status === "disputed") && (
                      <div className="flex flex-col gap-2">
                        <div className="w-full h-[0.10px] bg-neutral-soft-content" />
                        <h4 className="mt-4">Progress</h4>
                        <div className="flex flex-col gap-2">
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
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          {!proposalData.strategy?.isEnabled && (
            <InfoBox infoBoxType="warning">The pool is not enabled.</InfoBox>
          )}

          {/* Action Buttons */}
          {status && status === "active" && (
            <div className="flex flex-col gap-2 -mt-2">
              <div className="w-full h-[0.10px] bg-neutral-soft-content" />
              <h6 className="mt-4 mb-2">Actions</h6>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                <Button
                  icon={<AdjustmentsHorizontalIcon height={18} width={18} />}
                  onClick={() => manageSupportClicked()}
                  disabled={!isConnected || missmatchUrl || !isMemberCommunity}
                  tooltip={tooltipMessage}
                  className="w-full"
                  btnStyle="outline"
                >
                  Go to manage support
                </Button>
                {!isSignalingType && (
                  <Button
                    icon={<BoltIcon height={18} width={18} />}
                    className="w-full"
                    onClick={() =>
                      writeDistribute?.({
                        args: [
                          BigInt(poolId),
                          [proposalData?.strategy?.id as Address],
                          encodedDataProposalId(proposalIdNumber),
                        ],
                      })
                    }
                    disabled={
                      !isConnected ||
                      missmatchUrl ||
                      convictionPctLessThanSupport ||
                      proposalStatus === "disputed"
                    }
                    tooltip={executeBtnTooltipMessage}
                  >
                    Execute
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Right side */}
      <div className="col-span-12 xl:col-span-3">
        <div className="backdrop-blur-sm rounded-lg flex flex-col gap-4 sticky top-32">
          <section className="section-layout gap-4 flex flex-col">
            <div className="flex items-center justify-between">
              <h5>Status</h5>
              <Badge status={proposalData.proposalStatus} />
            </div>
            <div>
              <div className="flex flex-col gap-2">
                {!isSignalingType && (
                  <>
                    {status === "executed" ?
                      <div className="flex items-center gap-2">
                        <CheckIcon className="w-5 h-5 text-primary-content" />
                        <p className="text-primary-content subtitle2">
                          Passed and Executed
                        </p>
                      </div>
                    : status === "cancelled" ?
                      <div className="flex items-center gap-2">
                        <XMarkIcon className="w-5 h-5 text-error-content" />
                        <p className="text-error-content subtitle2">
                          Cancelled
                        </p>
                      </div>
                    : null}
                  </>
                )}
                {status !== "executed" && status !== "cancelled" && (
                  <InfoBox
                    title="Information"
                    infoBoxType="info"
                    content={`${isSignalingType ? "This proposal is open and can be supported or disputed by the community. Only the proposal creator can cancel" : "This proposal is currently open. It will pass if nobody successfully challenges it and it receives enough support."}`}
                  />
                )}
              </div>
            </div>
            <div className="flex items-end">
              {(status === "active" || status === "disputed") &&
                proposalData.strategy?.isEnabled &&
                proposalDataForActions && (
                  <DisputeModal
                    isMemberCommunity={isMemberCommunity}
                    proposalData={proposalDataForActions}
                  />
                )}
            </div>
          </section>

          {isProposerConnected && proposalStatus === "active" && (
            <section className="section-layout gap-4 flex flex-col">
              <InfoBox
                infoBoxType="info"
                content="As the original author, you can edit or cancel this proposal."
                title="Actions"
              />
              {proposalDataForActions && (
                <>
                  <EditProposalButton
                    proposalData={proposalDataForActions}
                    poolToken={poolToken}
                  />
                  <CancelButton proposalData={proposalDataForActions} />
                </>
              )}
            </section>
          )}

          {filteredAndSortedProposalSupporters.length > 0 &&
            totalSupportPct != null && (
              <section className="xl:max-h-10">
                <ProposalSupportersTable
                  supporters={filteredAndSortedProposalSupporters}
                  beneficiary={beneficiary}
                  submitter={submitter}
                  totalActivePoints={totalEffectiveActivePoints}
                  totalStakedAmount={totalSupportPct}
                />
              </section>
            )}
        </div>
      </div>

      {/* Proposal Description */}
      <section className="px-8 col-span-12 xl:col-span-9 mt-6 flex flex-col gap-6">
        <h3>Proposal Description</h3>
        <div>
          <Skeleton rows={5} isLoading={!Boolean(metadata)}>
            <MarkdownWrapper source={metadata?.description} />
          </Skeleton>
        </div>
      </section>
    </>
  );
}

const ProposalSupportersTable = ({
  supporters,
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
          actions="none"
          shortenAddress={true}
          icon="ens"
          textColor="var(--color-grey-900)"
        />
      ),
    },
    // {
    //   header: "Role",
    //   render: (supporter: ProposalSupporter) =>
    //     supporter.id === beneficiary ? "Beneficiary"
    //     : supporter.id === submitter ? "Submitter"
    //     : "Member",
    // },
    {
      header: "",
      render: (supporter: ProposalSupporter) =>
        totalActivePoints > 0 ?
          `${calculatePercentageBigInt(
            BigInt(supporter?.stakes[0]?.amount),
            BigInt(totalActivePoints),
          )} %`
        : undefined,
      className: "flex items-center justify-center",
    },
  ];

  return (
    <DataTable
      // title="Supported By"
      // description="A list of all the community members that are supporting this proposal."
      data={supporters}
      columns={columns}
      footer={
        //
        <div className="flex justify-between">
          <p className="">Total Support:</p>
          <p className="">{totalStakedAmount} %</p>
        </div>
      }
      className="border1 rounded-lg bg-neutral p-2"
    />
  );
};
