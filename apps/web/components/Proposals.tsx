"use client";
import React, { useState, useEffect } from "react";
import { Button, Badge } from "@/components";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContractWrite } from "wagmi";
import { useProposalsRead } from "@/hooks/useProposalsRead";
import { contractsAddresses } from "@/constants/contracts";
import { encodeFunctionParams } from "@/utils/encodeFunctionParams";
import { cvStrategyABI, alloABI } from "@/src/generated";

type ProposalsMock = {
  title: string;
  type: "funding" | "streaming" | "signaling";
  description: string;
  value: number;
  id: number;
};

type UnparsedProposal = {
  submitter: `0x${string}`;
  beneficiary: `0x${string}`;
  requestedToken: `0x${string}`;
  requestedAmount: number;
  stakedTokens: number;
  proposalType: any;
  proposalStatus: any;
  blockLast: number;
  convictionLast: number;
  agreementActionId: number;
  threshold: number;
  voterStakedPointsPct: number;
};

type Proposal = UnparsedProposal & ProposalsMock;

type InputItem = {
  value: number;
  id: number;
};

//!POOL == STRATEGY
export function Proposals({ poolId }: { poolId: string }) {
  const [editView, setEditView] = useState(false);
  const [distributedPoints, setDistributedPoints] = useState(0);
  const [message, setMessage] = useState("");
  const [inputs, setInputs] = useState<InputItem[]>([]);

  const { proposals } = useProposalsRead(Number(poolId));

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const newInputs = proposals.map(({ id, voterStakedPointsPct }) => ({
      id: id,
      value: voterStakedPointsPct,
    }));
    setInputs(newInputs);
  }, [proposals]);

  useEffect(() => {
    setDistributedPoints(calculatePoints());
  }, [inputs]);

  const submit = () => {
    const encodedData = getEncodedProposals(inputs, proposals);
    const poolId = 1;

    writeContract({
      args: [BigInt(poolId), encodedData as `0x${string}`],
    });
  };

  const { write: writeContract, isLoading } = useContractWrite({
    address: contractsAddresses.allo,
    abi: alloABI,
    functionName: "allocate",
    onError: (err) => {
      console.log(err);
    },
    onSuccess: (data) => {
      console.log(data);
      setMessage("Transaction sent, hash: " + data.hash);
    },
  });

  const getEncodedProposals = (
    inputData: InputItem[],
    currentData: Proposal[],
  ) => {
    const resultArr: number[][] = [];
    inputData.forEach((input) => {
      currentData.forEach((current) => {
        if (input.id === current.id) {
          const dif = input.value - current.voterStakedPointsPct;
          if (dif !== 0) resultArr.push([input.id, dif]);
        }
      });
    });

    const encodedData = encodeFunctionParams(cvStrategyABI, "supportProposal", [
      resultArr,
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
          {proposals?.map(({ title, type, id, stakedTokens }, i) => (
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
                        value={inputs[i]?.value}
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
                    <button className="btn btn-outline btn-info px-3 py-[6px] font-thin">
                      View Proposal
                    </button>
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
            <Button
              className="min-w-[200px] bg-secondary"
              onClick={() => submit()}
            >
              {!isLoading ? (
                "Save Changes"
              ) : (
                <span className="loading loading-spinner"></span>
              )}
            </Button>
          )}
        </div>
        <div className="">
          <p className="font-semibold">{message}</p>
        </div>
      </div>
    </section>
  );
}

// interface Proposal extends InputItem {
//   title: string;
//   type: "funding" | "streaming" | "signaling";
// }

// const proposalsItems: Proposal[] = [
//   {
//     title: "Buy a billboard in Times Square",
//     type: "funding",
//     value: 0,
//     id: 0,
//   },
//   {
//     title: "Zack active contributor",
//     type: "streaming",
//     value: 0,
//     id: 1,
//   },
//   {
//     title: "Current signaling proposal",
//     type: "signaling",
//     value: 0,
//     id: 2,
//   },
// ];
