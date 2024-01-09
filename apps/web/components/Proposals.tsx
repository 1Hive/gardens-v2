"use client";
import React, { useState, useEffect } from "react";
import { Button, Badge } from "@/components";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContractWrite, useContractRead, useContractReads } from "wagmi";
import { contractsAddresses, alloContract } from "@/constants/contracts";
import { encodeFunctionResult } from "viem";
import { TransactionData } from "@allo-team/allo-v2-sdk/dist/Common/types";
import { Abi } from "viem";
import { Allo } from "@allo-team/allo-v2-sdk/";
import CVStrategyABI from "#/contracts/out/CVStrategy.sol/CVStrategy.json";

export function Proposals() {
  const [editView, setEditView] = useState(false);
  const [distributedPoints, setDistributedPoints] = useState(0);
  const [inputs, setInputs] = useState<InputItem[]>(
    proposalsItems.map(({ id, value }) => ({ id: id, value: value })),
  );
  const pathname = usePathname();

  useEffect(() => {
    setDistributedPoints(calculatePoints());
  }, []);

  const submit = async () => {
    const encodedData = getEncodedProposals(inputs, proposalsItems);

    // writeContract({
    //   args: [poolId, encodedData],
    // });

    const allo = new Allo({ chain: 31337 });

    const poolId = 1;
    const strategyData = "strategy_data_here";

    const txData: TransactionData = allo.allocate(poolId, strategyData);

    // Client could be from ethers, viem, etc.
    // const hash = await client.sendTransaction({
    //   data: txData.data,
    //   account,
    //   to: txData.to, // put localhost address for Allo
    //   value: BigInt(txData.value),
    // });

    // console.log(`Transaction hash: ${hash}`);
  };

  const {
    isLoading,
    write: writeContract,
    isError,
    error,
  } = useContractWrite({
    address: contractsAddresses.allo,
    abi: alloContract.abi,
    functionName: "allocate",
    // value: BigInt(1000000000),
  });

  useEffect(() => {
    console.log(error);
  }, [error, isError]);

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

    const encodedData = encodeFunctionResult({
      abi: alloContract.abi,
      functionName: "allocate",
      // value: ["???"],
    });

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
          {proposalsItems.map(({ label, type, id }, i) => (
            <div
              className="flex flex-col items-center justify-center gap-8 rounded-lg bg-surface p-4"
              key={id}
            >
              <div className="flex w-full items-center justify-between">
                <h4 className="font-semibold">{label}</h4>
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
      <ReadContractExample />
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

const ReadContractExample = () => {
  const alloContractReads = {
    address: contractsAddresses.allo,
    abi: alloContract.abi as Abi,
    onError: (error: any) => {
      console.log(error);
    },
    onSettled: (data: any) => {
      console.log(data);
    },
  };
  const { data, isLoading, isError, error } = useContractReads({
    contracts: [
      // {
      //   ...alloContractReads,
      //   functionName: "isPoolManager",
      //   args: [2, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
      // },
      // {
      //   ...alloContractReads,
      //   functionName: "getStrategy",
      //   args: [1],
      // },
      // {
      //   ...alloContractReads,
      //   functionName: "getTreasury",
      // },
      {
        ...alloContractReads,
        functionName: "getPool",
        args: [1],
      },
      {
        ...alloContractReads,
        functionName: "getPool",
        args: [2],
      },
    ],
  });
  // const { data, isLoading, isError, error } = useContractRead({
  //   //here is the addres of the strategy-pool to fetch the proposal in arg 1, 2, 3 ..
  //   address: "0xB6EFb6B6ED78ECa0B571d40Bf798AAbF57b6e615",
  //   abi: CVStrategyABI.abi as Abi,
  //   functionName: "getProposal",
  //   chainId: 31337,
  //   args: [1],
  //   onError: (error) => {
  //     console.log(error);
  //   },
  //   onSuccess: (data) => {
  //     console.log(data);
  //   },
  // });

  return (
    <>{/* <div>pool 1 Strate Address : {data?.toString() ?? ""}</div> */}</>
  );
};

// const { data, isLoading, isError, error } = useContractRead({
//   address: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
//   abi: CVStrategyABI.abi as Abi,
//   functionName: "getProposal",
//   chainId: 31337,
//   args: [1],
//   onError: (error) => {
//     console.log(error);
//   },
//   onSuccess: (data) => {
//     console.log(data);
//   },
// });

// const { data, isLoading, isError, error } = useContractRead({
//   address: contractsAddresses.allo,
//   abi: alloContract.abi as Abi,
//   functionName: "isPoolManager",
//   args: [2, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
//   onError: (error) => {
//     console.log(error);
//   },
//   onSettled: (data) => {
//     console.log(data);
//   },
// });
// const { data, isLoading, isError, error } = useContractRead({
//   address: contractsAddresses.allo,
//   abi: alloContract.abi as Abi,
//   functionName: "getStrategy",
//   args: [1],
//   onError: (error) => {
//     console.log(error);
//   },
//   onSettled: (data) => {
//     console.log(data);
//   },
// });
