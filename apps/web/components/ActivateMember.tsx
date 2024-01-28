"use client";
import React, { useEffect, useState } from "react";
import { Button } from "./Button";
import {
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { registryCommunityAbi, cvStrategyAbi } from "@/src/generated";
import { useAccount } from "wagmi";
import useErrorDetails, { getErrorName } from "@/utils/getErrorName";
import { contractsAddresses } from "@/constants/contracts";
import { abiWithErrors } from "@/utils/abiWithErrors";

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
    abi: abiWithErrors(cvStrategyAbi),
    functionName: "activatePoints",
  });

  const {
    data: deactivePoints,
    write: writeDeactivatePoints,
    error: errorDeactivatePoints,
  } = useContractWrite({
    address: strategyAddress,
    abi: abiWithErrors(cvStrategyAbi),
    functionName: "deactivatePoints",
  });

  // memberActivatedInStrategies
  // args [member address, strategy address]
  const {
    data: isMemberActived,
    error: errorMemberActivated,
    status,
  } = useContractRead({
    address: contractsAddresses.registryCommunity,
    abi: registryCommunityAbi,
    functionName: "memberActivatedInStrategies",
    args: [mainConnectedAccount as `0x${string}`, strategyAddress],
    watch: true,
    cacheOnBlock: true,
  });

  useEffect(() => {
    console.log("status", status);
  }, [status]);

  useErrorDetails(errorActivatePoints, "activatePoints");
  useErrorDetails(errorDeactivatePoints, "deactivatePoints");
  useErrorDetails(errorMemberActivated, "memberActivatedInStrategies");

  useEffect(() => {
    console.log("isMemberActived", isMemberActived);
    console.log("mainConnectedAccount", mainConnectedAccount);
    console.log("strategyAddress", strategyAddress);
  }, [isMemberActived, mainConnectedAccount, strategyAddress]);

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
