"use client";
import React, { useState, useEffect } from "react";
import { Button, Badge } from "@/components";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useContractWrite } from "wagmi";
import { confirmationsRequired } from "@/constants/contracts";
import { encodeFunctionParams } from "@/utils/encodeFunctionParams";
import { alloABI, cvStrategyABI } from "@/src/generated";
import { getProposals } from "@/actions/getProposals";
import useErrorDetails from "@/utils/getErrorName";
import { ProposalStats } from "@/components";
import { toast } from "react-toastify";
import { useViemClient } from "@/hooks/useViemClient";
import { getStrategyByPoolQuery } from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { AlloQuery } from "@/app/(app)/gardens/[chain]/[garden]/communities/pool/[poolId]/page";
import { useIsMemberActivated } from "@/hooks/useIsMemberActivated";
import { abiWithErrors } from "@/utils/abiWithErrors";

export const convertBigIntToNumberFraction = (bigInt: bigint) => {
  return Number(bigInt.toString()) / 10 ** 4;
};

export const convertNumberFractionToBigInt = (number: number) => {
  return BigInt(number * 10 ** 4);
};

type InputItem = {
  id: string;
  value: bigint;
};

export type Strategy = getStrategyByPoolQuery["cvstrategies"][number];
export type Proposal = Strategy["proposals"][number];

export type ProposalTypeVoter = Proposal & {
  voterStakedPointsPct: bigint;
  title: string;
  type: number;
};

const BIGINT_100_SCALED = BigInt(100 * 10 ** 4);

