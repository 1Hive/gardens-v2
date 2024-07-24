"use client";

import React, { useEffect, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { Address as AddressType, useAccount, useContractRead } from "wagmi";
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
import { Button, PoolGovernance, ProposalCard } from "@/components";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useIsMemberActivated } from "@/hooks/useIsMemberActivated";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { alloABI, cvStrategyABI, registryCommunityABI } from "@/src/generated";
import { LightCVStrategy } from "@/types";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { encodeFunctionParams } from "@/utils/encodeFunctionParams";
import { useErrorDetails } from "@/utils/getErrorName";
import { calculatePercentage } from "@/utils/numbers";

export type ProposalInputItem = {
  id: string;
  value: number;
};

// export type Strategy = getStrategyByPoolQuery["cvstrategies"][number];
// export type Proposal = CVStrategy["proposals"][number];
export type StakesMemberType = isMemberQuery["members"][number]["stakes"];

export type ProposalTypeVoter = CVProposal & {
  title: string;
  type: number;
};

type Stats = {
  id: number;
  name: string;
  stat: number | string;
  className: string;
};

export function Proposals({
  strategy,
  alloInfo,
  communityAddress,
  createProposalUrl,
}: {
  strategy: LightCVStrategy;
  alloInfo: Allo;
  communityAddress: Address;
  createProposalUrl: string;
  proposalType: number;
}) {
  const [allocationView, setAllocationView] = useState(false);
  const [inputAllocatedTokens, setInputAllocatedTokens] = useState<number>(0);
  const [inputs, setInputs] = useState<ProposalInputItem[]>([]);
  const [proposals, setProposals] = useState<
  Awaited<ReturnType<typeof getProposals>>
  >([]);
  const [memberActivatedPoints, setMemberActivatedPoints] = useState<number>(0);
  const [stakedFilters, setStakedFilters] = useState<ProposalInputItem[]>([]);
  const [fetchingProposals, setFetchingProposals] = useState<boolean | undefined>();
  const memberTokensInCommunity = "0";

  const { address: wallet } = useAccount();

  const tokenDecimals = strategy.registryCommunity.garden.decimals;

  const { isMemberActived } = useIsMemberActivated(strategy);
  const urlChainId = useChainIdFromPath();
  const { publish } = usePubSubContext();

  const { data: isMemberActivated } = useContractRead({
    address: communityAddress,
    abi: abiWithErrors2(registryCommunityABI),
    functionName: "memberActivatedInStrategies",
    args: [wallet as Address, strategy.id as Address],
    watch: true,
    enabled: !!wallet,
  });

  const {
    data: memberResult,
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

  if (error) {
    console.error("Error while fetching member data: ", error);
  }

  useEffect(() => {
    let stakesFilteres: StakesMemberType = [];
    if (memberResult && memberResult.members.length > 0) {
      const stakes = memberResult.members[0].stakes;
      if (stakes && stakes.length > 0) {
        stakesFilteres = stakes.filter((stake) => {
          return (
            stake.proposal.strategy.id.toLowerCase() ===
            strategy.id.toLowerCase()
          );
        });
      }
    }

    stakesFilteres.reduce((acc, curr) => {
      return acc + BigInt(curr.amount);
    }, 0n);

    const totalStaked = stakesFilteres.reduce((acc, curr) => {
      return acc + BigInt(curr.amount);
    }, 0n);

    const memberStakes: ProposalInputItem[] = stakesFilteres.map((item) => ({
      id: item.proposal.proposalNumber,
      value: item.amount,
    }));

    setInputAllocatedTokens(Number(totalStaked));
    setStakedFilters(memberStakes);
  }, [memberResult]);

  const { data: memberStrategyResult } =
    useSubgraphQuery<getMemberStrategyQuery>({
      query: getMemberStrategyDocument,
      variables: {
        meStr: `${wallet?.toLowerCase()}-${strategy.id.toLowerCase()}`,
      },
      changeScope: {
        topic: "proposal",
        id: strategy.id,
        type: "update",
      },
      enabled: !!wallet,
    });

  useEffect(() => {
    if (wallet) {
      refetchIsMemberQuery();
    }
  }, [wallet]);

  useEffect(() => {
    setMemberActivatedPoints(
      Number(memberStrategyResult?.memberStrategy?.activatedPoints ?? 0n),
    );
  }, [memberStrategyResult]);

  const triggerRenderProposals = () => {
    if (fetchingProposals == null) {
      setFetchingProposals(true);
    }
    getProposals(wallet, strategy).then((res) => {
      if (res !== undefined) {
        setProposals(res);
      } else {
        console.debug("No proposals");
      }
    }).catch((err) => {
      console.error("Error while fetching proposals: ", { error: err, strategy });
    }).finally(() => {
      return setFetchingProposals(false);
    });
  };

  useEffect(() => {
    if (wallet && !fetchingProposals) {
      triggerRenderProposals();
    }
  }, [wallet, strategy]);

  useEffect(() => {
    if (!proposals) {
      return;
    }
    let newInputs = proposals.map(({ proposalNumber }) => {
      let returnItem = { id: proposalNumber, value: 0 };
      stakedFilters.forEach((item, index) => {
        if (proposalNumber === item.id) {
          returnItem = {
            id: proposalNumber,
            value: stakedFilters[Number(index)]?.value,
          };
        }
      });
      return returnItem;
    });
    setInputs(newInputs);
  }, [proposals, wallet, stakedFilters]);

  useEffect(() => {
    if (isMemberActived == null) return;
    if (!isMemberActived) setAllocationView(false);
  }, [isMemberActived]);

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

  const submit = async () => {
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

  // this calculations breaks when dealing with < 50 wei
  const getProposalsInputsDifferences = (
    inputData: ProposalInputItem[],
    currentData: ProposalInputItem[],
  ) => {
    const resultArr: [number, bigint][] = [];
    inputData.forEach((input) => {
      let row: [number, bigint] | undefined = undefined;
      if (input.value > 0) {
        row = [Number(input.id), BigInt(Math.floor(input.value))];
      }
      currentData.forEach((current) => {
        if (input.id === current.id) {
          const dif = BigInt(Math.floor(input.value)) - BigInt(current.value);
          row = [Number(input.id), dif];
        }
      });
      if (row && row[1] !== 0n) {
        resultArr.push(row);
      }
    });

    return resultArr;
  };
  const calculateTotalTokens = (exceptIndex?: number) =>
    inputs.reduce((acc, curr, i) => {
      if (exceptIndex !== undefined && exceptIndex === i) {
        return acc;
      } else {
        return acc + Number(curr.value);
      }
    }, 0);

  const inputHandler = (i: number, value: number) => {
    const currentPoints = calculateTotalTokens(i);
    const maxAllowableValue = memberActivatedPoints - currentPoints;

    // If the sum exceeds the memberActivatedPoints, adjust the value to the maximum allowable value
    if (currentPoints + value > memberActivatedPoints) {
      value = maxAllowableValue;
    }

    setInputs(
      inputs.map((input, index) =>
        index === i ? { ...input, value: value } : input,
      ),
    );
    setInputAllocatedTokens(currentPoints + value);
  };

  const disableManageSupportBtnCondition: ConditionObject[] = [
    {
      condition: !isMemberActivated,
      message: "Must have points activated to support proposals",
    },
  ];
  const disableManSupportButton = disableManageSupportBtnCondition.some(
    (cond) => cond.condition,
  );
  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons(
    disableManageSupportBtnCondition,
  );

  const memberSupportedProposalsPct = calculatePercentage(
    inputAllocatedTokens,
    memberActivatedPoints,
  );
  // console.log("inputAllocatedTokens:          %s", inputAllocatedTokens);
  // console.log("memberSupportedProposalsPct:   %s", memberSupportedProposalsPct);

  const memberPoolWeight = calculatePercentage(
    memberActivatedPoints,
    strategy.totalEffectiveActivePoints,
  );
  // const memberActivatePointsAsNum = Number(
  //   BigInt(memberActivatedPoints) / BigInt(10 ** tokenDecimals),
  // );
  // const totalEAPasNum = Number(
  //   BigInt(strategy.totalEffectiveActivePoints) / BigInt(10 ** tokenDecimals),
  // );

  // const memberPoolWeight = memberActivatePointsAsNum / totalEAPasNum;

  // console.log("newLocal:                    %s", memberActivatePointsAsNum);
  // console.log("newLocal_1:                  %s", totalEAPasNum);
  // console.log("memberActivatedPoints:       %s", memberActivatedPoints);
  // console.log("memberPoolWeight:            %s", memberPoolWeight);
  // console.log(
  //   "totalEffectiveActivePoints:  %s",
  //   strategy.totalEffectiveActivePoints,
  // );
  // console.log("tokenDecimals:               %s", tokenDecimals);

  const calcPoolWeightUsed = (number: number) => {
    if (memberPoolWeight == 0) {
      return 0;
    } else {
      return ((number / 100) * memberPoolWeight).toFixed(2);
    }
  };

  const poolWeightClassName = `${calcPoolWeightUsed(memberSupportedProposalsPct) === memberPoolWeight ? "bg-secondary-soft text-secondary-content" : "bg-primary-soft text-primary-content "}`;

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
      className: `${memberSupportedProposalsPct >= 100 ? "bg-secondary-content text-secondary-soft border-secondary-content" : "bg-primary-content text-primary-soft border-primary-content"}`,
    },
  ];

  return (
    <>
      <PoolGovernance
        memberPoolWeight={memberPoolWeight}
        tokenDecimals={tokenDecimals}
        strategy={strategy}
        communityAddress={communityAddress}
        memberTokensInCommunity={memberTokensInCommunity}
      />
      <section className="section-layout flex flex-col gap-10">
        <div>
          <header className="flex items-center justify-between gap-10">
            <h2>Proposals</h2>
            {!proposals ? (
              <LoadingSpinner />
            ) : proposals.length === 0 ? (
              <h4 className="text-2xl">No submitted proposals to support</h4>
            ) : (
              !allocationView && (
                <Button
                  icon={<AdjustmentsHorizontalIcon height={24} width={24} />}
                  onClick={() => setAllocationView((prev) => !prev)}
                  disabled={disableManSupportButton}
                  tooltip={String(tooltipMessage)}
                >
                  Manage support
                </Button>
              )
            )}
          </header>
          {allocationView && (
            <>
              <UserAllocationStats stats={stats} />
            </>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {proposals?.map((proposalData, i) => (
            <React.Fragment key={proposalData.id}>
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
                strategy={strategy}
                tokenDecimals={tokenDecimals}
                alloInfo={alloInfo}
                triggerRenderProposals={triggerRenderProposals}
                inputHandler={inputHandler}
              />
            </React.Fragment>
          ))}
        </div>
        {allocationView && (
          <div className="flex justify-end gap-4">
            <>
              <Button
                btnStyle="outline"
                color="danger"
                onClick={() => setAllocationView((prev) => !prev)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => submit()}
                isLoading={allocateStatus === "loading"}
                disabled={
                  !getProposalsInputsDifferences(inputs, stakedFilters).length
                }
                tooltip="Make changes in proposals support first"
              >
                Save changes
              </Button>
            </>
          </div>
        )}
        {!allocationView && (
          <>
            <div>
              <h4>Do you have a great idea?</h4>
              <div className="flex items-center gap-6">
                <p>Share it with the community and get support!</p>
                <Link href={createProposalUrl} >
                  <Button icon={<PlusIcon height={24} width={24} />}>
                    Create a proposal
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}

export default function UserAllocationStats({ stats }: { stats: Stats[] }) {
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
