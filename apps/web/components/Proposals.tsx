"use client";

import React, { Fragment, useEffect, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { FetchTokenResult } from "@wagmi/core";
import Link from "next/link";
import { Address, Address as AddressType, useAccount } from "wagmi";
import {
  Allo,
  CVProposal,
  getMemberStrategyDocument,
  getMemberStrategyQuery,
  isMemberDocument,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import { LoadingSpinner } from "./LoadingSpinner";
import { getProposals } from "@/actions/getProposals";
import {
  Button,
  CheckPassport,
  InfoWrapper,
  PoolGovernance,
  ProposalCard,
} from "@/components";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { alloABI, cvStrategyABI } from "@/src/generated";
import { LightCVStrategy, ProposalStatus } from "@/types";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { encodeFunctionParams } from "@/utils/encodeFunctionParams";
import { useErrorDetails } from "@/utils/getErrorName";
import { calculatePercentage } from "@/utils/numbers";

// Types
export type ProposalInputItem = {
  id: string;
  value: number;
};

// export type Strategy = getStrategyByPoolQuery["cvstrategies"][number];
// export type Proposal = CVStrategy["proposals"][number];
export type StakesMemberType = NonNullable<isMemberQuery["member"]>["stakes"];

export type ProposalTypeVoter = CVProposal & {
  title: string;
  type: number;
};

type Stats = {
  id: number;
  name: string;
  stat: number | string;
  className: string;
  info: string;
};

interface ProposalsProps {
  strategy: LightCVStrategy;
  alloInfo: Allo;
  poolToken: FetchTokenResult;
  communityAddress: Address;
  createProposalUrl: string;
  proposalType: number;
}

export function Proposals({
  strategy,
  alloInfo,
  poolToken,
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
  const { publish } = usePubSubContext();

  const tokenDecimals = strategy.registryCommunity.garden.decimals;

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
        type: ["add", "delete"],
      },
      {
        topic: "proposal",
        containerId: strategy.id,
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
          id: strategy.id,
          type: "update",
        },
        { topic: "member", id: wallet },
      ],
      enabled: !!wallet,
    },
  );

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
  }, [memberData?.member?.stakes, strategy.id]);

  useEffect(() => {
    setMemberActivatedPoints(
      Number(memberData?.member?.memberCommunity?.[0]?.stakedTokens ?? 0n),
    );
  }, [memberData?.member?.memberCommunity?.[0]?.stakedTokens]);

  useEffect(() => {
    if (memberActivatedStrategy === false) {
      setAllocationView(false);
    }
  }, [memberActivatedStrategy]);

  useEffect(() => {
    if (!fetchingProposals) {
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
    getProposals(strategy)
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
    onSuccess: () => {
      setAllocationView(false);
    },
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        containerId: strategy.id,
        function: "allocate",
      });
    },
  });
  const submit = async () => {
    if (!inputs) {
      console.error("Inputs not yet computed");
      return;
    }
    const proposalsDifferencesArr = getProposalsInputsDifferences(
      inputs,
      stakedFilters,
    );
    const encodedData = encodeFunctionParams(cvStrategyABI, "allocate", [
      proposalsDifferencesArr,
    ]);
    const poolId = Number(strategy.poolId);
    writeAllocate({
      args: [BigInt(poolId), encodedData as AddressType],
    });
  };

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
      name: "Your pool weight",
      stat: memberPoolWeight,
      className: poolWeightClassName,
      info: "Represents your influence or voting power in the pool",
    },
    {
      id: 2,
      name: "Pool weight used",
      stat: calcPoolWeightUsed(memberSupportedProposalsPct),
      className: poolWeightClassName,
      info: "This indicates how much of your pool weight you allocated in proposals.",
    },
    {
      id: 3,
      name: "Total allocated",
      stat: memberSupportedProposalsPct,
      className: `${
        memberSupportedProposalsPct >= 100 ?
          "bg-secondary-content text-secondary-soft border-secondary-content"
        : "bg-primary-content text-primary-soft border-primary-content"
      }`,
      info: "This percentage reflects how much of your pool weight is supporting proposals.",
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

  const endedProposals = proposals?.filter(
    (x) =>
      ProposalStatus[x.status] !== "active" &&
      ProposalStatus[x.status] !== "disputed",
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
            <>
              {proposals
                .filter(
                  (x) =>
                    ProposalStatus[x.status] === "active" ||
                    ProposalStatus[x.status] === "disputed",
                )
                .map((proposalData, i) => (
                  <Fragment key={proposalData.proposalNumber}>
                    <ProposalCard
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
                      poolToken={poolToken}
                      tokenDecimals={tokenDecimals}
                      alloInfo={alloInfo}
                      triggerRenderProposals={triggerRenderProposals}
                      inputHandler={inputHandler}
                      tokenData={strategy.registryCommunity.garden}
                    />
                  </Fragment>
                ))}
              {!allocationView && !!endedProposals?.length && (
                <details className="collapse collapse-arrow">
                  <summary className="collapse-title text-md font-medium bg-neutral-soft mb-4 rounded-b-2xl flex content-center">
                    Click to see ended proposals
                  </summary>
                  <div className="collapse-content px-0 flex flex-col gap-6">
                    {proposals
                      .filter(
                        (x) =>
                          ProposalStatus[x.status] !== "active" &&
                          ProposalStatus[x.status] !== "disputed",
                      )
                      .map((proposalData, i) => (
                        <Fragment key={proposalData.proposalNumber}>
                          <ProposalCard
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
                            poolToken={poolToken}
                            tokenDecimals={tokenDecimals}
                            alloInfo={alloInfo}
                            triggerRenderProposals={triggerRenderProposals}
                            inputHandler={inputHandler}
                            tokenData={strategy.registryCommunity.garden}
                          />
                        </Fragment>
                      ))}
                  </div>
                </details>
              )}
            </>
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
                  <Button
                    icon={<PlusIcon height={24} width={24} />}
                    disabled={!isConnected || missmatchUrl}
                  >
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
      <h3>Allocation Overview</h3>
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={`stat_${stat.id}`}
            className="section-layout sm:px-6 sm:pt-6"
          >
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
            <div className="ml-20">
              <InfoWrapper tooltip={stat.info}>
                <p className="text-2xl font-semibold">{stat.stat} %</p>
              </InfoWrapper>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
