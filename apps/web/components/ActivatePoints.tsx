"use client";
import React, { useEffect } from "react";
import { Button } from "./Button";
import { Address, useContractRead, useContractWrite, useAccount } from "wagmi";
import { cvStrategyABI, registryCommunityABI } from "@/src/generated";
import useErrorDetails from "@/utils/getErrorName";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";

type ActiveMemberProps = {
  strategyAddress: Address;
  isMemberActived: boolean | undefined;
  communityAddress: Address;
};

export function ActivatePoints({
  strategyAddress,
  isMemberActived,
  communityAddress,
}: ActiveMemberProps) {
  const { address: connectedAccount } = useAccount();
  const { openConnectModal } = useConnectModal();

  const {
    data: isMemberActivated,
    error,
    isSuccess,
  } = useContractRead({
    address: communityAddress as Address,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "memberActivatedInStrategies",
    args: [connectedAccount as Address, strategyAddress],
    watch: true,
  });
  const { data } = useContractRead({
    address: strategyAddress as Address,
    abi: abiWithErrors(cvStrategyABI),
    functionName: "getPointsPerMember",

    watch: true,
  });

  const {
    data: activatePointsData,
    write: writeActivatePoints,
    error: errorActivatePoints,
    status: activatePointsStatus,
  } = useContractWrite({
    address: strategyAddress,
    abi: abiWithErrors(cvStrategyABI),
    functionName: "activatePoints",
  });

  const {
    data: deactivatePointsData,
    write: writeDeactivatePoints,
    error: errorDeactivatePoints,
    status: deactivatePointsStatus,
  } = useContractWrite({
    address: strategyAddress,
    abi: abiWithErrors(cvStrategyABI),
    functionName: "deactivatePoints",
    args: [connectedAccount as Address],
  });

  const powerAmount = 50000000000000000000n;

  const {
    data: increasePowerData,
    write: writeIncreasePower,
    error: errorIncreasePower,
    status: increasePowerStatus,
  } = useContractWrite({
    address: strategyAddress,
    abi: abiWithErrors(cvStrategyABI),
    functionName: "increasePower",
    args: [connectedAccount as Address, powerAmount],
    onError: (error) => {
      console.log("error", error);
    },
    onSuccess: (data) => {
      console.log("data", data);
    },
  });

  useErrorDetails(errorActivatePoints, "activatePoints");
  useErrorDetails(errorDeactivatePoints, "deactivatePoints");

  async function handleChange() {
    if (connectedAccount) {
      if (isMemberActivated) {
        writeDeactivatePoints?.();
      } else {
        writeActivatePoints?.();
      }
    } else {
      openConnectModal?.();
    }
  }

  const { updateTransactionStatus: updateActivePointsStatus } =
    useTransactionNotification(activatePointsData);

  const { updateTransactionStatus: updateDeactivePointsStatus } =
    useTransactionNotification(deactivatePointsData);

  useEffect(() => {
    updateActivePointsStatus(activatePointsStatus);
  }, [activatePointsStatus]);

  useEffect(() => {
    updateDeactivePointsStatus(deactivatePointsStatus);
  }, [deactivatePointsStatus]);

  return (
    <>
      <div className="flex flex-col gap-4">
        <Button onClick={handleChange} className="w-fit bg-primary">
          {connectedAccount
            ? isMemberActivated
              ? "Deactivate Points"
              : "Activate Points"
            : "Connect Wallet"}
        </Button>
        <Button onClick={() => writeIncreasePower?.()}>
          increase power 50 tokens
        </Button>
      </div>
    </>
  );
}
