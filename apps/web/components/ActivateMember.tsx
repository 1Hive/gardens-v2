"use client";
import React from "react";
import { Button } from "./Button";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { registryGardensAbi, cvStrategyAbi } from "@/src/generated";

export function ActivateMember({
  strategyAddress,
}: {
  strategyAddress: `0x${string}`;
}) {
  const account = useAccount();
  const { address } = account;

  const {
    data: activePoints,
    writeContract,
    status,
    error,
  } = useWriteContract();

  // memberActivatedInStrategies
  const { data: isMemberActived } = useReadContract({
    address: strategyAddress,
    abi: registryGardensAbi,
    functionName: "memberActivatedInStrategies",
    args: [address as `0x${string}`, strategyAddress],
  });

  console.log(activePoints, status, error, isMemberActived);

  return (
    <Button
      onClick={() =>
        writeContract?.({
          address: strategyAddress,
          abi: cvStrategyAbi,
          functionName: `${
            isMemberActived ? "deactivatePoints" : "activatePoints"
          }`,
        })
      }
      className="w-fit bg-primary"
    >
      {isMemberActived ? "Deactivate Points" : "Activate Points"}
    </Button>
  );
}
