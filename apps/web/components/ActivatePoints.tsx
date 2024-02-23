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
  strategyAddress: `0x${string}`;
  isMemberActived: boolean | undefined;
  communityAddress: Address;
};

export function ActivatePoints({
  strategyAddress,
  // isMemberActived,
  communityAddress,
}: ActiveMemberProps) {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();

  const {
    data: isMemberActivated,
    error,
    isSuccess,
  } = useContractRead({
    address: communityAddress as Address,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "memberActivatedInStrategies",
    args: [address as Address, strategyAddress],
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
  });

  useErrorDetails(errorActivatePoints, "activatePoints");
  useErrorDetails(errorDeactivatePoints, "deactivatePoints");

  async function handleChange() {
    if (address) {
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
      <Button onClick={handleChange} className="w-fit bg-primary">
        {address
          ? isMemberActivated
            ? "Deactivate Points"
            : "Activate Points"
          : "Connect Wallet"}
      </Button>
    </>
  );
}
