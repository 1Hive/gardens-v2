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
  isMember: boolean | undefined;
};

export function ActivatePoints({
  strategyAddress,
  communityAddress,
  isMember,
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

  const { data: pointsVotingPower } = useContractRead({
    address: communityAddress as Address,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "getMemberPowerInStrategy",
    args: [connectedAccount as Address, strategyAddress],
    watch: true,
  });

  console.log("pointsPower", pointsVotingPower);

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
      <div className="flex flex-col gap-4 pl-4">
        <Button
          onClick={handleChange}
          className="w-fit bg-primary"
          disabled={connectedAccount && isMember === false}
          tooltip="Join the community to activate points"
        >
          {connectedAccount
            ? isMemberActivated
              ? "Deactivate Points"
              : "Activate Points"
            : "Connect Wallet"}
        </Button>
      </div>
    </>
  );
}
