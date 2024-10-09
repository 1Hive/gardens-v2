"use client";

import React, { Fragment, useEffect, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { FetchTokenResult } from "@wagmi/core";
import Link from "next/link";
import { parseAbiParameters, encodeAbiParameters } from "viem";
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
} from "#/subgraph/.graphclient";
import { LoadingSpinner } from "./LoadingSpinner";
import { PoolGovernanceProps } from "./PoolGovernance";
import { ProposalCardProps } from "./ProposalCard";
import {
  Button,
  CheckPassport,
  InfoWrapper,
  PoolGovernance,
  ProposalCard,
} from "@/components";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import useCheckAllowList from "@/hooks/useCheckAllowList";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { alloABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abi";
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
  strategy: Pick<CVStrategy, "id" | "poolId" | "totalEffectiveActivePoints"> & {
    registryCommunity: Pick<RegistryCommunity, "id"> & {
      garden: Pick<RegistryCommunity["garden"], "decimals">;
    };
    proposals: Array<
      Pick<CVProposal, "proposalNumber" | "proposalStatus"> &
        ProposalCardProps["proposalData"]
    >;
    config: ProposalCardProps["strategyConfig"];
  } & PoolGovernanceProps["strategy"];
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
  const [memberActivatedPoints, setMemberActivatedPoints] = useState<number>(0);
  const [stakedFilters, setStakedFilters] = useState<ProposalInputItem[]>([]);

  // Hooks
  const { address: wallet } = useAccount();
  const { publish } = usePubSubContext();
  const chainId = useChainIdFromPath();
  const allowList = (strategy?.config?.allowlist as Address[]) ?? [];
  const isAllowed = useCheckAllowList(allowList, wallet);

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
        { topic: "member", id: wallet },
      ],
      enabled: !!wallet,
    },
  );

  //Contract reads
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
    Number(memberStrategyData?.memberStrategy?.activatedPoints) > 0;

  const proposals = strategy.proposals;

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
    if (!proposals) return;

    const newInputs = proposals.map(({ proposalNumber }) => {
      const stakedFilter = stakedFilters.find(
        (item) => item.id === proposalNumber,
      );
      return { id: proposalNumber, value: stakedFilter?.value ?? 0 };
    });
    setInputs(newInputs);
  }, [proposals, stakedFilters]);

  const getProposalsInputsDifferences = (
    inputData: ProposalInputItem[],
    currentData: ProposalInputItem[],
  ) => {
    return inputData.reduce<{ proposalId: bigint; deltaSupport: bigint }[]>(
      (acc, input) => {
        const current = currentData.find((item) => item.id === input.id);
        const diff =
          BigInt(Math.floor(input.value)) - BigInt(current?.value ?? 0);
        if (diff !== 0n) {
          acc.push({ proposalId: BigInt(input.id), deltaSupport: diff });
        }
        return acc;
      },
      [],
    );
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
        containerId: strategy.poolId,
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
  const memberSupportedProposalsPct = calculatePercentage(
    inputAllocatedTokens,
    memberActivatedPoints,
  );
  const memberPoolWeight = calculatePercentage(
    Number(memberPower),
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
      name: "Your voting weight",
      stat: memberPoolWeight,
      className: poolWeightClassName,
      info: "Represents your voting power within the pool",
    },
    {
      id: 2,
      name: "Voting weight used",
      stat: calcPoolWeightUsed(memberSupportedProposalsPct),
      className: poolWeightClassName,
      info: "Indicates the portion of your pool weight currently allocated in proposals.",
    },
    {
      id: 3,
      name: "Total support",
      stat: memberSupportedProposalsPct,
      className: `${
        memberSupportedProposalsPct >= 100 ?
          "bg-secondary-content text-secondary-soft border-secondary-content"
        : "bg-primary-content text-primary-soft border-primary-content"
      }`,
      info: "Reflects the percentage of your pool weight supporting proposals.",
    },
  ];

  const disableManageSupportBtnCondition: ConditionObject[] = [
    {
      condition: !memberActivatedStrategy,
      message: "Must have points activated to support proposals",
    },
    {
      condition: !isAllowed,
      message: "Address not in allowlist",
    },
  ];
  const disableManSupportButton = disableManageSupportBtnCondition.some(
    (cond) => cond.condition,
  );
  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons(
    disableManageSupportBtnCondition,
  );

  // const endedProposals = proposals?.filter(
  //   (x) =>
  //     ProposalStatus[x.status] !== "active" &&
  //     ProposalStatus[x.status] !== "disputed",
  // );

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
          <header className="flex items-center justify-between gap-10 flex-wrap">
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
                      disabled={disableManSupportButton || !isAllowed}
                      tooltip={tooltipMessage}
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
                // .filter(
                //   (x) =>
                //     ProposalStatus[x.status] === "active" ||
                //     ProposalStatus[x.status] === "disputed",
                // )
                .map((proposalData, i) => (
                  <Fragment key={proposalData.proposalNumber}>
                    <ProposalCard
                      proposalData={proposalData}
                      strategyConfig={strategy.config}
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
                      inputHandler={inputHandler}
                      tokenData={strategy.registryCommunity.garden}
                    />
                  </Fragment>
                ))}
              {/* {!allocationView && !!endedProposals?.length && (
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
              )} */}
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
            <div className="flex items-center justify-center gap-6">
              <CheckPassport strategyAddr={strategy.id as Address}>
                <Link href={createProposalUrl}>
                  <Button
                    icon={<PlusIcon height={24} width={24} />}
                    disabled={!isConnected || missmatchUrl || !isAllowed}
                    tooltip="Address not in allowlist"
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
      <h3>Support Overview</h3>
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

              <InfoWrapper tooltip={stat.info}>
                <p className="ml-20 truncate">{stat.name}</p>
              </InfoWrapper>
            </div>
            <div className="ml-20">
              <p className="text-2xl font-semibold">{stat.stat} %</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
