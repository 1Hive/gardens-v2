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
  ChevronDownIcon,
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
} from "#/subgraph/.graphclient";
import { Divider } from "./Diivider";
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
  symbol: string;
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

  const memberActivatedPoints: bigint = BigInt(
    memberStrategyData?.memberStrategy?.activatedPoints ?? 0,
  );

  // Contract reads
  const { data: memberPower } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "memberPowerInStrategy",
    args: [wallet as Address, strategy.id as Address],
    chainId: chainId,
    enabled: !!wallet,
  });

  // Derived state
  const isMemberCommunity =
    !!memberData?.member?.memberCommunity?.[0]?.isRegistered;
  const memberActivatedStrategy =
    memberStrategyData?.memberStrategy?.activatedPoints > 0n;

  const [sortedProposals, setSortedProposals] = useState(strategy.proposals);

  useEffect(() => {
    const sorted = [...strategy.proposals].sort((a, b) => {
      const aConviction =
        proposalCardRefs.current.get(a.id)?.getProposalConviction()
          ?.conviction ?? 0n;

      const bConviction =
        proposalCardRefs.current.get(b.id)?.getProposalConviction()
          ?.conviction ?? 0n;

      return (
        aConviction < bConviction ? 1
        : aConviction > bConviction ? -1
        : 0
      );
    });

    setSortedProposals(sorted);
  }, [strategy.proposals]);

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
    if (sortedProposals == null) return;

    const newInputs: { [key: string]: ProposalInputItem } = {};

    sortedProposals.forEach(({ id, proposalNumber, proposalStatus }) => {
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
            sortedProposals.find((p) => p.id === input.proposalId)
              ?.proposalStatus ?? 0
          ],
      }));
      console.info("[Proposals][InitialInputs]", snapshot);
    }
  }, [sortedProposals, stakedFilters]);

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
      info: "Your total Voting Power (VP) in this pool, out of 100. VP represents how much support you can allocate to proposals.",
      symbol: "VP",
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
      info: "The percentage of your Voting Power currently allocated as support across proposals.",
      symbol: "%",
    },
  ];

  // STATUS MAP — número → string para UI
  const handleDownloadCVResults = () => {
    let headers = [
      "Proposal ID",
      "Proposal Name",
      "Support",
      "Support VP",
      "Conviction",
      "Conviction VP",
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

    let rows = activeOrDisputedProposals.map((p) => {
      const proposalNumber = p.proposalNumber;
      const proposalTitle = `"${
        p.metadata?.title?.replace(/"/g, '""') ?? "Untitled"
      }"`; // Escape quotes in title
      const beneficiary = p.beneficiary;
      const support = formatUnits(p.stakedAmount, tokenDecimals);
      const supportPercent =
        totalSupport > 0 ?
          ((proposalConvictionMap[p.id]?.support || 0) / totalSupport) * 100 +
          "VP"
        : "0 VP";
      const conviction = formatUnits(
        proposalConvictionMap[p.id]?.conviction || 0n,
        tokenDecimals,
      );
      const convictionPercent =
        calculatePercentageBigInt(
          proposalConvictionMap[p.id]?.conviction || 0n,
          totalConviction,
        ) + "VP";
      const threshold = proposalConvictionMap[p.id]?.threshold || 0;
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

  const activeOrDisputedProposals = sortedProposals.filter(
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
    all: sortedProposals.length,
    ...Object.values(STATUS_LABELS).reduce(
      (acc, statusName) => {
        acc[statusName] = sortedProposals.filter(
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
  } = useProposalFilter(sortedProposals);
  const selectedFilterTitle =
    filter == null || filter === "all" ?
      "All Proposals"
    : `${filter.charAt(0).toUpperCase()}${filter.slice(1)} Proposals`;

  return (
    <>
      {/* Proposals section */}
      <div className="flex flex-col gap-4 sm:gap-8 section-layout">
        <header
          ref={proposalSectionRef}
          className={`flex gap-6 ${
            sortedProposals.length === 0 ?
              "flex-col items-start justify-start"
            : "flex-col sm:flex-row items-center justify-between "
          }`}
        >
          <h3 className="text-left  w-full sm:w-auto">Proposals</h3>

          {strategy.isEnabled &&
            (strategy.proposals.length === 0 ?
              <div className="section-layout text-center py-12  w-full flex flex-col items-center justify-center !shadow-none">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <HandRaisedIcon className="w-6 h-5 sm:w-6 sm:h-6 text-neutral-soft-content" />
                </div>
                <h6 className="mb-4 text-neutral-soft-content">
                  No proposals yet
                </h6>
                <h6 className="text-neutral-soft-content text-center mb-4">
                  Submit the first proposal to kickstart pool governance.
                </h6>
                <Link href={createProposalUrl}>
                  <Button
                    btnStyle="filled"
                    icon={<PlusIcon height={24} width={24} />}
                    disabled={
                      !isConnected || missmatchUrl || !isMemberCommunity
                    }
                    tooltip={tooltipMessage}
                  >
                    Add New Proposal
                  </Button>
                </Link>
              </div>
            : !allocationView && (
                <>
                  <div className="flex w-full sm:w-auto flex-wrap sm:items-center justify-center gap-2 ">
                    {/* Manage Support */}
                    {activeOrDisputedProposals.length > 0 &&
                      proposalCardRefs.current.size ===
                        activeOrDisputedProposals.length && (
                        <Button
                          btnStyle="ghost"
                          color="primary"
                          tooltip="Download proposals conviction results (CSV)"
                          forceShowTooltip={true}
                          icon={<ArrowDownTrayIcon className="w-6 h-6" />}
                          onClick={handleDownloadCVResults}
                        >
                          Export
                        </Button>
                      )}

                    {strategy.isEnabled && (
                      <Link
                        href={createProposalUrl}
                        className="flex items-center justify-center w-full sm:w-auto"
                      >
                        <Button
                          btnStyle="filled"
                          icon={<PlusIcon height={24} width={24} />}
                          disabled={
                            !isConnected || missmatchUrl || !isMemberCommunity
                          }
                          tooltip={tooltipMessage}
                          className="!w-full sm:!w-auto"
                        >
                          Add New Proposal
                        </Button>
                      </Link>
                    )}

                    <div
                      onMouseLeave={() => setShowManageSupportTooltip(false)}
                      className=" w-full sm:w-auto"
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
                          Vote on Proposals
                        </Button>
                      </CheckSybil>
                    </div>
                  </div>
                </>
              ))}
        </header>

        <Divider className="sm:hidden" />

        {strategy.isEnabled && sortedProposals.length > 0 && (
          <ProposalFiltersUI
            filter={filter}
            setFilter={setFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            poolType={strategy?.config?.proposalType}
            counts={proposalsCountByStatus}
          />
        )}

        {sortedProposals.length !== 0 && filteredAndSorted.length === 0 ?
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-neutral-soft-content text-sm">
              There are no {filter && filter} proposals at the moment.
            </p>
          </div>
        : <>
            {strategy.proposals.length !== 0 && (
              <h6 className="text-left w-full pl-1 sm:-my-4 text-neutral-soft-content">
                {selectedFilterTitle}
              </h6>
            )}
            {filteredAndSorted.map((proposalData) => (
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
          </>
        }

        {/* Modal Manage Support section */}
        {inputs != null ?
          <>
            <Modal
              isOpen={allocationView}
              onClose={() => setAllocationView(false)}
              size="extra-large"
              title="Vote on Proposals"
            >
              <div className="flex flex-col gap-4">
                <UserAllocationStats stats={stats} />
                {activeOrDisputedProposals.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center my-4">
                    <p className="text-neutral-soft-content text-sm">
                      There are currently no active or disputed proposals to
                      vote.
                    </p>
                  </div>
                )}

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
                        proposalData.proposalStatus === 4 ||
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
                  sortedProposals.length > 0 &&
                  activeOrDisputedProposals.length !== 0 && (
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
                          Submit your vote
                        </Button>
                      </div>
                      <div />
                    </>
                  )}
              </div>
            </Modal>
          </>
        : <LoadingSpinner />}
      </div>
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
  const FILTERS = useMemo(() => {
    const allFilters = ["all", "active", "disputed", "executed", "cancelled"];

    // Remove "executed" filter when poolType is a signaling pool
    return +poolType === 0 ?
        allFilters.filter((f) => f !== "executed")
      : allFilters;
  }, [poolType]);

  const SORT_OPTIONS = useMemo(() => {
    const options = [
      { key: "newest", label: "Newest first", icon: ArrowUpIcon },
      { key: "oldest", label: "Oldest first", icon: ArrowDownIcon },
      { key: "mostSupported", label: "Most Supported", icon: UsersIcon },
      { key: "mostConviction", label: "Most Conviction", icon: Battery50Icon },
      {
        key: "mostRequested",
        label: "Highest Requested",
        icon: CurrencyDollarIcon,
      },
    ];

    // Remove "Requested Amount" option when poolType is a signaling pool
    return +poolType === 0 ?
        options.filter((opt) => opt.key !== "mostRequested")
      : options;
  }, [poolType]);

  // Rest of your code remains the same...;

  const currentSortOption = SORT_OPTIONS.find((o) => o.key === sortBy);
  const CurrentIcon = currentSortOption?.icon;
  const [isSortDropdownLocked, setIsSortDropdownLocked] = useState(false);
  const FILTER_BADGE_STYLES: Record<string, string> = {
    all: "bg-tertiary-soft text-tertiary-content dark:bg-tertiary-dark",
    active: "bg-primary-soft text-primary-content dark:bg-primary-soft-dark",
    disputed:
      "bg-secondary-soft dark:bg-secondary-soft-dark text-secondary-content",
    executed: "bg-tertiary-soft dark:bg-tertiary-dark text-tertiary-content",
    cancelled: "bg-danger-soft text-danger-content dark:bg-danger-soft-dark",
  };

  return (
    <div className="flex flex-col lg:flex-row justify-between bg-neutral rounded-2xl items-center gap-2 lg:gap-4">
      {/* FILTERS */}
      <div className="flex  gap-2 lg:gap-2 sm:justify-between flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 font-semibold border transition-all duration-150 ease-out ${
              filter === f ?
                `${FILTER_BADGE_STYLES[f]} border-transparent`
              : "bg-transparent border-neutral-soft-content/30 text-neutral-soft-content hover:border-neutral-soft-content hover:text-primary-content"
            }`}
          >
            <span className="capitalize text-sm sm:text-md">{f}</span>
            <span className="ml-1 opacity-80 text-xs sm:text-sm">
              ({counts[f] ?? 0})
            </span>
          </button>
        ))}
      </div>

      <Divider className="sm:hidden my-2 sm:my-0" />

      {/* SORT DROPDOWN */}
      <div className="w-full lg:w-fit flex justify-between items-center ">
        <div className="w-[70px]  flex items-start justify-center">
          <p className="text-sm text-neutral-soft-content mb-1 sm:mb-0">
            Sort by
          </p>
        </div>
        <div
          className="dropdown dropdown-hover dropdown-start w-full relative group"
          onMouseLeave={() => setIsSortDropdownLocked(false)}
        >
          <button
            tabIndex={0}
            type="button"
            className="text-primary-content text-sm flex gap-2 items-center w-full lg:w-[215px] px-3.5 py-2 bg-primary-soft dark:bg-primary rounded-lg"
          >
            {CurrentIcon && <CurrentIcon className="w-4 h-4" />}
            {currentSortOption?.label}
          </button>

          <ul
            className={`dropdown-content menu bg-primary rounded-md z-50 shadow w-full lg:w-[215px] ${isSortDropdownLocked ? "!invisible !opacity-0 !pointer-events-none" : ""}`}
          >
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon;

              return (
                <li
                  tabIndex={0}
                  key={option.key}
                  className="cursor-pointer flex justify-between items-start text-xs dark:hover:bg-hover-content rounded-md"
                >
                  <Button
                    btnStyle="ghost"
                    color="primary"
                    type="button"
                    className="!w-full !justify-start "
                    onClick={() => {
                      setSortBy(option.key);
                      setIsSortDropdownLocked(true);
                    }}
                  >
                    <span className="flex items-center gap-2 text-sm rounded-md">
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
          <ChevronDownIcon className="w-4 h-4 absolute top-[11px] right-3 lg:right-5 group-hover:rotate-180 transition-all duration-150 ease-in-out" />
        </div>
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
            <span className="text-xs dark:text-black">
              {stat.stat} {stat.symbol}
            </span>
          </div>
          <div className="flex flex-col items-start justify-center">
            <InfoWrapper tooltip={stat.info}>
              <h4>
                <TooltipIfOverflow>{stat.name}</TooltipIfOverflow>
              </h4>
            </InfoWrapper>
            <p className="text-xl font-semibold text-right">
              {stat.stat} {stat.symbol}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
