"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  StatusBadge,
  PoolGovernance,
  FormLink,
  ProposalCard,
} from "@/components";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import {
  formatTokenAmount,
  calculatePercentage,
  calcDivisionToPct,
} from "@/utils/numbers";
import useErrorDetails from "@/utils/getErrorName";
import {
  Allo,
  CVProposal,
  CVStrategy,
  getMemberStrategyDocument,
  getMemberStrategyQuery,
  getStrategyByPoolQuery,
  isMemberDocument,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { useIsMemberActivated } from "@/hooks/useIsMemberActivated";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { encodeAbiParameters, formatUnits, parseUnits } from "viem";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { queryByChain } from "@/providers/urql";
import { getChainIdFromPath } from "@/utils/path";
import { useDisableButtons, ConditionObject } from "@/hooks/useDisableButtons";
import { useUrqlClient } from "@/hooks/useUqrlClient";
import { toast } from "react-toastify";
import * as dn from "dnum";

export type ProposalInputItem = {
  id: string;
  value: number;
};

// export type Strategy = getStrategyByPoolQuery["cvstrategies"][number];
// export type Proposal = Strategy["proposals"][number];
export type StakesMemberType = isMemberQuery["members"][number]["stakes"];

export type ProposalTypeVoter = CVProposal & {
  title: string;
  type: number;
};

// const getProposalId = (inputString: string) => {
//   if (inputString.length >= 2) {
//     return inputString.substring(2);
//   } else {
//     return "0x0";
//   }
// };

export function Proposals({
  strategy,
  alloInfo,
  communityAddress,
  createProposalUrl,
  proposalType,
}: {
  strategy: CVStrategy;
  alloInfo: Allo;
  communityAddress: Address;
  createProposalUrl: string;
  proposalType: number;
}) {
  const [editView, setEditView] = useState(false);
  const [inputAllocatedTokens, setInputAllocatedTokens] = useState<number>(0);
  const [inputs, setInputs] = useState<ProposalInputItem[]>([]);
  const [proposals, setProposals] = useState<ProposalTypeVoter[]>([]);
  const [memberActivatedPoints, setMemberActivatedPoints] = useState<number>(0);
  const [stakedFilters, setStakedFilters] = useState<ProposalInputItem[]>([]);
  const [memberTokensInCommunity, setMemberTokensInCommunity] =
    useState<string>("0");

  // console.log("inputAllocatedTokens: " + inputAllocatedTokens);
  // console.log(inputs);
  // console.log(stakedFilters);

  const { address } = useAccount();

  const tokenDecimals = strategy.registryCommunity.garden.decimals;

  const { isMemberActived } = useIsMemberActivated(strategy);
  const urqlClient = useUrqlClient();
  const chainId = getChainIdFromPath();

  const { data: isMemberActivated } = useContractRead({
    address: communityAddress,
    abi: abiWithErrors2(registryCommunityABI),
    functionName: "memberActivatedInStrategies",
    args: [address as Address, strategy.id as Address],
    watch: true,
  });

  const runIsMemberQuery = useCallback(async () => {
    if (address === undefined) {
      console.error("address is undefined");
      return;
    }
    const { data: result, error } = await queryByChain<isMemberQuery>(
      urqlClient,
      chainId,
      isMemberDocument,
      {
        me: address.toLowerCase(),
        comm: strategy.registryCommunity.id.toLowerCase(),
      },
    );

    setMemberTokensInCommunity(
      result?.members[0]?.memberCommunity?.[0]?.stakedTokens ?? "0",
    );

    const { data: memberStrategyResult, error: errorMS } =
      await queryByChain<getMemberStrategyQuery>(
        urqlClient,
        chainId,
        getMemberStrategyDocument,
        {
          meStr: `${address.toLowerCase()}-${strategy.id.toLowerCase()}`,
        },
      );

    let _stakesFilteres: StakesMemberType = [];

    setMemberActivatedPoints(
      Number(memberStrategyResult?.memberStrategy?.activatedPoints ?? 0n),
    );

    if (result && result.members.length > 0) {
      const stakes = result.members[0].stakes;
      if (stakes && stakes.length > 0) {
        _stakesFilteres = stakes.filter((stake) => {
          return (
            stake.proposal.strategy.id.toLowerCase() ===
            strategy.id.toLowerCase()
          );
        });
      }
    }

    const totalStaked = _stakesFilteres.reduce((acc, curr) => {
      return acc + BigInt(curr.amount);
    }, 0n);

    const memberStakes: ProposalInputItem[] = _stakesFilteres.map((item) => ({
      id: item.proposal.proposalNumber,
      value: item.amount,
    }));
    setInputAllocatedTokens(Number(totalStaked));
    setStakedFilters(memberStakes);
  }, [
    address,
    strategy.registryCommunity.id,
    urqlClient,
    chainId,
    isMemberDocument,
  ]);

  useEffect(() => {
    runIsMemberQuery();
  }, [address, runIsMemberQuery]);

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
    if (isMemberActived === undefined) return;
    if (isMemberActived !== true) setEditView(false);
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

  useErrorDetails(errorAllocate, "errorAllocate");
  const { updateTransactionStatus, txConfirmationHash } =
    useTransactionNotification(allocateData);

  useEffect(() => {
    triggerRenderProposals();
  }, [txConfirmationHash]);

  useEffect(() => {
    updateTransactionStatus(allocateStatus);
  }, [allocateStatus]);

  const submit = async () => {
    const encodedData = getEncodedProposals(inputs, stakedFilters);
    const poolId = Number(strategy.poolId);
    writeAllocate({
      args: [BigInt(poolId), encodedData as AddressType],
    });
  };

  const getEncodedProposals = (
    inputData: ProposalInputItem[],
    currentData: ProposalInputItem[],
  ) => {
    const resultArr: [number, BigInt][] = [];
    inputData.forEach((input) => {
      let row: [number, bigint] | undefined = undefined;
      if (input.value > 0) row = [Number(input.id), BigInt(input.value)];
      currentData.forEach((current) => {
        if (input.id === current.id) {
          const dif = BigInt(input.value - current.value);
          row = [Number(input.id), dif];
        }
      });
      if (!!row) resultArr.push(row);
    });
    console.log(inputData, currentData);
    console.log(resultArr);
    const encodedData = encodeFunctionParams(cvStrategyABI, "supportProposal", [
      resultArr,
    ]);
    return encodedData;
  };

  const calculateTotalTokens = (exceptIndex?: number) =>
    inputs.reduce((acc, curr, i) => {
      if (exceptIndex !== undefined && exceptIndex === i) return acc;
      else return acc + Number(curr.value);
    }, 0);

  const inputHandler = (i: number, value: number) => {
    const currentPoints = calculateTotalTokens(i);

    if (currentPoints + value <= memberActivatedPoints) {
      setInputs(
        inputs.map((input, index) =>
          index === i ? { ...input, value: value } : input,
        ),
      );
      setInputAllocatedTokens(currentPoints + value);
    } else {
      console.log("can't exceed 100% points");
    }
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

  const calcMemberSupportedProposalsPct = calcDivisionToPct(
    inputAllocatedTokens,
    memberActivatedPoints,
    tokenDecimals,
  );

  const calcMemberPoolWeight = calcDivisionToPct(
    memberActivatedPoints,
    strategy.totalEffectiveActivePoints,
    tokenDecimals,
  );

  const calcPoolWeightUsed = (number: number) => {
    return ((Number(number) * Number(calcMemberPoolWeight)) / 100)
      .toFixed(1)
      .toString();
  };

  return (
    <>
      <PoolGovernance
        memberActivatedPoints={memberActivatedPoints}
        tokenDecimals={tokenDecimals}
        strategy={strategy}
        communityAddress={communityAddress}
        memberTokensInCommunity={memberTokensInCommunity}
      />
      <section className="rounded-lg border-2 border-black bg-white p-12">
        <div className="mx-auto max-w-5xl space-y-10">
          <header className="flex items-center justify-between">
            <div className="flex w-full items-baseline justify-between">
              <h3 className="font-semibold">Proposals</h3>
              {proposals.length === 0 ? (
                <h4 className="text-2xl text-info">
                  No submitted proposals to support
                </h4>
              ) : (
                !editView && (
                  <Button
                    icon={<AdjustmentsHorizontalIcon height={24} width={24} />}
                    onClick={() => setEditView((prev) => !prev)}
                    disabled={disableManSupportButton}
                    tooltip={String(tooltipMessage)}
                  >
                    Manage support
                  </Button>
                )
              )}
            </div>
            {editView && (
              <>
                <div className="flex w-full items-start text-right">
                  <div className="flex w-full flex-col items-center">
                    <p className={`text-center text-4xl text-info`}>
                      {calcPoolWeightUsed(calcMemberSupportedProposalsPct)} %
                    </p>
                    <p className="text-md text-left">Pool weight used</p>
                  </div>
                  <div className="flex w-full flex-col items-center">
                    <p
                      className={`text-center text-5xl ${Number(calcMemberSupportedProposalsPct) >= 100 && "text-warning"}`}
                    >
                      {calcMemberSupportedProposalsPct} %
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
            {proposals.map(
              ({ title, proposalNumber, proposalStatus, id }, i) => (
                <React.Fragment key={id + "_" + i}>
                  <ProposalCard
                    inputData={inputs[i]}
                    stakedFilter={stakedFilters[i]}
                    title={title}
                    proposalNumber={proposalNumber}
                    proposalStatus={proposalStatus}
                    i={i}
                    id={id}
                    isEditView={editView}
                    tooltipMessage={tooltipMessage}
                    memberActivatedPoints={memberActivatedPoints}
                    tokenDecimals={tokenDecimals}
                    executeDisabled={
                      proposalStatus == 4 || !isConnected || missmatchUrl
                    }
                    strategy={strategy}
                    alloInfo={alloInfo}
                    triggerRenderProposals={triggerRenderProposals}
                    inputHandler={inputHandler}
                  />
                </React.Fragment>
              ),
            )}
          </div>
          <div className="flex justify-end gap-8">
            {editView && (
              <>
                <Button
                  variant="error"
                  onClick={() => setEditView((prev) => !prev)}
                >
                  Cancel
                </Button>
                <Button
                  className="min-w-[200px]"
                  onClick={() => submit()}
                  isLoading={allocateStatus === "loading"}
                  disabled={inputAllocatedTokens > memberActivatedPoints}
                  tooltip="Assigned points can't exceed total activated points pool"
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
            <FormLink href={createProposalUrl} label="Create Proposal" />
          </div>
        </div>
      </section>
    </>
  );
}
