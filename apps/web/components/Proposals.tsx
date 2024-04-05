"use client";
import React, { useState, useEffect } from "react";
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
import { PRECISION_SCALE, getProposals } from "@/actions/getProposals";
import useErrorDetails from "@/utils/getErrorName";
import { ProposalStats } from "@/components";
import { toast } from "react-toastify";
import { useViemClient } from "@/hooks/useViemClient";
import { getStrategyByPoolQuery } from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { AlloQuery } from "@/app/(app)/gardens/[chain]/[garden]/pool/[poolId]/page";
import { useIsMemberActivated } from "@/hooks/useIsMemberActivated";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { encodeAbiParameters } from "viem";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { useTotalVoterStakedPct } from "@/hooks/useTotalVoterStakedPct";
import { number } from "echarts";

type InputItem = {
  id: string;
  value: number;
};

export type Strategy = getStrategyByPoolQuery["cvstrategies"][number];
export type Proposal = Strategy["proposals"][number];

export type ProposalTypeVoter = Proposal & {
  voterStakedPointsPct: number;
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
}: {
  strategy: Strategy;
  alloInfo: AlloQuery;
}) {
  const [editView, setEditView] = useState(false);
  const [distributedPoints, setDistributedPoints] = useState(0);

  const [pointsDistrubutedSum, setPointsDistrubutedSum] = useState(0);
  const [message, setMessage] = useState("");
  const [inputs, setInputs] = useState<InputItem[]>([]);
  const [proposals, setProposals] = useState<ProposalTypeVoter[]>([]);
  const { address } = useAccount();
  const pathname = usePathname();
  const [strategyAddress, setStrategyAddress] = useState<Address>("0x0"); //@todo should be higher level HOC

  const { isMemberActived } = useIsMemberActivated(strategy);

  const { voterStake } = useTotalVoterStakedPct(strategy);

  //TODO: all total member points
  // const { data: memberPointsVotingPower } = useContractRead({
  //   address: communityAddress as Address,
  //   abi: abiWithErrors(registryCommunityABI),
  //   functionName: "getMemberPowerInStrategy",
  //   args: [connectedAccount as Address, strategyAddress],
  //   watch: true,
  // });

  // const memberPointsInPool = (
  //   (memberPointsVotingPower as unknown as bigint) / PRECISION_SCALE
  // ).toString();

  useEffect(() => {
    setStrategyAddress(strategy.id as Address);
  }, [strategy.id]);

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
    const newInputs = proposals.map(
      ({ id, voterStakedPointsPct, stakedAmount }) => ({
        id: id,
        value: voterStakedPointsPct,
        stakedAmount: stakedAmount,
      }),
    ); // [] -> parseas -> handeleas lo que quieras -> parsear ->  envias
    // console.log("newInputs", newInputs);
    console.log("newInputs", newInputs);
    setInputs(newInputs);
  }, [proposals]);

  useEffect(() => {
    setDistributedPoints(calculatePoints());
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
          const dif =
            BigInt(input.value - current.voterStakedPointsPct) *
            PRECISION_SCALE;
          if (dif !== BigInt(0)) {
            resultArr.push([Number(input.id), dif]);
          }
        }
      });
    });

    // console.log("resultArr", resultArr);
    const encodedData = encodeFunctionParams(cvStrategyABI, "supportProposal", [
      resultArr,
    ]);
    return encodedData;
  };

  // const inputHandler = (i: number, value: number) => {
  //   const currentPoints = calculatePoints(i);
  //   console.log("currentPoints", currentPoints);
  //   console.log("value", value);
  //   if (currentPoints + value <= 100) {
  //     setInputs(
  //       inputs.map((input, index) =>
  //         index === i ? { ...input, value: value } : input,
  //       ),
  //     );
  //     setDistributedPoints(currentPoints + value);
  //   } else {
  //     console.log("can't exceed 100% points");
  //   }
  // };
  const inputHandler = (i: number, value: number) => {
    const currentPoints = calculatePoints(i);
    const pointsDistributed = Number(voterStake);
    console.log("currentPoints", currentPoints);
    console.log("value", value);
    if (currentPoints + value <= 100) {
      setInputs(
        inputs.map((input, index) =>
          index === i ? { ...input, value: value } : input,
        ),
      );
      console.log("Sum", pointsDistrubutedSum + pointsDistributed);
      setPointsDistrubutedSum(currentPoints + value);
    } else {
      console.log("can't exceed 100% points");
    }
  };

  const calculatePoints = (exceptIndex?: number) =>
    inputs.reduce((acc, curr, i) => {
      if (exceptIndex !== undefined && exceptIndex === i) return acc;
      else return acc + curr.value;
    }, 0);

  return (
    <section className="rounded-lg border-2 border-black bg-white p-12">
      {/* proposals: title - proposals -create Button */}
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="flex items-center justify-between">
          <div className="flex w-full items-baseline justify-between">
            <h3 className="font-semibold">Proposals</h3>
            {!editView && (
              <Button
                icon={<AdjustmentsHorizontalIcon height={24} width={24} />}
                onClick={() => setEditView((prev) => !prev)}
                disabled={!isMemberActived}
                tooltip="Activate your points to support proposals"
              >
                Manage support
              </Button>
            )}
          </div>
          {editView && (
            <>
              <div className="w-full text-right text-3xl">
                <span
                  className={`${
                    distributedPoints >= 100 &&
                    "scale-110 font-semibold text-red"
                  } transition-all`}
                >
                  Total distributed: {voterStake.toString()} pts
                </span>
              </div>
              <div>{distributedPoints}</div>
            </>
          )}
        </header>
        <div className="flex flex-col gap-6">
          {proposals.map(({ title, type, id, proposalStatus }, i) => (
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
                      disabled={proposalStatus == "4"}
                      tooltip="Proposal already Executed"
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
                      Execute proposal {proposalStatus}
                    </Button>
                  )}

                  {/* {!editView && ( */}
                  <>
                    <Link href={`${pathname}/proposals/${id}`}>
                      <Button variant="outline">View Proposal</Button>
                    </Link>
                  </>
                  {/* )} */}
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
                        max={100}
                        value={inputs[i]?.value}
                        className={`range range-success range-sm min-w-[420px]`}
                        step="5"
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
                    <div className="mb-2">{inputs[i].value} %</div>
                  </div>
                </div>
              )}
            </div>
          ))}
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

{
  /* {voterStakePct && Number(voterStakePct) !== 0 ? (
          <div className="flex h-48 flex-col items-center justify-center">
            <p className="rounded-xl bg-surface px-8 py-3 text-lg font-semibold">
              You have distributed:
            </p>
            <p className="text-5xl font-semibold">
              {Number(voterStakePct / PRECISION_SCALE)} %{" "}
              <span className="text-sm">of your points</span>
            </p>
          </div>
        ) : (
          // <ActivePointsChart stakedPoints={Number(voterStakePct)} />
          <div className="flex h-48 items-center justify-center">
            <p className="rounded-xl bg-warning p-2 text-lg font-semibold">
              No points distributed yet
            </p>
          </div>
        )} */
}
