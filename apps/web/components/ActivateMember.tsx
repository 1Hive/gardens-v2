"use client";
import React from "react";
import { Button } from "./Button";
import { useReadContract, useWriteContract } from "wagmi";
import { registryGardensAbi, cvStrategyAbi } from "@/src/generated";
import { useWallets } from "@web3-onboard/react";

export function ActivateMember({
  strategyAddress,
}: {
  strategyAddress: `0x${string}`;
}) {
  const connectedWallets = useWallets();
  const mainConnectedAccount = connectedWallets[0]?.accounts[0].address;

  const {
    data: activePoints,
    writeContract,
    status,
    error,
  } = useWriteContract();

  // memberActivatedInStrategies
  // args [member address, strategy address]
  const { data: isMemberActived } = useReadContract({
    address: strategyAddress,
    abi: registryGardensAbi,
    functionName: "memberActivatedInStrategies",
    args: [mainConnectedAccount as `0x${string}`, strategyAddress],
  });

  console.log(error, isMemberActived, mainConnectedAccount, strategyAddress);

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
