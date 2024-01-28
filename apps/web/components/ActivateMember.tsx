"use client";
import React, { useEffect } from "react";
import { Button } from "./Button";
import { useContractWrite } from "wagmi";
import { cvStrategyAbi } from "@/src/generated";
import { useAccount } from "wagmi";
import useErrorDetails, { getErrorName } from "@/utils/getErrorName";
import { abiWithErrors } from "@/utils/abiWithErrors";
import cn from "classnames";

type ActiveMemberProps = {
  strategyAddress: `0x${string}`;
  isMemberActived: boolean | undefined;
  errorMemberActivated: Error | null;
};

export function ActivateMember({
  strategyAddress,
  isMemberActived,
  errorMemberActivated,
}: ActiveMemberProps) {
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
