"use client";
import React, { useState, useEffect } from "react";
import { Button, Badge } from "@/components";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContractWrite } from "wagmi";
import { useProposalsRead } from "@/hooks/useProposalsRead";
import { contractsAddresses } from "@/constants/contracts";
import { encodeFunctionParams } from "@/utils/encodeFunctionParams";
import { cvStrategyABI, alloABI } from "@/src/generated";
import { useBalance } from "wagmi";

//!POOL == STRATEGY
export function Proposals({ poolId }: { poolId: string }) {
  const [editView, setEditView] = useState(false);
  const [distributedPoints, setDistributedPoints] = useState(0);

  const [inputs, setInputs] = useState<InputItem[]>(
    proposalsItems.map(({ id, value }) => ({ id: id, value: value })),
  );
  const pathname = usePathname();

  //Proposals
  const { proposals, strategyAddress, tokenAddress } = useProposalsRead({
    poolId: Number(poolId),
  });

  console.log(proposals);
  //
  const balance = useBalance({
    address: strategyAddress,
    token: tokenAddress,
    onError: (error) => {
      console.log(error);
    },
    onSettled: (data) => {
      console.log(data);
    },
  });

  useEffect(() => {
    setDistributedPoints(calculatePoints());
  }, []);

  const submit = () => {
    const encodedData = getEncodedProposals(inputs, proposalsItems);
    const poolId = 1;

    console.log([poolId, encodedData]);

    writeContract({
      args: [BigInt(poolId), encodedData as `0x${string}`],
    });
  };

  const { write: writeContract } = useContractWrite({
    address: contractsAddresses.allo,
    abi: alloABI,
    chainId: 31337,
    functionName: "allocate",
    onError: (err) => {
      console.log(err);
    },
    onSuccess: (data) => {
      console.log(data);
    },
  });

  const getEncodedProposals = (
    inputData: InputItem[],
    currentData: Proposal[],
  ) => {
    const resultArr: InputItem[] = [];
    inputData.forEach((input) => {
      currentData.forEach((current) => {
        if (input.id === current.id) {
          const dif = input.value - current.value;
          if (dif !== 0) resultArr.push({ id: input.id, value: dif });
        }
      });
    });

    const encodedData = encodeFunctionParams(cvStrategyABI, "supportProposal", [
      [
        // [proposalId, deltaSupport]
        [1, 30],
        // [2, 30],
      ],
    ]);
    return encodedData;
  };

  const inputHandler = (i: number, value: number) => {
    const currentPoints = calculatePoints(i);
    if (currentPoints + value <= 100) {
      setInputs(
        inputs.map((input, index) =>
          index === i ? { ...input, value: value } : input,
        ),
      );
      setDistributedPoints(currentPoints + value);
    } else console.log("can't exceed 100% points");
  };

  const calculatePoints = (exceptIndex?: number) =>
    inputs.reduce((acc, curr, i) => {
      if (exceptIndex !== undefined && exceptIndex === i) return acc;
      else return acc + curr.value;
    }, 0);

  return (
    <section className="rounded-lg border-2 border-black bg-white p-16">
      <span className="absolute top-20 border-4 ">balance</span>
      {/* points */}
      <div></div>

      {/* proposals: title - proposals -create Button */}
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="flex items-center justify-between">
          <h3 className="">Proposals</h3>
          {editView && (
            <span
              className={`${
                distributedPoints >= 100 && "scale-110 font-semibold text-red"
              } transition-all`}
            >
              {distributedPoints >= 100
                ? "Max points reached: "
                : "Total distributed: "}
              {distributedPoints} %
            </span>
          )}
        </header>
        <div className="flex flex-col gap-6">
          {proposals?.map(({ title, type, id }, i) => (
            <div
              className="flex flex-col items-center justify-center gap-8 rounded-lg bg-surface p-4"
              key={id}
            >
              <div className="flex w-full items-center justify-between">
                <h4 className="font-semibold">{title}</h4>
                <div>
                  <Badge type={type} />
                  {!editView && (
                    <Link href={`${pathname}/proposals/${id}`} className="ml-8">
                      <Button className="bg-primary px-3 py-[6px]">
                        View Proposal
                      </Button>
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
                        value={inputs[i].value}
                        className={`range-aja range range-sm min-w-[420px]`}
                        step="5"
                        onChange={(e) =>
                          inputHandler(i, Number(e.target.value))
                        }
                      />
                      <div className="flex w-full justify-between px-[10px] text-[4px]">
                        {[...Array(21)].map((_, i) => (
                          <span key={i}>|</span>
                        ))}
                      </div>
                    </div>
                    <div className="mb-2">{inputs[i].value} %</div>
                  </div>
                  <Link href={`${pathname}/proposals/${id}`}>
                    <Button className="bg-primary px-3 py-[6px]">
                      View Proposal
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8">
          <Button className="bg-primary">Create Proposal</Button>
          <Button
            className="bg-accent"
            onClick={() => setEditView((prev) => !prev)}
          >
            Manage support
          </Button>
          {editView && (
            <Button className="bg-secondary" onClick={() => submit()}>
              Save changes
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

interface InputItem {
  value: number;
  id: number;
}
interface Proposal extends InputItem {
  label: string;
  type: "funding" | "streaming" | "signaling";
}

const proposalsItems: Proposal[] = [
  {
    label: "Buy a billboard in Times Square",
    type: "funding",
    value: 10,
    id: 0,
  },
  {
    label: "Zack active contributor",
    type: "streaming",
    value: 45,
    id: 1,
  },
  {
    label: "Current signaling proposal",
    type: "signaling",
    value: 25,
    id: 2,
  },
];
