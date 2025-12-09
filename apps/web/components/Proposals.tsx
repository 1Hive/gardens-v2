/* eslint-disable jsx-a11y/click-events-have-key-events */
"use client";

import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  UsersIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  Battery50Icon,
  CurrencyDollarIcon,
  EllipsisVerticalIcon,
  EllipsisHorizontalCircleIcon,
  HandRaisedIcon,
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
import { ProposalsModalSupport } from "./ProposalsModalSupport";
import TooltipIfOverflow from "./TooltipIfOverflow";
import {
  Button,
  CheckSybil,
  InfoWrapper,
  Modal,
  ProposalCard,
} from "@/components";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { usePubSubContext } from "@/contexts/pubsub.context";
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

export type MemberStrategyData = getMembersStrategyQuery["memberStrategies"][0];

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
    title: string | undefined | null;
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
        { topic: "member", containerId: strategy.poolId },
      ],
      enabled: !!strategy.id,
    });

  const memberActivatedPoints: bigint = BigInt(
    memberStrategyData?.memberStrategy?.activatedPoints ?? 0,
  );

  // Contract reads
  const { data: memberPower } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "getMemberPowerInStrategy",
    args: [wallet as Address, strategy.id as Address],
    chainId: chainId,
    enabled: !!wallet,
  });

  // Derived state
  const isMemberCommunity =
    !!memberData?.member?.memberCommunity?.[0]?.isRegistered;
  const memberActivatedStrategy =
    memberStrategyData?.memberStrategy?.activatedPoints > 0n;

  const proposals = strategy.proposals.sort((a, b) => {
    const aConviction =
      proposalCardRefs.current.get(b.id)?.getProposalConviction()?.conviction ??
      0n;
    const bConviction =
      proposalCardRefs.current.get(a.id)?.getProposalConviction()?.conviction ??
      0n;
    return (
      aConviction < bConviction ? -1
      : aConviction > bConviction ? 1
      : 0
    );
  });

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

    const totalActiveStaked = stakesFiltered.reduce((acc, curr) => {
      const proposalStatus = ProposalStatus[curr.proposal.proposalStatus];
      const proposalEnded =
        proposalStatus !== "active" && proposalStatus !== "disputed";

      return proposalEnded ? acc : acc + curr.amount;
    }, 0n);

    const memberStakes: { [key: string]: ProposalInputItem } = {};
    stakesFiltered.forEach((item) => {
      memberStakes[item.proposal.id] = {
        proposalId: item.proposal.id,
        value: item.amount,
        proposalNumber: item.proposal.proposalNumber,
      };
    });

    if (process.env.NODE_ENV !== "production") {
      const supportSnapshot = stakesFiltered.map((stake) => ({
        proposalId: stake.proposal.id,
        proposalNumber: stake.proposal.proposalNumber,
        supportRaw: stake.amount.toString(),
        supportFormatted: formatUnits(stake.amount, tokenDecimals),
      }));
      console.info(
        "[Proposals][SupportSnapshot]",
        supportSnapshot.length ? supportSnapshot : (
          "No active support positions"
        ),
      );
    }

    setInputAllocatedTokens(totalActiveStaked);
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

  const disableManageSupportButton = disableManageSupportBtnCondition.some(
    (cond) => cond.condition,
  );

  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons(
    disableManageSupportBtnCondition,
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
    const initialActiveAllocation = Object.values(newInputs).reduce(
      (acc, input) => acc + input.value,
      0n,
    );

    setInputs(newInputs);
    setInputAllocatedTokens(initialActiveAllocation);
    if (process.env.NODE_ENV !== "production") {
      const snapshot = Object.values(newInputs).map((input) => ({
        proposalId: input.proposalId,
        proposalNumber: input.proposalNumber,
        initialValue: input.value.toString(),
        fromStake: stakedFilters[input.proposalId]?.value.toString() ?? "0",
        status:
          ProposalStatus[
            proposals.find((p) => p.id === input.proposalId)?.proposalStatus ??
              0
          ],
      }));
      console.info("[Proposals][InitialInputs]", snapshot);
    }
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
    if (process.env.NODE_ENV !== "production") {
      console.info("[Proposals][Allocate] Current inputs snapshot", {
        inputs: Object.values(inputs).map((input) => ({
          proposalId: input.proposalId,
          proposalNumber: input.proposalNumber,
          value: input.value.toString(),
        })),
        stakedFilters: Object.values(stakedFilters).map((stake) => ({
          proposalId: stake.proposalId,
          proposalNumber: stake.proposalNumber,
          value: stake.value.toString(),
        })),
        deltas: proposalsDifferencesArr.map((delta) => ({
          proposalId: delta.proposalId.toString(),
          deltaSupport: delta.deltaSupport.toString(),
        })),
      });
    }
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
      name: "Your voting power",
      stat: memberPoolWeight,
      className: poolWeightClassName,
      info: "Indicates the amount of voting power you hold within this pool.",
    },
    {
      id: 2,
      name: "Voting power used",
      stat: memberSupportedProposalsPct,
      className: `${
        memberSupportedProposalsPct >= 100 ?
          "bg-secondary-content text-secondary-soft border-secondary-content"
        : "bg-primary-content text-primary-soft border-primary-content"
      }`,
      info: "Shows the percentage of your voting power currently allocated to support proposals.",
    },
  ];

  // STATUS MAP — número → string para UI
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
      const proposalTitle = `"${
        proposal.metadata?.title?.replace(/"/g, '""') ?? "Untitled"
      }"`; // Escape quotes in title
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

  const STATUS_LABELS: Record<number, string> = {
    0: "inactive",
    1: "active",
    2: "paused",
    3: "cancelled",
    4: "executed",
    5: "disputed",
    6: "rejected",
  };

  const proposalsCountByStatus = {
    all: proposals.length,
    ...Object.values(STATUS_LABELS).reduce(
      (acc, statusName) => {
        acc[statusName] = proposals.filter(
          (p) => STATUS_LABELS[Number(p.proposalStatus)] === statusName,
        ).length;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };

  const {
    filter,
    setFilter,
    sortBy: sortBy,
    setSortBy: setSortBy,
    filtered: filteredAndSorted,
    loading,
  } = useProposalFilter(strategy.proposals);

  return (
    <>
      {/* Proposals section */}
      <section className="col-span-12 xl:col-span-9 flex flex-col gap-10">
        <header
          ref={proposalSectionRef}
          className={`flex gap-6 ${
            proposals.length === 0 ?
              "flex-col items-start justify-start"
            : "items-center justify-between"
          }`}
        >
          <div className="flex items-center">
            <h3 className="text-left">Proposals</h3>
            {activeOrDisputedProposals.length > 0 &&
              proposalCardRefs.current.size ===
                activeOrDisputedProposals.length && (
                <div className="dropdown dropdown-hover dropdown-start">
                  <Button
                    btnStyle="outline"
                    className="bg-none hover:bg-nuetral-content border-none hover:border-none  rotate-90"
                    icon={
                      <EllipsisHorizontalCircleIcon className="w-5 h-5 text-neutral-content" />
                    }
                  />

                  <div className="dropdown-content menu bg-primary flex flex-col items-center gap-2 rounded-box z-50 shadow w-[230px] ">
                    <>
                      <Button
                        btnStyle="link"
                        color="primary"
                        tooltip="Download proposals conviction results (CSV)"
                        forceShowTooltip={true}
                        icon={<ArrowDownTrayIcon className="w-6 h-6" />}
                        onClick={handleDownloadCVResults}
                      >
                        Download CV results
                      </Button>
                      <Link href={createProposalUrl}>
                        <Button
                          className="w-full"
                          btnStyle="filled"
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
                    </>
                  </div>
                </div>
              )}
          </div>

          {strategy.isEnabled &&
            (proposals.length === 0 ?
              <div className="section-layout text-center py-12  w-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <HandRaisedIcon className="w-8 h-8 text-neutral-soft-content" />
                </div>
                <h5 className="text-lg font-medium mb-2">No proposals yet</h5>
                <p className="text-neutral-content text-center mb-6">
                  Submit the first proposal to kickstart pool governance.
                </p>
                <Link href={createProposalUrl}>
                  <Button
                    btnStyle="filled"
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
                <>
                  <div className="flex items-center gap-4 ">
                    {/* Manage Support */}
                    <div
                      onMouseLeave={() => setShowManageSupportTooltip(false)}
                    >
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
                </>
              ))}
        </header>

        {strategy.isEnabled && proposals.length > 0 && (
          <ProposalFiltersUI
            filter={filter}
            setFilter={setFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            poolType={strategy?.config?.proposalType}
            counts={proposalsCountByStatus}
          />
        )}

        {loading ?
          <ProposalListLoading />
        : proposals.length !== 0 && filteredAndSorted.length === 0 ?
          <div className="section-layout flex flex-col items-center justify-center text-center">
            <p className="text-neutral-soft-content text-sm">
              There are no proposals matching this filter.
            </p>
          </div>
        : filteredAndSorted.map((proposalData) => (
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
          ))
        }

        {/* Modal Manage Support section */}
        {inputs != null ?
          <>
            <Modal
              isOpen={allocationView}
              onClose={() => setAllocationView(false)}
              size="extra-large"
              title="Manage Your Support"
            >
              <div className="flex flex-col gap-4">
                <UserAllocationStats stats={stats} />
                {activeOrDisputedProposals.map((proposalData) => (
                  <Fragment key={proposalData.id}>
                    <ProposalsModalSupport
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
                {strategy.isEnabled &&
                  allocationView &&
                  proposals.length > 0 && (
                    <>
                      <div className="flex justify-end gap-4">
                        <Button
                          onClick={submit}
                          isLoading={allocateStatus === "loading"}
                          disabled={
                            inputs == null ||
                            !getProposalsInputsDifferences(
                              inputs,
                              stakedFilters,
                            ).length
                          }
                          tooltip="Make changes in proposals support first"
                          tooltipSide="tooltip-left"
                        >
                          Submit your support
                        </Button>
                      </div>
                      <div />
                    </>
                  )}
              </div>
            </Modal>
          </>
        : <LoadingSpinner />}
      </section>
    </>
  );
}

export function useProposalFilter<
  T extends {
    proposalStatus: string | number;
    createdAt?: string | number;
    stakedAmount?: string | number;
    requestedAmount?: string | number;
    convictionLast?: string | number;
  },
>(proposals: T[]) {
  //
  // FILTER
  //
  type FilterType =
    | "all"
    | "active"
    | "cancelled"
    | "executed"
    | "disputed"
    | null;

  const [filter, setFilter] = useState<FilterType>("active");

  const [isPending, startTransition] = useTransition();

  const FILTER_STATUS: Record<Exclude<FilterType, null>, number> = {
    all: 0,
    active: 1,
    cancelled: 3,
    executed: 4,
    disputed: 5,
  };

  const filteredProposals = useMemo(() => {
    if (!filter || filter == "all") return proposals;

    const status = FILTER_STATUS[filter];
    return proposals.filter((p) => Number(p.proposalStatus) === status);
  }, [filter, proposals]);

  //
  // SORT
  //
  type SortType =
    | "newest"
    | "oldest"
    | "mostSupported"
    | "mostRequested"
    | "mostConviction"
    | null;

  const [sortBy, setSortBy] = useState<SortType>("mostConviction");

  const filteredAndSorted = useMemo(() => {
    if (!sortBy) return filteredProposals;

    const list = [...filteredProposals];

    switch (sortBy) {
      case "newest":
        return list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

      case "oldest":
        return list.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));

      case "mostSupported":
        return list.sort(
          (a, b) => Number(b.stakedAmount) - Number(a.stakedAmount),
        );

      case "mostRequested":
        return list.sort(
          (a, b) => Number(b.requestedAmount) - Number(a.requestedAmount),
        );

      case "mostConviction":
        return list;

      default:
        return list;
    }
  }, [filteredProposals, sortBy]);

  // Wrapped setters with loading state
  const setFilterWithLoading = (newFilter: FilterType) => {
    startTransition(() => {
      setFilter(newFilter);
    });
  };

  const setSortByWithLoading = (newSort: SortType) => {
    startTransition(() => {
      setSortBy(newSort);
    });
  };

  return {
    filter,
    setFilter: setFilterWithLoading,
    sortBy: sortBy,
    setSortBy: setSortByWithLoading,
    filtered: filteredAndSorted,
    loading: isPending,
  };
}

function ProposalFiltersUI({
  filter,
  setFilter,
  sortBy,
  setSortBy,
  poolType,
  counts,
}: {
  filter: string | null;
  setFilter: (v: any) => void;
  sortBy: string | null;
  setSortBy: (v: any) => void;
  poolType: number;
  counts: Record<string, number>;
}) {
  const FILTERS = ["all", "active", "disputed", "executed", "cancelled"];

  const SORT_OPTIONS = useMemo(() => {
    const options = [
      { key: "newest", label: "Newest first", icon: ArrowUpIcon },
      { key: "oldest", label: "Oldest first", icon: ArrowDownIcon },
      { key: "mostSupported", label: "Most Supported", icon: UsersIcon },
      { key: "mostConviction", label: "Most Conviction", icon: Battery50Icon },
      {
        key: "mostRequested",
        label: "Highest Requested Amount",
        icon: CurrencyDollarIcon,
      },
    ];

    // Remove "Requested Amount" option when poolType is a signlaing pool
    return +poolType === 0 ?
        options.filter((opt) => opt.key !== "mostRequested")
      : options;
  }, [poolType]);

  const currentSortOption = SORT_OPTIONS.find((o) => o.key === sortBy);
  const CurrentIcon = currentSortOption?.icon;

  return (
    <div className="flex flex-col lg:flex-row gap-3 justify-between bg-neutral py-2 px-4 rounded-2xl ">
      {/* FILTERS */}
      <div className="flex gap-2 sm:justify-between flex-wrap">
        {FILTERS.map((f) => (
          <Button
            // style={filter === f ? { cursor: "not-allowed" } : {}}
            onClick={() => setFilter(f)}
            color={filter === f ? "primary" : "disabled"}
            key={f}
          >
            <div className="flex items-baseline gap-1">
              <span className="capitalize text-sm font-semibold text-neutral-inverted-content">
                {f}
              </span>
              <span className="text-xs font-semibold text-neutral-inverted-content  ">
                ({counts[f] ?? 0})
              </span>
            </div>
          </Button>
        ))}
      </div>

      <div className="block sm:hidden w-full border-t border-border-neutral" />

      {/* SORT DROPDOWN */}
      <div className="flex justify-between items-center gap-1 ">
        <p className="text-sm text-neutral-soft-content">Sort by</p>
        <div className="dropdown dropdown-hover dropdown-start">
          <Button
            btnStyle="ghost"
            icon={CurrentIcon && <CurrentIcon className="w-4 h-4" />}
          >
            {currentSortOption?.label}
          </Button>
          <ul className="dropdown-content menu bg-primary rounded-box z-50 shadow w-[180px] sm:w-[210px]">
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon;

              return (
                <li
                  key={option.key}
                  onClick={() => setSortBy(option.key)}
                  className="cursor-pointer w-full flex justify-between items-start text-xs hover:bg-primary-soft dark:hover:bg-primary-content rounded-md"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ProposalListLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      {/* Spinner */}
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-neutral rounded-full" />
        <div className="absolute inset-0 border-4 border-primary-content border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

function UserAllocationStats({ stats }: { stats: Stats[] }) {
  return (
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
              <h4>
                <TooltipIfOverflow>{stat.name}</TooltipIfOverflow>
              </h4>
            </InfoWrapper>
            <p className="text-xl font-semibold text-right">{stat.stat} %</p>
          </div>
        </div>
      ))}
    </div>
  );
}