//!POOL == STRATEGY
export function Proposals({
  strategy,
  alloInfo,
}: {
  strategy: Strategy;
  alloInfo: AlloQuery;
}) {
  const [editView, setEditView] = useState(false);
  const [distributedPoints, setDistributedPoints] = useState(BigInt(0));
  const [message, setMessage] = useState("");
  const [inputs, setInputs] = useState<InputItem[]>([]);
  const [proposals, setProposals] = useState<ProposalTypeVoter[]>([]);
  const { address } = useAccount();
  const pathname = usePathname();
  const router = useRouter();
  const [strategyAddress, setStrategyAddress] = useState<Address>("0x0"); //@todo should be higher level HOC

  const { isMemberActived } = useIsMemberActivated(strategy);

  useEffect(() => {
    setStrategyAddress(strategy.id as Address);
  }, [strategy.id]);

  const triggerRenderProposals = () => {
    // if (address !== undefined) {
    getProposals(address as Address, strategy).then((res) => {
      if (res !== undefined) {
        // console.log("res", res);
        setProposals(res);
      } else {
        console.log("no proposals");
      }
    });
    // }
  };

  useEffect(() => {
    triggerRenderProposals();
  }, [address]);

  useEffect(() => {
    const newInputs = proposals.map(({ id, voterStakedPointsPct }) => ({
      id: id,
      value: voterStakedPointsPct,
    }));
    // console.log("newInputs", newInputs);
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
    data: contractWriteData,
    write: writeAllocate,
    error: errorAllocate,
    isSuccess: isSuccessAllocate,
    status: contractStatus,
  } = useContractWrite({
    address: alloInfo.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "allocate",
  });

  useErrorDetails(errorAllocate, "errorAllocate");

  useEffect(() => {
    if (isSuccessAllocate) {
      setMessage("Transaction sent, hash: " + contractWriteData?.hash);

      const receipt = transactionReceipt();

      toast
        .promise(receipt, {
          pending: "Transaction in progress",
          success: "Transaction Success",
          error: "Something went wrong",
        })
        .then((data) => {
          console.log(data);
          triggerRenderProposals();
        })
        .catch((error: any) => {
          console.error(`Tx failure: ${error}`);
        });
    }
  }, [isSuccessAllocate, contractWriteData]);

  const viemClient = useViemClient();

  const transactionReceipt = async () =>
    await viemClient.waitForTransactionReceipt({
      confirmations: confirmationsRequired,
      hash: contractWriteData?.hash || "0x",
    });

  const submit = async () => {
    const encodedData = getEncodedProposals(inputs, proposals);
    // const poolId = Number(poolID);
    const poolId = Number(strategy.poolId);
    // console.log("poolId", poolId);

    writeAllocate({
      args: [BigInt(poolId), encodedData as `0x${string}`],
    });
  };

  const getEncodedProposals = (
    inputData: InputItem[],
    currentData: ProposalTypeVoter[],
  ) => {
    const resultArr: number[][] = [];
    inputData.forEach((input) => {
      currentData.forEach((current) => {
        if (input.id === current.id) {
          const dif = input.value - current.voterStakedPointsPct;
          if (dif !== BigInt(0)) {
            resultArr.push([Number(input.id), Number(dif)]);
          }
        }
      });
    });

    console.log("resultArr", resultArr);
    const encodedData = encodeFunctionParams(cvStrategyABI, "supportProposal", [
      resultArr,
    ]);
    return encodedData;
  };

  const inputHandler = (i: number, value: bigint) => {
    const currentPoints = calculatePoints(i);
    console.log("currentPoints", currentPoints);
    console.log("value", value);
    if (currentPoints + value <= BIGINT_100_SCALED) {
      setInputs(
        inputs.map((input, index) =>
          index === i ? { ...input, value: value } : input,
        ),
      );
      setDistributedPoints(currentPoints + value);
    } else {
      console.log("can't exceed 100% points");
    }
  };

  const calculatePoints = (exceptIndex?: number) =>
    inputs.reduce((acc, curr, i) => {
      if (exceptIndex !== undefined && exceptIndex === i) return acc;
      else return acc + curr.value;
    }, BigInt(0));

  return (
    <section className="rounded-lg border-2 border-black bg-white p-16">
      {/* proposals: title - proposals -create Button */}
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="flex items-center justify-between">
          <h3 className="">Proposals</h3>
          {editView && (
            <span
              className={`${
                distributedPoints >= BIGINT_100_SCALED &&
                "scale-110 font-semibold text-red"
              } transition-all`}
            >
              {distributedPoints >= BIGINT_100_SCALED
                ? "Max points reached: "
                : "Total distributed: "}
              {convertBigIntToNumberFraction(distributedPoints).toString()} pts
            </span>
          )}
        </header>
        <div className="flex flex-col gap-6">
          {proposals.map(({ title, type, id, stakedTokens }, i) => (
            <div
              className="flex flex-col items-center justify-center gap-8 rounded-lg bg-surface p-4"
              key={title + "_" + id}
            >
              <div className="flex w-full items-center justify-between">
                <h4 className="font-semibold">{title}</h4>
                <div>
                  <Badge type={Number(type)} />
                  {!editView && (
                    <Link href={`${pathname}/proposals/${id}`} className="ml-8">
                      <button className="btn btn-outline btn-info px-3 py-[6px]">
                        View Proposal
                      </button>
                    </Link>
                  )}
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
                        value={convertBigIntToNumberFraction(inputs[i]?.value)}
                        className={`range-aja range range-sm min-w-[420px]`}
                        step="5"
                        onChange={(e) =>
                          inputHandler(
                            i,
                            convertNumberFractionToBigInt(
                              Number(e.target.value),
                            ),
                          )
                        }
                      />
                      <div className="flex w-full justify-between px-[10px] text-[4px]">
                        {[...Array(21)].map((_, i) => (
                          <span key={"span_" + i}>|</span>
                        ))}
                      </div>
                    </div>
                    <div className="mb-2">
                      {convertBigIntToNumberFraction(inputs[i].value)} %
                    </div>
                  </div>
                  <Link href={`${pathname}/proposals/${id}`}>
                    <Button className="h-[38px] bg-slate-200">
                      View Proposal
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8">
          {/* <Button className={`bg-primary`}>Create Proposal</Button> */}
          {isMemberActived && (
            <Button
              className={`${editView ? "bg-red text-white" : "bg-primary"}`}
              onClick={() => setEditView((prev) => !prev)}
            >
              {editView ? "Cancel" : "Manage support"}
            </Button>
          )}
          {editView && (
            <Button
              className="min-w-[200px] bg-secondary"
              onClick={() => submit()}
              isLoading={contractStatus === "loading"}
            >
              Save changes
            </Button>
          )}
        </div>
        <div className="">
          <p className="font-semibold">{message}</p>
        </div>
        {/*  PROPOSALS STATS  ///// */}
        <ProposalStats
          proposals={proposals}
          distributedPoints={distributedPoints}
        />
      </div>
    </section>
  );
}
