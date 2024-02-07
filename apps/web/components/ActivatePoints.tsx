"use client";
import React, { useEffect } from "react";
import { Button } from "./Button";
import {
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { registryCommunityABI, cvStrategyABI } from "@/src/generated";
import { useAccount } from "wagmi";
import useErrorDetails, { getErrorName } from "@/utils/getErrorName";
import { abiWithErrors } from "@/utils/abiWithErrors";
import cn from "classnames";
import { toast } from "react-toastify";
import { confirmationsRequired } from "@/constants/contracts";
import { useViemClient } from "@/hooks/useViemClient";

type ActiveMemberProps = {
  strategyAddress: `0x${string}`;
  isMemberActived: boolean | undefined;
  errorMemberActivated: Error | null;
};

export function ActivatePoints({
  strategyAddress,
  isMemberActived,
  errorMemberActivated,
}: ActiveMemberProps) {
  const { address } = useAccount();
  const viemClient = useViemClient();

  const {
    data: activePointsData,
    write: writeActivatePoints,
    error: errorActivatePoints,
    isSuccess: isSuccessActivatePoints,
  } = useContractWrite({
    address: strategyAddress,
    abi: abiWithErrors(cvStrategyABI),
    functionName: "activatePoints",
  });

  const {
    data: deactivePointsData,
    write: writeDeactivatePoints,
    error: errorDeactivatePoints,
    isSuccess: isSuccessDeactivatePoints,
  } = useContractWrite({
    address: strategyAddress,
    abi: abiWithErrors(cvStrategyABI),
    functionName: "deactivatePoints",
  });

  // useEffect(() => {
  //   console.log("status", status);
  // }, [status]);

  useErrorDetails(errorActivatePoints, "activatePoints");
  useErrorDetails(errorDeactivatePoints, "deactivatePoints");
  useErrorDetails(errorMemberActivated, "memberActivatedInStrategies");

  // useEffect(() => {
  //   console.log("isMemberActived", isMemberActived);
  //   console.log("mainConnectedAccount", mainConnectedAccount);
  //   console.log("strategyAddress", strategyAddress);
  // }, [isMemberActived, mainConnectedAccount, strategyAddress]);

  const transactionReceipt = async () =>
    await viemClient.waitForTransactionReceipt({
      confirmations: confirmationsRequired,
      hash: isMemberActived
        ? deactivePointsData?.hash || "0x"
        : activePointsData?.hash || "0x",
    });

  async function handleChange() {
    isMemberActived ? writeDeactivatePoints?.() : writeActivatePoints?.();
  }
  
  useEffect(() => {
    if (isSuccessActivatePoints || isSuccessDeactivatePoints) {
      const receipt = transactionReceipt();
      toast
        .promise(receipt, {
          pending: "Transaction in progress",
          success: "Transaction Success",
          error: "Something went wrong",
        })
        .then((data) => {
          console.log(data);
        })
        .catch((error: any) => {
          console.error(`Tx failure: ${error}`);
        });
    }
  }, [isSuccessActivatePoints, isSuccessDeactivatePoints]);

  return (
    <Button onClick={handleChange} className="w-fit bg-primary">
      {isMemberActived ? "Deactivate Points" : "Activate Points"}
    </Button>
  );
}
