"use client";
import React, { useEffect } from "react";
import { Button } from "./Button";
import { useContractWrite } from "wagmi";
import { cvStrategyABI } from "@/src/generated";
import { useAccount } from "wagmi";
import useErrorDetails from "@/utils/getErrorName";
import { abiWithErrors } from "@/utils/abiWithErrors";
// import cn from "classnames";
import { toast } from "react-toastify";
import { confirmationsRequired } from "@/constants/contracts";
import { useViemClient } from "@/hooks/useViemClient";
import { useConnectModal } from "@rainbow-me/rainbowkit";

type ActiveMemberProps = {
  strategyAddress: `0x${string}`;
  isMemberActived: boolean | undefined;
};

export function ActivatePoints({
  strategyAddress,
  isMemberActived,
}: ActiveMemberProps) {
  const { address } = useAccount();
  const viemClient = useViemClient();
  const { openConnectModal } = useConnectModal();
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

  useErrorDetails(errorActivatePoints, "activatePoints");
  useErrorDetails(errorDeactivatePoints, "deactivatePoints");

  const transactionReceipt = async () =>
    await viemClient.waitForTransactionReceipt({
      confirmations: confirmationsRequired,
      hash: isMemberActived
        ? deactivePointsData?.hash || "0x"
        : activePointsData?.hash || "0x",
    });

  async function handleChange() {
    if (address) {
      if (isMemberActived) {
        writeDeactivatePoints?.();
      } else {
        writeActivatePoints?.();
      }
    } else {
      openConnectModal?.();
    }
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
      {address
        ? isMemberActived
          ? "Deactivate Points"
          : "Activate Points"
        : "Connect Wallet"}
    </Button>
  );
}
