"use client";

import React, { useState, useEffect } from "react";
import { Button, PoolGovernance, FormLink, ProposalCard } from "@/components";
import {
  useAccount,
  useContractWrite,
  Address as AddressType,
  useContractRead,
  useWaitForTransaction,
} from "wagmi";
import { encodeFunctionParams } from "@/utils/encodeFunctionParams";
import { alloABI, cvStrategyABI, registryCommunityABI } from "@/src/generated";
import { getProposals } from "@/actions/getProposals";
import { calculatePercentage } from "@/utils/numbers";
import useErrorDetails from "@/utils/getErrorName";
import {
  Allo,
  CVProposal,
  CVStrategy,
  getMemberStrategyDocument,
  getMemberStrategyQuery,
  getPoolDataQuery,
  isMemberDocument,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { useIsMemberActivated } from "@/hooks/useIsMemberActivated";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { getChainIdFromPath } from "@/utils/path";
import { useDisableButtons, ConditionObject } from "@/hooks/useDisableButtons";
import useSubgraphQueryByChain from "@/hooks/useSubgraphQueryByChain";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { toast } from "react-toastify";
import { chainDataMap } from "@/configs/chainServer";
import { LightCVStrategy } from "@/types";
import LoadingSpinner from "./LoadingSpinner";

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

interface Stats {
  id: number;
  name: string;
  stat: number | string;
  className: string;
}

export function Proposals({
  strategy,
  alloInfo,
  communityAddress,
  createProposalUrl,
  proposalType,
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
  const [memberTokensInCommunity, setMemberTokensInCommunity] =
    useState<string>("0");

  const { address } = useAccount();

  const tokenDecimals = strategy.registryCommunity.garden.decimals;

  const { isMemberActived } = useIsMemberActivated(strategy);
  const chainId = getChainIdFromPath();
  const { publish } = usePubSubContext();

  const { data: isMemberActivated } = useContractRead({
    address: communityAddress,
    abi: abiWithErrors2(registryCommunityABI),
    functionName: "memberActivatedInStrategies",
    args: [address as Address, strategy.id as Address],
    watch: true,
  });

  const {
    data: memberResult,
    error,
    refetch: refetchIsMemberQuery,
  } = useSubgraphQueryByChain<isMemberQuery>(
    chainId,
    isMemberDocument,
    {
      me: address?.toLowerCase(),
      comm: strategy.registryCommunity.id.toLowerCase(),
    },
    {},
    {
      topic: "member",
      id: communityAddress,
      type: ["add", "delete"],
      chainId,
    },
  );

  if (error) {
    console.error("Error while fetching member data: ", error);
  }

  useEffect(() => {
    let _stakesFilteres: StakesMemberType = [];
    if (memberResult && memberResult.members.length > 0) {
      const stakes = memberResult.members[0].stakes;
      if (stakes && stakes.length > 0) {
        _stakesFilteres = stakes.filter((stake) => {
          return (
            stake.proposal.strategy.id.toLowerCase() ===
            strategy.id.toLowerCase()
          );
        });
      }
    }

    _stakesFilteres.reduce((acc, curr) => {
      return acc + BigInt(curr.amount);
    }, 0n);

    const totalStaked = _stakesFilteres.reduce((acc, curr) => {
      return acc + BigInt(curr.amount);
    }, 0n);

    const memberStakes: ProposalInputItem[] = _stakesFilteres.map((item) => ({
      id: item.proposal.proposalNumber,
      value: item.amount,
    }));

    setInputAllocatedTokens(Number(totalStaked));
    setStakedFilters(memberStakes);
  }, [memberResult]);

  const { data: memberStrategyResult, error: errorMS } =
    useSubgraphQueryByChain<getMemberStrategyQuery>(
      chainId,
      getMemberStrategyDocument,
      {
        meStr: `${address?.toLowerCase()}-${strategy.id.toLowerCase()}`,
      },
      {},
      {
        topic: "proposal",
        id: strategy.id,
        type: "update",
        chainId: chainId,
      },
    );

  useEffect(() => {
    if (address) {
      refetchIsMemberQuery();
    }
  }, [address]);

  useEffect(() => {
    setMemberActivatedPoints(
      Number(memberStrategyResult?.memberStrategy?.activatedPoints ?? 0n),
    );
  }, [memberStrategyResult]);

  const triggerRenderProposals = () => {
    getProposals(address as Address, strategy).then((res) => {
      if (res !== undefined) {
        setProposals(res);
      } else {
        console.log("no proposals");
      }
    });
  };

  useEffect(() => {
    triggerRenderProposals();
  }, [address]);

  useEffect(() => {
    if (!proposals) {
      return;
    }
    const newInputs = proposals.map(({ proposalNumber, stakedAmount }) => {
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
    if (newInputs.length > 0) {
      let sum = newInputs?.reduce(
        (prev, curr) => prev + BigInt(curr.value),
        0n,
      );
    }
    setInputs(newInputs);
  }, [proposals, address, stakedFilters]);

  useEffect(() => {
    if (isMemberActived == null) return;
    if (!isMemberActived) setAllocationView(false);
  }, [isMemberActived]);

  const {
    data: allocateData,
    write: writeAllocate,
    error: errorAllocate,
    isSuccess: isSuccessAllocate,
    status: allocateStatus,
  } = useContractWrite({
    address: alloInfo.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "allocate",
  });

  useWaitForTransaction({
    hash: allocateData?.hash,
    confirmations: chainDataMap[chainId].confirmations,
    onSuccess: () => {
      publish({
        topic: "proposal",
        type: "update",
        id: alloInfo.id,
        function: "allocate",
        chainId,
      });
    },
  });

  useErrorDetails(errorAllocate, "errorAllocate");
  const { updateTransactionStatus, txConfirmationHash } =
    useTransactionNotification(allocateData);

  useEffect(() => {
    updateTransactionStatus(allocateStatus);
  }, [allocateStatus]);

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
    const resultArr: [number, BigInt][] = [];
    inputData.forEach((input) => {
      let row: [number, bigint] | undefined = undefined;
      if (input.value > 0)
        row = [Number(input.id), BigInt(Math.floor(input.value))];
      currentData.forEach((current) => {
        if (input.id === current.id) {
          const dif = BigInt(Math.floor(input.value)) - BigInt(current.value);
          row = [Number(input.id), dif];
        }
      });
      if (row && row[1] !== 0n) resultArr.push(row);
    });

    return resultArr;
  };
  const calculateTotalTokens = (exceptIndex?: number) =>
    inputs.reduce((acc, curr, i) => {
      if (exceptIndex !== undefined && exceptIndex === i) return acc;
      else return acc + Number(curr.value);
    }, 0);

  const inputHandler = (i: number, value: number) => {
    const currentPoints = calculateTotalTokens(i);
    const maxAllowableValue = memberActivatedPoints - currentPoints;

    // If the sum exceeds the memberActivatedPoints, adjust the value to the maximum allowable value
    if (currentPoints + value > memberActivatedPoints) {
      value = maxAllowableValue;
      console.log("can't exceed 100% points");
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
            <React.Fragment key={proposalData.id + "_" + i}>
              <ProposalCard
                proposalData={proposalData}
                inputData={inputs[i]}
                stakedFilter={stakedFilters[i]}
                i={i}
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
                <FormLink href={createProposalUrl} label="Create Proposal" />
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}

export default function UserAllocationStats({ stats }: { stats: any[] }) {
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
