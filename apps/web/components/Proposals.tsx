"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Button, StatusBadge } from "@/components";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useAccount,
  useContractWrite,
  Address as AddressType,
  useContractRead,
} from "wagmi";
import { confirmationsRequired } from "@/constants/contracts";
import { encodeFunctionParams } from "@/utils/encodeFunctionParams";
import { alloABI, cvStrategyABI, registryCommunityABI } from "@/src/generated";
import { getProposals } from "@/actions/getProposals";
import { formatTokenAmount } from "@/utils/numbers";
import useErrorDetails from "@/utils/getErrorName";
import { ProposalStats } from "@/components";
import { toast } from "react-toastify";
import { useViemClient } from "@/hooks/useViemClient";
import {
  getStrategyByPoolQuery,
  isMemberDocument,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { AlloQuery } from "@/app/(app)/gardens/[chain]/[garden]/pool/[poolId]/page";
import { useIsMemberActivated } from "@/hooks/useIsMemberActivated";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { encodeAbiParameters, formatUnits, parseUnits } from "viem";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { useTotalVoterStakedPct } from "@/hooks/useTotalVoterStakedPct";
import * as dnum from "dnum";
import { useUrqlClient } from "@/hooks/useUqrlClient";
import { queryByChain } from "@/providers/urql";
import { getChainIdFromPath } from "@/utils/path";
import { useTooltipMessage, ConditionObject } from "@/hooks/useTooltipMessage";

type InputItem = {
  id: string;
  value: number;
};

export type Strategy = getStrategyByPoolQuery["cvstrategies"][number];
export type Proposal = Strategy["proposals"][number];
export type StakesMemberType = isMemberQuery["members"][number]["stakes"];

export type ProposalTypeVoter = Proposal & {
  title: string;
  type: number;
};

const getProposalId = (inputString: string) => {
  if (inputString.length >= 2) {
    return inputString.substring(2);
  } else {
    return "0x0";
  }
};

export function Proposals({
  strategy,
  alloInfo,
  communityAddress,
}: {
  strategy: Strategy;
  alloInfo: AlloQuery;
  communityAddress: Address;
}) {
  const DECIMALS = strategy.registryCommunity.garden.decimals;

  const [editView, setEditView] = useState(false);
  // const [distributedPoints, setDistributedPoints] = useState(0);
  const [inputAllocatedTokens, setInputAllocatedTokens] = useState<number>(0);
  const [inputs, setInputs] = useState<InputItem[]>([]);

  const [proposals, setProposals] = useState<ProposalTypeVoter[]>([]);
  const [totalAllocatedTokens, setTotalAllocatedTokens] = useState<bigint>(0n);

  const [message, setMessage] = useState("");

  //using this for test alpha
  const { address: connectedAccount } = useAccount();
  // const { voterStake } = useTotalVoterStakedPct(strategy);
  const [memberTokensInPool, setMemberTokensInPool] = useState<number>(0);
  const [stakedFilteres, setStakedFilteres] = useState<InputItem[]>([]);

  const { address } = useAccount();
  const pathname = usePathname();

  const { isMemberActived } = useIsMemberActivated(strategy);

  const urqlClient = useUrqlClient();

  const chainId = getChainIdFromPath();
  //TODO: make hook for this

  // const { data: memberPointsVotingPower } = useContractRead({
  //   address: communityAddress as Address,
  //   abi: abiWithErrors(registryCommunityABI),
  //   functionName: "getMemberPowerInStrategy",
  //   args: [connectedAccount as Address, strategyAddress],
  // });

  const runIsMemberQuery = useCallback(async () => {
    if (address === undefined) {
      console.error("address is undefined");
      return;
    }
    // console.log("address", address);
    // console.log("strategy.registryCommunity.id", strategy.registryCommunity.id);
    const { data: result, error } = await queryByChain<isMemberQuery>(
      urqlClient,
      chainId,
      isMemberDocument,
      {
        me: address.toLowerCase(),
        comm: strategy.registryCommunity.id.toLowerCase(),
      },
    );

    // console.log("result IsMemberNew", result);

    let _stakesFilteres: StakesMemberType = [];
    let totalStakedAmount: bigint = 0n;

    if (result && result.members.length > 0) {
      totalStakedAmount =
        result.members[0].memberCommunity?.[0]?.stakedAmount ?? 0n;

      // console.log("totalStakedAmount", totalStakedAmount);
      // setVoterStake(Number(totalStakedAmount));
      setMemberTokensInPool(Number(totalStakedAmount));

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

    const memberStakes: InputItem[] = _stakesFilteres.map((item) => ({
      id: getProposalId(item.proposal.id),
      value: item.amount,
    }));
    console.log(memberStakes);
    setTotalAllocatedTokens(totalStaked);
    setStakedFilteres(memberStakes);
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
    const newInputs = proposals.map(({ id, stakedAmount }) => {
      let returnItem = { id: getProposalId(id), value: 0 };
      stakedFilteres.forEach((item, index) => {
        if (getProposalId(id) === item.id) {
          returnItem = {
            id: getProposalId(id),
            value: stakedFilteres[Number(index)]?.value,
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
  }, [proposals]);

  useEffect(() => {
    setInputAllocatedTokens(calculateTotalTokens());
  }, [inputs]);

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

  //encode proposal id to pass as argument to distribute function
  const encodedDataProposalId = (proposalId: string) => {
    const getproposalId = getProposalId(proposalId);
    const encodedProposalId = encodeAbiParameters(
      [{ name: "proposalId", type: "uint" }],
      [BigInt(getproposalId)],
    );

    return encodedProposalId;
  };

  //test executing a proposal with distribute function
  const {
    data: distributeData,
    write: writeDistribute,
    error: errorDistribute,
    isSuccess: isSuccessDistribute,
    status: distributeStatus,
  } = useContractWrite({
    address: alloInfo.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "distribute",
  });
  //

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
    const encodedData = getEncodedProposals(inputs, proposals);
    // const poolId = Number(poolID);
    const poolId = Number(strategy.poolId);
    // console.log("poolId", poolId);
    writeAllocate({
      args: [BigInt(poolId), encodedData as AddressType],
    });
  };

  const getEncodedProposals = (
    inputData: InputItem[],
    currentData: ProposalTypeVoter[],
  ) => {
    const resultArr: [number, BigInt][] = [];
    inputData.forEach((input) => {
      currentData.forEach((current) => {
        if (input.id === current.id) {
          const dif = BigInt(input.value - current.stakedAmount);
          console.log(
            "dif",
            formatUnits(
              BigInt(current.stakedAmount) - BigInt(input.value),
              DECIMALS,
            ),
          );
          if (dif !== BigInt(0)) {
            resultArr.push([Number(input.id), dif]);
          }
        }
      });
    });

    // console.log(
    //   "resultArr",
    //   resultArr,
    //   currentData[2].stakedAmount,
    //   inputData[0].value,
    // );
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
    // const currentPoints = calculatePoints(i);
    const pointsDistributed = Number(totalAllocatedTokens);
    // console.log("currentPoints", currentPoints);
    console.log("value", value);

    // if (pointsDistributed + value <= memberTokensInPool) {
    setInputs(
      inputs.map((input, index) =>
        index === i ? { ...input, value: value } : input,
      ),
    );
    setInputAllocatedTokens(pointsDistributed + value);
    // } else {
    //   console.log("can't exceed 100% points");
    // }
  };

  //ManageSupport Tooltip condition => message mapping
  const disableManageSupportBtnCondition: ConditionObject[] = [
    {
      condition: !isMemberActived,
      message: "Activate your points to support proposals",
    },
  ];
  const disableManSupportButton = disableManageSupportBtnCondition.some(
    (cond) => cond.condition,
  );
  const tooltipMessage = useTooltipMessage(disableManageSupportBtnCondition);

  //Execute Tooltip condition => message mapping
  // const disableExecuteBtnCondition: ConditionObject[] = [
  //   {
  //     condition: proposals.some((proposal) => proposal.proposalStatus == "4"),
  //     message: "Proposal already executed",
  //   },
  // ];
  // const disableExecuteButton = disableExecuteBtnCondition.some(
  //   (cond) => cond.condition,
  // );
  // const tooltipMessageExecuteBtn = useTooltipMessage(
  //   disableExecuteBtnCondition,
  // );

  return (
    <section className="rounded-lg border-2 border-black bg-white p-12">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="flex items-center justify-between">
          <div className="flex w-full items-baseline justify-between">
            <h3 className="font-semibold">Proposals</h3>
            {proposals.length === 0 ? (
              <h4 className="text-lg font-semibold">
                No submitted proposals to support
              </h4>
            ) : (
              !editView && (
                <Button
                  icon={<AdjustmentsHorizontalIcon height={24} width={24} />}
                  onClick={() => setEditView((prev) => !prev)}
                  disabled={disableManSupportButton}
                  tooltip={tooltipMessage}
                >
                  Manage support
                </Button>
              )
            )}
          </div>
          {editView && (
            <>
              <div className="w-full text-right text-2xl">
                <span
                  className={`${
                    inputAllocatedTokens >= memberTokensInPool &&
                    "scale-110 font-semibold text-red"
                  } transition-all`}
                >
                  Assigned:{" "}
                  <span
                    className={`text-3xl font-bold  ${inputAllocatedTokens >= memberTokensInPool ? "text-red" : "text-success"} `}
                  >
                    {formatTokenAmount(inputAllocatedTokens, DECIMALS)}
                  </span>{" "}
                  / {formatTokenAmount(memberTokensInPool, DECIMALS)}
                  {" " + strategy.registryCommunity.garden.symbol}
                </span>
              </div>
            </>
          )}
        </header>
        <div className="flex flex-col gap-6">
          {proposals.map(
            ({ title, type, id, proposalStatus, stakedAmount }, i) => (
              <div
                className="flex flex-col items-center justify-center gap-4 rounded-lg bg-surface p-8"
                key={title + "_" + id}
              >
                <div className="flex w-full items-center justify-between ">
                  <div className="flex flex-[30%] flex-col items-baseline gap-2">
                    <h4 className="text-2xl font-bold">{title}</h4>
                    <span className="text-md">ID {getProposalId(id)}</span>
                  </div>

                  <div className="flex items-center gap-8">
                    <StatusBadge status={proposalStatus} />
                    {/* Button to test distribute */}
                    {!editView && (
                      <Button
                        // TODO: add flexible tooltip and func to check executability
                        disabled={proposalStatus == "4"}
                        tooltip={"Proposal already executed"}
                        onClick={() =>
                          writeDistribute?.({
                            args: [
                              strategy.poolId,
                              [strategy.id],
                              encodedDataProposalId(id),
                            ],
                          })
                        }
                      >
                        Execute proposal
                      </Button>
                    )}
                    <>
                      <Link href={`${pathname}/proposals/${id}`}>
                        <Button variant="outline">View Proposal</Button>
                      </Link>
                    </>
                  </div>
                </div>
                {editView && (
                  <div className="flex w-full flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-8">
                      <div>
                        <input
                          key={i}
                          type="range"
                          min={0}
                          max={memberTokensInPool}
                          value={
                            // getProposalId(id) ===
                            inputs[i]?.value
                            // stakedFilteres?[i].amount
                          }
                          className={`range range-success range-sm min-w-[420px]`}
                          step={memberTokensInPool / 100}
                          onChange={(e) =>
                            inputHandler(i, Number(e.target.value))
                          }
                        />
                        <div className="flex w-full justify-between px-[10px] text-[4px]">
                          {[...Array(21)].map((_, i) => (
                            <span key={"span_" + i}>|</span>
                          ))}
                        </div>
                      </div>
                      <div className="mb-2">
                        {Number(
                          (inputs[i].value * 100) / memberTokensInPool,
                        ).toFixed(2)}
                        %
                      </div>
                    </div>
                    <div className="flex max-w-xs flex-1 items-baseline justify-center gap-2">
                      {inputs[i]?.value > 0n ? (
                        <p className="text-success">
                          Assigned{" "}
                          <span className="text-2xl font-bold">
                            {formatTokenAmount(
                              inputs[i]?.value.toString(),
                              DECIMALS,
                            )}
                          </span>{" "}
                          {strategy.registryCommunity.garden.symbol}
                        </p>
                      ) : (
                        <p className="text-gray-400">
                          You have no support on this proposal yet
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
              >
                Save changes
              </Button>
            </>
          )}
        </div>
        <div className="">
          <p className="font-semibold">{message}</p>
        </div>

        {/*  PROPOSALS STATS  ///// */}
        {/* <ProposalStats
          proposals={proposals}
          distributedPoints={distributedPoints}
        /> */}
      </div>
    </section>
  );
}
