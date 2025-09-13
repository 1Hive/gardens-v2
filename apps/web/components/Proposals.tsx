/* eslint-disable jsx-a11y/click-events-have-key-events */
"use client";

import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { Id, toast } from "react-toastify";
import { parseAbiParameters, encodeAbiParameters, formatUnits } from "viem";
import { Address, useAccount, useContractRead } from "wagmi";
import {
  Allo,
  CVProposal,
  getMemberStrategyDocument,
  getMemberStrategyQuery,
  isMemberDocument,
  isMemberQuery,
  CVStrategy,
  RegistryCommunity,
  getMembersStrategyQuery,
  getMembersStrategyDocument,
} from "#/subgraph/.graphclient";
import { LoadingSpinner } from "./LoadingSpinner";
import { PoolGovernanceProps } from "./PoolGovernance";
import { ProposalCardProps, ProposalHandle } from "./ProposalCard";
import TooltipIfOverflow from "./TooltipIfOverflow";
import {
  Button,
  CheckSybil,
  InfoWrapper,
  PoolGovernance,
  ProposalCard,
} from "@/components";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { SubscriptionId, usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import useCheckAllowList from "@/hooks/useCheckAllowList";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { alloABI, registryCommunityABI } from "@/src/generated";
import { PoolTypes, ProposalStatus } from "@/types";
import { useErrorDetails } from "@/utils/getErrorName";
import { bigIntMin, calculatePercentageBigInt } from "@/utils/numbers";

// Types
export type ProposalInputItem = {
  proposalId: string;
  proposalNumber: number;
  value: bigint;
};

export type MemberStrategyData = {
  activatedPoints: string;
  id: string;
  member?: {
    memberCommunity?: {
      isRegistered: boolean;
      memberAddress: string;
    };
  };
  totalStakedPoints: string;
};

// export type Strategy = getStrategyByPoolQuery["cvstrategies"][number];
// export type Proposal = CVStrategy["proposals"][number];
export type StakesMemberType = NonNullable<isMemberQuery["member"]>["stakes"];

export type ProposalTypeVoter = CVProposal & {
  title: string;
  type: number;
  beneficiary: Address;
};

type Stats = {
  id: number;
  name: string;
  stat: number | undefined;
  className: string;
  info: string;
};

interface ProposalsProps {
  strategy: Pick<
    CVStrategy,
    "id" | "poolId" | "totalEffectiveActivePoints" | "sybil" | "isEnabled"
  > & {
    registryCommunity: Pick<RegistryCommunity, "id"> & {
      garden: Pick<RegistryCommunity["garden"], "decimals">;
    };
    proposals: Array<
      Pick<CVProposal, "proposalNumber" | "proposalStatus"> &
        ProposalCardProps["proposalData"]
    >;
    config: ProposalCardProps["strategyConfig"];
    title: string | undefined;
  } & PoolGovernanceProps["strategy"];
  alloInfo: Allo;
  poolToken?: {
    address: Address;
    symbol: string;
    decimals: number;
    balance: bigint;
    formatted: string;
  };
  communityAddress: Address;
  createProposalUrl: string;
  proposalType: number;
  minThGtTotalEffPoints: boolean;
}

export function Proposals({
  strategy,
  alloInfo,
  poolToken,
  communityAddress,
  createProposalUrl,
  minThGtTotalEffPoints,
}: ProposalsProps) {
  // State
  const [allocationView, setAllocationView] = useState(false);
  const [inputAllocatedTokens, setInputAllocatedTokens] = useState<bigint>(0n);
  const [inputs, setInputs] = useState<{ [key: string]: ProposalInputItem }>(
    {},
  );
  const [stakedFilters, setStakedFilters] = useState<{
    [key: string]: ProposalInputItem;
  }>({});
  const [showManageSupportTooltip, setShowManageSupportTooltip] =
    useState(false);
  const proposalCardRefs = useRef<Map<string, ProposalHandle>>(new Map());

  // Hooks
  const { address: wallet } = useAccount();
  const { publish } = usePubSubContext();
  const chainId = useChainIdFromPath();
  const allowList = (strategy?.config?.allowlist as Address[]) ?? [];
  const isAllowed = useCheckAllowList(allowList, wallet);
  const { subscribe, unsubscribe, connected } = usePubSubContext();

  const tokenDecimals = strategy.registryCommunity.garden.decimals;
  const searchParams = useCollectQueryParams();

  const proposalSectionRef = useRef<HTMLDivElement>(null);

  const makeRef = useCallback(
    (id: string) => (inst: ProposalHandle | null) => {
      if (inst) proposalCardRefs.current.set(id, inst);
      else proposalCardRefs.current.delete(id); // cleanup on unmount
    },
    [],
  );

  // Queries
  const { data: memberData, error } = useSubgraphQuery<isMemberQuery>({
    query: isMemberDocument,
    variables: {
      me: wallet?.toLowerCase(),
      comm: strategy.registryCommunity.id.toLowerCase(),
    },
    changeScope: [
      {
        topic: "member",
        id: wallet,
        containerId: strategy.poolId,
      },
      {
        topic: "proposal",
        containerId: strategy.poolId,
        function: "allocate",
      },
    ],
    enabled: !!wallet,
  });

  const { data: memberStrategyData } = useSubgraphQuery<getMemberStrategyQuery>(
    {
      query: getMemberStrategyDocument,
      variables: {
        member_strategy: `${wallet?.toLowerCase()}-${strategy.id.toLowerCase()}`,
      },
      changeScope: [
        {
          topic: "proposal",
          containerId: strategy.poolId,
          type: "update",
        },
        { topic: "member", id: wallet, containerId: strategy.poolId },
      ],
      enabled: !!wallet,
    },
  );

  const { data: membersStrategyData } =
    useSubgraphQuery<getMembersStrategyQuery>({
      query: getMembersStrategyDocument,
      variables: {
        strategyId: `${strategy.id.toLowerCase()}`,
      },
      changeScope: [
        {
          topic: "proposal",
          containerId: strategy.poolId,
          type: "update",
        },
        { topic: "member", id: wallet, containerId: strategy.poolId },
      ],
      enabled: !!wallet,
    });

  const memberActivatedPoints: bigint = BigInt(
    memberStrategyData?.memberStrategy?.activatedPoints ?? 0,
  );

  // Contract reads
  const { data: memberPower, refetch: refetchMemberPower } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "getMemberPowerInStrategy",
    args: [wallet as Address, strategy.id as Address],
    chainId: chainId,
    enabled: !!wallet,
  });

  const subscritionId = useRef<SubscriptionId>();
  useEffect(() => {
    subscritionId.current = subscribe(
      {
        topic: "member",
        id: wallet,
        containerId: strategy.poolId,
        type: "update",
      },
      () => {
        return refetchMemberPower();
      },
    );
    return () => {
      if (subscritionId.current) {
        unsubscribe(subscritionId.current);
      }
    };
  }, [connected]);

  // Derived state
  const isMemberCommunity =
    !!memberData?.member?.memberCommunity?.[0]?.isRegistered;
  const memberActivatedStrategy =
    memberStrategyData?.memberStrategy?.activatedPoints > 0n;
  const memberTokensInCommunity = BigInt(
    memberData?.member?.memberCommunity?.[0]?.stakedTokens ?? 0,
  );

  const proposals = strategy.proposals.sort(
    (a, b) => b.stakedAmount - a.stakedAmount,
  );

  // Effects
  useEffect(() => {
    if (error) {
      console.error("Error while fetching member data: ", error);
    }
  }, [error]);

  useEffect(() => {
    const stakesFiltered =
      memberData?.member?.stakes
        ?.filter(
          (stake) =>
            stake.proposal.strategy.id.toLowerCase() ===
            strategy.id.toLowerCase(),
        )
        .map((x) => ({ ...x, amount: BigInt(x.amount) })) ?? [];

    const totalStaked = stakesFiltered.reduce(
      (acc, curr) => acc + curr.amount,
      0n,
    );

    const memberStakes: { [key: string]: ProposalInputItem } = {};
    stakesFiltered.forEach((item) => {
      memberStakes[item.proposal.id] = {
        proposalId: item.proposal.id,
        value: item.amount,
        proposalNumber: item.proposal.proposalNumber,
      };
    });

    setInputAllocatedTokens(totalStaked);
    setStakedFilters(memberStakes);
  }, [memberData?.member?.stakes, strategy.id]);

  useEffect(() => {
    if (memberActivatedStrategy === false) {
      setAllocationView(false);
    }
  }, [memberActivatedStrategy]);

  const disableManageSupportBtnCondition: ConditionObject[] = [
    {
      condition: !isMemberCommunity,
      message: "You need to join the community first",
    },
    {
      condition: !memberActivatedStrategy,
      message: "You need to activate your governance first",
    },
    {
      condition: !isAllowed,
      message: "Address not in allowlist",
    },
  ];

  const disableCreateProposalBtnCondition: ConditionObject[] = [
    {
      condition: !isMemberCommunity,
      message: "Join community first",
    },
  ];

  const disableManageSupportButton = disableManageSupportBtnCondition.some(
    (cond) => cond.condition,
  );

  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons(
    disableManageSupportBtnCondition,
  );

  const { tooltipMessage: createProposalTooltipMessage } = useDisableButtons(
    disableCreateProposalBtnCondition,
  );

  useEffect(() => {
    if (disableManageSupportButton) {
      // Used to dismiss the Manage support tooltip in case it was shown
      const handleClickOutside = () => {
        setShowManageSupportTooltip(false);
        document.removeEventListener("click", handleClickOutside);
      };
      document.addEventListener("click", handleClickOutside);

      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [disableManageSupportButton]);

  useEffect(() => {
    if (searchParams[QUERY_PARAMS.poolPage.allocationView] === "true") {
      if (!disableManageSupportButton && isConnected) {
        setAllocationView(true);
      } else {
        setShowManageSupportTooltip(true);
      }
    }
  }, [disableManageSupportButton, isConnected, searchParams]);

  useEffect(() => {
    if (
      searchParams[QUERY_PARAMS.poolPage.allocationView] !== undefined &&
      proposalSectionRef.current
    ) {
      const elementTop =
        proposalSectionRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementTop - 150,
        behavior: "smooth",
      });
    }
  }, [proposalSectionRef.current, searchParams]);

  useEffect(() => {
    if (proposals == null) return;

    const newInputs: { [key: string]: ProposalInputItem } = {};

    proposals.forEach(({ id, proposalNumber, proposalStatus }) => {
      const proposalEnded =
        ProposalStatus[proposalStatus] !== "active" &&
        ProposalStatus[proposalStatus] !== "disputed";
      newInputs[id] = {
        proposalId: id,
        value:
          !proposalEnded && stakedFilters[id] != null ?
            stakedFilters[id]?.value
          : 0n,
        proposalNumber,
      };
    });
    setInputs(newInputs);
  }, [proposals, stakedFilters]);

  const getProposalsInputsDifferences = (
    inputData: { [key: string]: ProposalInputItem },
    currentData: { [key: string]: ProposalInputItem },
  ) => {
    // log maximum stakable tokens
    return Object.values(inputData).reduce<
      { proposalId: bigint; deltaSupport: bigint }[]
    >((acc, input) => {
      const current = currentData[input.proposalId];
      const diff = BigInt(input.value) - BigInt(current?.value ?? 0);
      if (diff !== 0n) {
        acc.push({
          proposalId: BigInt(input.proposalNumber),
          deltaSupport: diff,
        });
      }
      return acc;
    }, []);
  };

  const calculateTotalTokens = (exceptProposalId?: string) => {
    if (!Object.keys(inputs).length) {
      console.error("Inputs not yet computed");
      return 0n;
    }
    return Object.values(inputs).reduce((acc, curr) => {
      if (
        exceptProposalId !== undefined &&
        exceptProposalId === curr.proposalId
      ) {
        return acc;
      } else {
        return acc + curr.value;
      }
    }, 0n);
  };

  const inputHandler = (proposalId: string, value: bigint) => {
    const currentPoints = calculateTotalTokens(proposalId);

    const maxAllowableValue = memberActivatedPoints - currentPoints;
    const minValue = (value = bigIntMin(value, maxAllowableValue));

    const input = inputs[proposalId];
    input.value = minValue;
    setInputs((prev) => ({ ...prev, [proposalId]: input }));
    setInputAllocatedTokens(currentPoints + minValue);
  };

  const toastId = useRef<Id | null>(null);

  // Contract interaction
  const {
    write: writeAllocate,
    error: errorAllocate,
    status: allocateStatus,
  } = useContractWriteWithConfirmations({
    address: alloInfo.id as Address,
    abi: alloABI,
    functionName: "allocate",
    contractName: "Allo",
    fallbackErrorMessage: "Error allocating points, please report a bug.",
    onSuccess: () => {
      setAllocationView(false);
    },
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        containerId: strategy.poolId,
        function: "allocate",
      });
      if (toastId.current != null) {
        toast.dismiss(toastId.current);
        toastId.current = null;
      }
    },
  });

  const submit = async () => {
    if (!Object.keys(inputs).length) {
      console.error("Inputs not yet computed");
      return;
    }

    const proposalsDifferencesArr = getProposalsInputsDifferences(
      inputs,
      stakedFilters,
    );
    const abiTypes = parseAbiParameters(
      "(uint256 proposalId, int256 deltaSupport)[]",
    );
    const encodedData = encodeAbiParameters(abiTypes, [
      proposalsDifferencesArr,
    ]);
    const poolId = Number(strategy.poolId);
    writeAllocate({
      args: [BigInt(poolId), encodedData],
    });
  };

  useErrorDetails(errorAllocate, "errorAllocate");

  // Computed values
  const memberSupportedProposalsPct = calculatePercentageBigInt(
    inputAllocatedTokens,
    memberActivatedPoints,
  );

  const memberPoolWeight =
    memberPower != null && +strategy.totalEffectiveActivePoints > 0 ?
      calculatePercentageBigInt(
        memberPower,
        BigInt(strategy.totalEffectiveActivePoints),
      )
    : undefined;

  const calcPoolWeightUsed =
    memberPoolWeight != null ?
      (number: number) => {
        if (memberPoolWeight == 0) return 0;
        return ((number / 100) * memberPoolWeight).toFixed(2);
      }
    : undefined;

  const poolWeightClassName = `${
    calcPoolWeightUsed?.(memberSupportedProposalsPct) === memberPoolWeight ?
      "bg-secondary-soft text-secondary-content"
    : "bg-primary-soft text-primary-content"
  }`;

  const stats: Stats[] = [
    {
      id: 1,
      name: "Your voting weight",
      stat: memberPoolWeight,
      className: poolWeightClassName,
      info: "Represents your voting power within the pool",
    },
    {
      id: 2,
      name: "Voting weight used",
      stat: memberSupportedProposalsPct,
      className: `${
        memberSupportedProposalsPct >= 100 ?
          "bg-secondary-content text-secondary-soft border-secondary-content"
        : "bg-primary-content text-primary-soft border-primary-content"
      }`,
      info: "Reflects the percentage of your pool weight supporting proposals.",
    },
  ];

  const endedProposals = proposals.filter(
    (x) =>
      ProposalStatus[x.proposalStatus] === "cancelled" ||
      ProposalStatus[x.proposalStatus] === "rejected" ||
      ProposalStatus[x.proposalStatus] === "executed",
  );

  const membersStrategies = membersStrategyData?.memberStrategies;

  const handleDownloadCVResults = () => {
    let headers = [
      "Proposal ID",
      "Proposal Name",
      "Support",
      "Support %",
      "Conviction",
      "Conviction %",
      "Threshold",
      "Recipient Address",
    ];

    // Create a record of proposal convictions with proposal ID as keys
    const proposalConvictionMap = Array.from(
      proposalCardRefs.current.entries(),
    ).reduce(
      (acc, [id, proposal]) => {
        acc[id] = proposal.getProposalConviction();
        return acc;
      },
      {} as Record<string, ReturnType<ProposalHandle["getProposalConviction"]>>,
    );

    const totalSupport = Object.values(proposalConvictionMap).reduce(
      (acc, proposal) => acc + proposal.support || 0,
      0,
    );

    const totalConviction = Object.values(proposalConvictionMap).reduce(
      (acc, proposal) => acc + proposal.conviction || 0n,
      0n,
    );

    let rows = activeOrDisputedProposals.map((proposal) => {
      const proposalNumber = proposal.proposalNumber;
      const proposalTitle = `"${proposal.metadata?.title.replace(/"/g, '""')}"`; // Escape quotes in title
      const beneficiary = proposal.beneficiary;
      const support = formatUnits(proposal.stakedAmount, tokenDecimals);
      const supportPercent =
        totalSupport > 0 ?
          ((proposalConvictionMap[proposal.id]?.support || 0) / totalSupport) *
            100 +
          "%"
        : "0%";
      const conviction = formatUnits(
        proposalConvictionMap[proposal.id]?.conviction || 0n,
        tokenDecimals,
      );
      const convictionPercent =
        calculatePercentageBigInt(
          proposalConvictionMap[proposal.id]?.conviction || 0n,
          totalConviction,
        ) + "%";
      const threshold = proposalConvictionMap[proposal.id]?.threshold || 0;
      return [
        proposalNumber,
        proposalTitle,
        support,
        supportPercent,
        conviction,
        convictionPercent,
        threshold,
        beneficiary,
      ];
    });

    // Remove last 2 column if pool is signaling
    if (PoolTypes[strategy.config.proposalType] === "signaling") {
      headers = headers.slice(0, -2);
      rows = rows.map((row) => row.slice(0, -2));
    }

    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fileName =
      strategy.title ?
        `conviction_results_pool_${strategy.title}.csv`
      : "conviction_results_pool.csv";
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeOrDisputedProposals = proposals.filter(
    (x) =>
      ProposalStatus[x.proposalStatus] === "active" ||
      ProposalStatus[x.proposalStatus] === "disputed",
  );

  // Render
  return (
    <>
      {/* Proposals section */}
      <section className="col-span-12 xl:col-span-9 flex flex-col gap-10">
        <header
          ref={proposalSectionRef}
          className={`flex ${proposals.length === 0 ? "flex-col items-start justify-start" : "items-center justify-between"} gap-10 flex-wrap`}
        >
          <h3 className="text-left w-52">Proposals</h3>
          {strategy.isEnabled &&
            (proposals.length === 0 ?
              <div className="text-center py-12  w-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-neutral-soft-2 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UsersIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h5 className="text-lg font-medium text-gray-900 mb-2">
                  No proposals yet
                </h5>
                <p className="text-neutral-content text-center mb-6">
                  Submit the first proposal to kickstart pool governance.
                </p>
                <Link href={createProposalUrl}>
                  <Button
                    btnStyle="outline"
                    icon={<PlusIcon height={24} width={24} />}
                    disabled={
                      !isConnected || missmatchUrl || !isMemberCommunity
                    }
                    tooltip={
                      !isConnected ? "Connect your wallet"
                      : !isMemberCommunity ?
                        "Join the community first"
                      : "Create a proposal"
                    }
                  >
                    Create a proposal
                  </Button>
                </Link>
              </div>
            : !allocationView && (
                <div className="flex items-center gap-4">
                  {activeOrDisputedProposals.length > 0 &&
                    proposalCardRefs.current.size ===
                      activeOrDisputedProposals.length && (
                      <Button
                        btnStyle="link"
                        color="primary"
                        tooltip="Download conviction results (CSV)"
                        forceShowTooltip={true}
                        icon={<ArrowDownTrayIcon className="w-6 h-6" />}
                        onClick={handleDownloadCVResults}
                      />
                    )}
                  <div onMouseLeave={() => setShowManageSupportTooltip(false)}>
                    <CheckSybil
                      strategy={strategy}
                      enableCheck={strategy.sybil?.type === "Passport"}
                    >
                      <Button
                        icon={
                          <AdjustmentsHorizontalIcon height={24} width={24} />
                        }
                        onClick={() => setAllocationView((prev) => !prev)}
                        popTooltip={showManageSupportTooltip}
                        disabled={
                          !isConnected ||
                          missmatchUrl ||
                          !memberActivatedStrategy ||
                          !isAllowed
                        }
                        tooltip={tooltipMessage}
                      >
                        Manage support
                      </Button>
                    </CheckSybil>
                  </div>
                </div>
              ))}
        </header>
        {allocationView && <UserAllocationStats stats={stats} />}

        <div className="flex flex-col gap-6">
          {inputs != null ?
            <>
              {activeOrDisputedProposals.map((proposalData) => (
                <Fragment key={proposalData.id}>
                  <ProposalCard
                    ref={makeRef(proposalData.id)}
                    proposalData={proposalData}
                    strategyConfig={strategy.config}
                    inputData={inputs[proposalData.id]}
                    stakedFilter={stakedFilters[proposalData.id]}
                    isAllocationView={allocationView}
                    memberActivatedPoints={memberActivatedPoints}
                    memberPoolWeight={memberPoolWeight}
                    executeDisabled={
                      proposalData.proposalStatus == 4 ||
                      !isConnected ||
                      missmatchUrl
                    }
                    poolToken={poolToken}
                    tokenDecimals={tokenDecimals}
                    alloInfo={alloInfo}
                    inputHandler={inputHandler}
                    communityToken={strategy.registryCommunity.garden}
                    isPoolEnabled={strategy.isEnabled}
                    minThGtTotalEffPoints={minThGtTotalEffPoints}
                  />
                </Fragment>
              ))}
              {!!endedProposals.length && (
                <div className="collapse collapse-arrow">
                  <input type="checkbox" />
                  <div className="collapse-title text-lg font-medium">
                    Click to show/hide ended proposals
                  </div>
                  <div className="collapse-content flex flex-col gap-6 px-0">
                    {endedProposals.map((proposalData) => (
                      <Fragment key={proposalData.proposalNumber}>
                        <ProposalCard
                          proposalData={proposalData}
                          strategyConfig={strategy.config}
                          inputData={inputs[proposalData.id]}
                          stakedFilter={stakedFilters[proposalData.id]}
                          isAllocationView={allocationView}
                          memberActivatedPoints={memberActivatedPoints}
                          memberPoolWeight={memberPoolWeight}
                          executeDisabled={
                            proposalData.proposalStatus == 4 ||
                            !isConnected ||
                            missmatchUrl
                          }
                          poolToken={poolToken}
                          tokenDecimals={tokenDecimals}
                          alloInfo={alloInfo}
                          inputHandler={inputHandler}
                          communityToken={strategy.registryCommunity.garden}
                          isPoolEnabled={strategy.isEnabled}
                          minThGtTotalEffPoints={minThGtTotalEffPoints}
                        />
                      </Fragment>
                    ))}
                  </div>
                </div>
              )}
            </>
          : <LoadingSpinner />}
        </div>

        {strategy.isEnabled && allocationView && proposals.length > 0 && (
          <>
            <div className="flex justify-end gap-4">
              <Button
                btnStyle="outline"
                color="danger"
                onClick={() => setAllocationView((prev) => !prev)}
              >
                Cancel
              </Button>
              <Button
                onClick={submit}
                isLoading={allocateStatus === "loading"}
                disabled={
                  inputs == null ||
                  !getProposalsInputsDifferences(inputs, stakedFilters).length
                }
                tooltip="Make changes in proposals support first"
              >
                Submit your support
              </Button>
            </div>
            <div>
              <div className="flex items-center justify-center gap-6">
                <Link href={createProposalUrl}>
                  <Button
                    icon={<PlusIcon height={24} width={24} />}
                    disabled={
                      !isConnected || missmatchUrl || !isMemberCommunity
                    }
                    tooltip={
                      !isConnected ? "Connect your wallet"
                      : !isMemberCommunity ?
                        "Join the community first"
                      : "Create a proposal"
                    }
                  >
                    Create a proposal
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
        {proposals.length > 0 && !allocationView && (
          <div className="flex items-center justify-center gap-6">
            <Link href={createProposalUrl}>
              <Button
                icon={<PlusIcon height={24} width={24} />}
                disabled={!isConnected || missmatchUrl || !isMemberCommunity}
                tooltip={createProposalTooltipMessage}
              >
                Create a proposal
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* Pool Governace */}
      {strategy.isEnabled && (
        <div className="col-span-12 xl:col-span-3">
          <div className="backdrop-blur-sm rounded-lg flex flex-col gap-2 sticky top-32">
            <PoolGovernance
              memberPoolWeight={memberPoolWeight}
              tokenDecimals={tokenDecimals}
              strategy={strategy}
              communityAddress={communityAddress}
              memberTokensInCommunity={memberTokensInCommunity}
              isMemberCommunity={isMemberCommunity}
              memberActivatedStrategy={memberActivatedStrategy}
              membersStrategyData={membersStrategies}
            />
          </div>
        </div>
      )}
    </>
  );
}

function UserAllocationStats({ stats }: { stats: Stats[] }) {
  return (
    <div className="mt-10">
      <h5>Support Overview</h5>
      <div className="mt-5 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-2">
        {stats.map((stat) => (
          <div key={`stat_${stat.id}`} className="section-layout flex gap-4">
            <div
              className={`radial-progress rounded-full border-4 border-neutral transition-all duration-300 ease-in-out ${stat.className}`}
              style={{
                // @ts-ignore
                "--value": stat.stat,
                "--size": "4.2rem",
                "--thickness": "0.35rem",
              }}
              role="progressbar"
            >
              <span className="text-xs dark:text-black">{stat.stat} %</span>
            </div>
            <div className="flex flex-col items-start justify-center">
              <InfoWrapper tooltip={stat.info}>
                <h5>
                  <TooltipIfOverflow>{stat.name}</TooltipIfOverflow>
                </h5>
              </InfoWrapper>
              <p className="text-2xl font-semibold text-right">{stat.stat} %</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
