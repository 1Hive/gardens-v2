"use client";

import React, { useEffect, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { toast } from "react-toastify";
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
  const [editView, setEditView] = useState(false);
  const [inputAllocatedTokens, setInputAllocatedTokens] = useState<number>(0);
  const [inputs, setInputs] = useState<ProposalInputItem[]>([]);
  const [proposals, setProposals] = useState<
  Awaited<ReturnType<typeof getProposals>>
  >([]);
  const [memberActivatedPoints, setMemberActivatedPoints] = useState<number>(0);
  const [stakedFilters, setStakedFilters] = useState<ProposalInputItem[]>([]);
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
    getProposals(wallet, strategy).then((res) => {
      if (res !== undefined) {
        setProposals(res);
      } else {
        console.debug("No proposals");
      }
    });
  };

  useEffect(() => {
    triggerRenderProposals();
  }, []);

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
    if (isMemberActived === undefined) {
      return;
    }
    if (isMemberActived !== true) {
      setEditView(false);
    }
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
    const toastId = "error-toast";
    // If the sum exceeds the memberActivatedPoints, adjust the value to the maximum allowable value
    if (currentPoints + value > memberActivatedPoints) {
      value = maxAllowableValue;
      if (!toast.isActive(toastId)) {
        toast.error("Can't exceed 100% in total support!", {
          toastId,
        });
      }
      console.debug("Can't exceed 100% points");
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

  return (
    <>
      <PoolGovernance
        memberPoolWeight={memberPoolWeight}
        tokenDecimals={tokenDecimals}
        strategy={strategy}
        communityAddress={communityAddress}
        memberTokensInCommunity={memberTokensInCommunity}
      />
      <section className="section-layout">
        <div className="mx-auto max-w-5xl space-y-10">
          <header className="flex items-center justify-between">
            <div className="flex w-full items-baseline justify-between">
              <h2 className="font-semibold">Proposals</h2>
              {proposals ?
                proposals.length === 0 ?
                  <h4 className="text-2xl text-info">
                    No submitted proposals to support
                  </h4>
                  : !editView && (
                    <Button
                      icon={
                        <AdjustmentsHorizontalIcon height={24} width={24} />
                      }
                      onClick={() => setEditView((prev) => !prev)}
                      disabled={disableManSupportButton}
                      tooltip={String(tooltipMessage)}
                    >
                      Manage support
                    </Button>
                  )

                : <LoadingSpinner />}
            </div>
            {editView && (
              <>
                <div className="flex w-full items-start text-right">
                  <div className="flex w-full flex-col items-center">
                    <p className={"text-center text-4xl text-info"}>
                      {calcPoolWeightUsed(memberSupportedProposalsPct)} %
                    </p>
                    <p className="text-md text-left">Pool weight used</p>
                  </div>
                  <div className="flex w-full flex-col items-center">
                    <p
                      className={`text-center text-5xl ${memberSupportedProposalsPct >= 100 && "text-warning"}`}
                    >
                      {memberSupportedProposalsPct} %
                    </p>
                    <p className="text-center text-lg">
                      Of your governance weight is supporting proposals
                    </p>
                  </div>
                </div>
              </>
            )}
          </header>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6">
            {proposals?.map((proposalData, i) => (
              <React.Fragment key={proposalData.id + "_" + i}>
                <ProposalCard
                  proposalData={proposalData}
                  inputData={inputs[i]}
                  stakedFilter={stakedFilters[i]}
                  index={i}
                  isEditView={editView}
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
          <div className="flex justify-end gap-8">
            {editView && (
              <>
                <Button
                  btnStyle="outline"
                  color="danger"
                  onClick={() => setEditView((prev) => !prev)}
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
            )}
          </div>
        </div>
        <div>
          <h4 className="text-2xl">Do you have a great idea?</h4>
          <div className="flex items-center gap-6">
            <p>Share it with the community and get support !</p>
            <Link href={createProposalUrl}>
              <Button
                btnStyle="filled"
                disabled={!isConnected || missmatchUrl}
                tooltip={tooltipMessage}
                icon={<PlusIcon height={24} width={24} />}
              >
                Create Proposal
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
