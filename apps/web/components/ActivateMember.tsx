"use client";
import React, { useState } from "react";

import { Button } from "./Button";
import {
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { registryGardensAbi, cvStrategyAbi } from "@/src/generated";
import { useAccount } from "wagmi";
import useErrorDetails from "@/utils/getErrorName";
import { contractsAddresses } from "@/constants/contracts";

export function ActivateMember({
  strategyAddress,
}: {
  strategyAddress: `0x${string}`;
}) {
  // const connectedWallets = useWallets();
  // const mainConnectedAccount = connectedWallets[0]?.accounts[0].address;
  const { address: mainConnectedAccount } = useAccount();

  const {
    data: activePoints,
    write: writeActivatePoints,
    error: errorActivatePoints,
  } = useContractWrite({
    address: strategyAddress,
    abi: cvStrategyAbi,
    functionName: "activatePoints",
  });

  const {
    data: deactivePoints,
    write: writeDeactivatePoints,
    error: errorDeactivatePoints,
  } = useContractWrite({
    address: strategyAddress,
    abi: cvStrategyAbi,
    functionName: "deactivatePoints",
  });

  // memberActivatedInStrategies
  // args [member address, strategy address]
  const { data: isMemberActived, error: errorMemberActivated } =
    useContractRead({
      address: contractsAddresses.registryCommunity,
      abi: registryGardensAbi,
      functionName: "memberActivatedInStrategies",
      args: [mainConnectedAccount as `0x${string}`, strategyAddress],
      watch: true,
      cacheOnBlock: true,
    });

  useErrorDetails(errorActivatePoints, "activatePoints");
  useErrorDetails(errorDeactivatePoints, "deactivatePoints");
  useErrorDetails(errorMemberActivated, "memberActivatedInStrategies");

  console.log("isMemberActived", isMemberActived);
  console.log("mainConnectedAccount", mainConnectedAccount);
  console.log("strategyAddress", strategyAddress);

  async function handleChange() {
    isMemberActived ? writeDeactivatePoints?.() : writeActivatePoints?.();
  }

  return (
    <>
      <Button onClick={handleChange} className="w-fit bg-primary">
        {isMemberActived ? "Deactivate Points" : "Activate Points"}
      </Button>
    </>
  );
}
