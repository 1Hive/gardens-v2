"use client";

import React, { useEffect, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { Address as AddressType, useAccount } from "wagmi";
import {
  Allo,
  CVProposal,
  getMemberStrategyDocument,
  getMemberStrategyQuery,
  isMemberDocument,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { LoadingSpinner } from "./LoadingSpinner";
import { getProposals } from "@/actions/getProposals";
import {
  Button,
  CheckPassport,
  PoolGovernance,
  ProposalCard,
} from "@/components";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { alloABI, cvStrategyABI } from "@/src/generated";
import { LightCVStrategy } from "@/types";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { encodeFunctionParams } from "@/utils/encodeFunctionParams";
import { useErrorDetails } from "@/utils/getErrorName";
import { calculatePercentage } from "@/utils/numbers";

// Types
type ProposalInputItem = {
  id: string;
  value: number;
};

type StakesMemberType = NonNullable<isMemberQuery["member"]>["stakes"];

type ProposalTypeVoter = CVProposal & {
  title: string;
  type: number;
};

type Stats = {
  id: number;
  name: string;
  stat: number | string;
  className: string;
};

interface ProposalsProps {
  strategy: LightCVStrategy;
  alloInfo: Allo;
  communityAddress: Address;
  createProposalUrl: string;
  proposalType: number;
}

export function Proposals({
  strategy,
  alloInfo,
  communityAddress,
  createProposalUrl,
}: ProposalsProps) {
  // State
  const [allocationView, setAllocationView] = useState(false);
  const [inputAllocatedTokens, setInputAllocatedTokens] = useState<number>(0);
  const [inputs, setInputs] = useState<ProposalInputItem[]>();
  const [proposals, setProposals] =
    useState<Awaited<ReturnType<typeof getProposals>>>();
  const [memberActivatedPoints, setMemberActivatedPoints] = useState<number>(0);
  const [stakedFilters, setStakedFilters] = useState<ProposalInputItem[]>([]);
  const [fetchingProposals, setFetchingProposals] = useState<
    boolean | undefined
  >();

  // Hooks
  const { address: wallet } = useAccount();
  const urlChainId = useChainIdFromPath();
  const { publish } = usePubSubContext();

  const tokenDecimals = strategy.registryCommunity.garden.decimals;

  // Queries
  const {
    data: memberData,
    error,
    refetch: refetchIsMemberQuery,
  } = useSubgraphQuery<isMemberQuery>({
    query: isMemberDocument,
    variables: {
      me: wallet?.toLowerCase(),
      comm: strategy.registryCommunity.id.toLowerCase(),
    },
    changeScope: {
      topic: "member",
      id: communityAddress,
      type: ["add", "delete"],
    },
    enabled: !!wallet,
  });

  const { data: memberStrategyData, refetch: refetchgetMemberStrategyQuery } =
    useSubgraphQuery<getMemberStrategyQuery>({
      query: getMemberStrategyDocument,
      variables: {
        member_strategy: `${wallet?.toLowerCase()}-${strategy.id.toLowerCase()}`,
      },
      changeScope: {
        topic: "proposal",
        id: strategy.id,
        type: "update",
      },
      enabled: !!wallet,
    });

  // Derived state
  const isMemberCommunity =
    !!memberData?.member?.memberCommunity?.[0]?.isRegistered;
  const memberActivatedStrategy =
    Number(memberStrategyData?.memberStrategy?.activatedPoints) > 0;

  // Effects
  useEffect(() => {
    if (error) {
      console.error("Error while fetching member data: ", error);
    }
  }, [error]);

  useEffect(() => {
    if (wallet) {
      refetchIsMemberQuery();
      refetchgetMemberStrategyQuery();
    }
  }, [wallet, refetchIsMemberQuery, refetchgetMemberStrategyQuery]);

  useEffect(() => {
    const stakesFiltered =
      memberData?.member?.stakes?.filter(
        (stake) =>
          stake.proposal.strategy.id.toLowerCase() ===
          strategy.id.toLowerCase(),
      ) ?? [];

    const totalStaked = stakesFiltered.reduce(
      (acc, curr) => acc + BigInt(curr.amount),
      0n,
    );

    const memberStakes: ProposalInputItem[] = stakesFiltered.map((item) => ({
      id: item.proposal.proposalNumber,
      value: Number(item.amount),
    }));

    setInputAllocatedTokens(Number(totalStaked));
    setStakedFilters(memberStakes);
  }, [memberData?.member, strategy.id]);

  useEffect(() => {
    setMemberActivatedPoints(
      Number(memberData?.member?.memberCommunity?.[0]?.stakedTokens ?? 0n),
    );
  }, [memberStrategyData, memberData?.member?.memberCommunity]);

  useEffect(() => {
    if (memberActivatedStrategy === false) {
      setAllocationView(false);
    }
  }, [memberActivatedStrategy]);

  useEffect(() => {
    if (wallet && !fetchingProposals) {
      triggerRenderProposals();
    }
  }, [wallet, strategy, fetchingProposals]);

  useEffect(() => {
    if (!proposals) return;

    const newInputs = proposals.map(({ proposalNumber }) => {
      const stakedFilter = stakedFilters.find(
        (item) => item.id === proposalNumber,
      );
      return { id: proposalNumber, value: stakedFilter?.value ?? 0 };
    });
    setInputs(newInputs);
  }, [proposals, stakedFilters]);

  // Functions
  const triggerRenderProposals = () => {
    if (fetchingProposals == null) {
      setFetchingProposals(true);
    }
    getProposals(wallet, strategy)
      .then((res) => {
        if (res !== undefined) {
          setProposals(res);
        } else {
          console.debug("No proposals");
        }
      })
      .catch((err) => {
        console.error("Error while fetching proposals: ", {
          error: err,
          strategy,
        });
      })
      .finally(() => {
        setFetchingProposals(false);
      });
  };

  const getProposalsInputsDifferences = (
    inputData: ProposalInputItem[],
    currentData: ProposalInputItem[],
  ): [number, bigint][] => {
    return inputData.reduce<[number, bigint][]>((acc, input) => {
      const current = currentData.find((item) => item.id === input.id);
      const diff =
        BigInt(Math.floor(input.value)) - BigInt(current?.value ?? 0);
      if (diff !== 0n) {
        acc.push([Number(input.id), diff]);
      }
      return acc;
    }, []);
  };

  const calculateTotalTokens = (exceptIndex?: number) => {
    if (!inputs) {
      console.error("Inputs not yet computed");
      return 0;
    }
    return inputs.reduce((acc, curr, i) => {
      if (exceptIndex !== undefined && exceptIndex === i) {
        return acc;
      } else {
        return acc + Number(curr.value);
      }
    }, 0);
  };

  const inputHandler = (i: number, value: number) => {
    const currentPoints = calculateTotalTokens(i);
    const maxAllowableValue = memberActivatedPoints - currentPoints;
    value = Math.min(value, maxAllowableValue);

    setInputs((prev) =>
      prev?.map((input, index) => (index === i ? { ...input, value } : input)),
    );
    setInputAllocatedTokens(currentPoints + value);
  };

  const submit = async () => {
    if (!inputs) {
      console.error("Inputs not yet computed");
      return;
    }
    const proposalsDifferencesArr = getProposalsInputsDifferences(
      inputs,
      stakedFilters,
    );
    const encodedData = encodeFunctionParams(cvStrategyABI, "supportProposal", [
      proposalsDifferencesArr,
    ]);
    const poolId = Number(strategy.poolId);
    writeAllocate({
      args: [BigInt(poolId), encodedData as AddressType],
    });
  };

  // Contract interaction
  const {
    write: writeAllocate,
    error: errorAllocate,
    status: allocateStatus,
  } = useContractWriteWithConfirmations({
    address: alloInfo.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "allocate",
    contractName: "Allo",
    fallbackErrorMessage: "Error allocating points. Please try again.",
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        id: alloInfo.id,
        function: "allocate",
        urlChainId,
      });
    },
  });

  useErrorDetails(errorAllocate, "errorAllocate");

  // Computed values
  const memberSupportedProposalsPct = calculatePercentage(
    inputAllocatedTokens,
    memberActivatedPoints,
  );
  const memberPoolWeight = calculatePercentage(
    memberActivatedPoints,
    strategy.totalEffectiveActivePoints,
  );

  const calcPoolWeightUsed = (number: number) => {
    if (memberPoolWeight == 0) return 0;
    return ((number / 100) * memberPoolWeight).toFixed(2);
  };

  const poolWeightClassName = `${
    calcPoolWeightUsed(memberSupportedProposalsPct) === memberPoolWeight ?
      "bg-secondary-soft text-secondary-content"
    : "bg-primary-soft text-primary-content"
  }`;

  const stats: Stats[] = [
    {
      id: 1,
      name: "Pool Weight",
      stat: memberPoolWeight,
      className: poolWeightClassName,
    },
    {
      id: 2,
      name: "Allocated Pool Weight",
      stat: calcPoolWeightUsed(memberSupportedProposalsPct),
      className: poolWeightClassName,
    },
    {
      id: 3,
      name: "Total Allocation Percentage",
      stat: memberSupportedProposalsPct,
      className: `${
        memberSupportedProposalsPct >= 100 ?
          "bg-secondary-content text-secondary-soft border-secondary-content"
        : "bg-primary-content text-primary-soft border-primary-content"
      }`,
    },
  ];

  const disableManageSupportBtnCondition: ConditionObject[] = [
    {
      condition: !memberActivatedStrategy,
      message: "Must have points activated to support proposals",
    },
  ];
  const disableManSupportButton = disableManageSupportBtnCondition.some(
    (cond) => cond.condition,
  );
  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons(
    disableManageSupportBtnCondition,
  );

  // Render
  return (
    <>
      <PoolGovernance
        memberPoolWeight={memberPoolWeight}
        tokenDecimals={tokenDecimals}
        strategy={strategy}
        communityAddress={communityAddress}
        memberTokensInCommunity={memberActivatedPoints}
        isMemberCommunity={isMemberCommunity}
        memberActivatedStrategy={memberActivatedStrategy}
      />
      <section className="section-layout flex flex-col gap-10">
        <div>
          <header className="flex items-center justify-between gap-10">
            <h2>Proposals</h2>
            {!!proposals &&
              (proposals.length === 0 ?
                <h4 className="text-2xl">No submitted proposals to support</h4>
              : !allocationView && (
                  <CheckPassport strategyAddr={strategy.id as Address}>
                    <Button
                      icon={
                        <AdjustmentsHorizontalIcon height={24} width={24} />
                      }
                      onClick={() => setAllocationView((prev) => !prev)}
                      disabled={disableManSupportButton}
                      tooltip={String(tooltipMessage)}
                    >
                      Manage support
                    </Button>
                  </CheckPassport>
                ))}
          </header>
          {allocationView && <UserAllocationStats stats={stats} />}
        </div>
        <div className="flex flex-col gap-6">
          {proposals && inputs ?
            proposals.map((proposalData, i) => (
              <ProposalCard
                key={proposalData.id}
                proposalData={proposalData}
                inputData={inputs[i]}
                stakedFilter={stakedFilters[i]}
                index={i}
                isAllocationView={allocationView}
                tooltipMessage={tooltipMessage}
                memberActivatedPoints={memberActivatedPoints}
                memberPoolWeight={memberPoolWeight}
                executeDisabled={
                  proposalData.proposalStatus == 4 ||
                  !isConnected ||
                  missmatchUrl
                }
                strategy={strategy}
                tokenDecimals={tokenDecimals}
                alloInfo={alloInfo}
                triggerRenderProposals={triggerRenderProposals}
                inputHandler={inputHandler}
                tokenData={strategy.registryCommunity.garden}
              />
            ))
          : <LoadingSpinner />}
        </div>
        {allocationView ?
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
                !inputs ||
                !getProposalsInputsDifferences(inputs, stakedFilters).length
              }
              tooltip="Make changes in proposals support first"
            >
              Save changes
            </Button>
          </div>
        : <div>
            <h4>Do you have a great idea?</h4>
            <div className="flex items-center gap-6">
              <p>Share it with the community and get support!</p>
              <CheckPassport strategyAddr={strategy.id as Address}>
                <Link href={createProposalUrl}>
                  <Button icon={<PlusIcon height={24} width={24} />}>
                    Create a proposal
                  </Button>
                </Link>
              </CheckPassport>
            </div>
          </div>
        }
      </section>
    </>
  );
}

function UserAllocationStats({ stats }: { stats: Stats[] }) {
  return (
    <div className="mt-10">
      <h3>Your Allocation Overview</h3>
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.id} className="section-layout sm:px-6 sm:pt-6">
            <div>
              <div
                className={`radial-progress absolute rounded-full border-4 border-neutral transition-all duration-300 ease-in-out ${stat.className}`}
                style={{
                  // @ts-ignore
                  "--value": stat.stat,
                  "--size": "4rem",
                  "--thickness": "0.35rem",
                }}
                role="progressbar"
              >
                <span className="text-xs">{stat.stat} %</span>
              </div>

              <p className="ml-20 truncate">{stat.name}</p>
            </div>
            <div className="stats-baseline ml-20 flex">
              <p className="text-2xl font-semibold text-neutral-content">
                {stat.stat} %
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
