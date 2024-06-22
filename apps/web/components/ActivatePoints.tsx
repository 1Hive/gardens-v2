"use client";
import React, { use, useEffect } from "react";
import { Button } from "./Button";
import { Address, useContractWrite, useAccount, useChainId } from "wagmi";
import { cvStrategyABI, registryCommunityABI } from "@/src/generated";
import useErrorDetails from "@/utils/getErrorName";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { useDisableButtons, ConditionObject } from "@/hooks/useDisableButtons";
import { usePubSubContext } from "@/contexts/pubsub.context";

type ActiveMemberProps = {
  strategyAddress: Address;
  communityAddress: Address;
  isMemberActivated: boolean | undefined;
  isMember: boolean | undefined;
};

export function ActivatePoints({
  strategyAddress,
  communityAddress,
  isMember,
  isMemberActivated,
}: ActiveMemberProps) {
  const { address: connectedAccount } = useAccount();
  const { openConnectModal } = useConnectModal();
  const chainId = useChainId();
  const { publish } = usePubSubContext();

  const {
    data: activatePointsData,
    write: writeActivatePoints,
    error: errorActivatePoints,
    status: activatePointsStatus,
  } = useContractWrite({
    address: strategyAddress,
    abi: abiWithErrors(cvStrategyABI),
    functionName: "activatePoints",
    onSuccess: () => {
      publish({
        topic: "member",
        id: connectedAccount,
        type: "update",
        function: "activatePoints",
        containerId: communityAddress,
        chainId,
      });
    },
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
    onSuccess: () => {
      publish({
        topic: "member",
        id: connectedAccount,
        containerId: communityAddress,
        type: "update",
        function: "deactivatePoints",
        chainId,
      });
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

  // Activate Disable Button condition => message mapping
  const disableActiveBtnCondition: ConditionObject[] = [
    {
      condition: !isMember,
      message: "Join community to activate points",
    },
  ];

  const disableActiveBtn = disableActiveBtnCondition.some(
    (cond) => cond.condition,
  );

  const { tooltipMessage, missmatchUrl } = useDisableButtons(
    disableActiveBtnCondition,
  );

  return (
    <>
      <div className="flex flex-col gap-4 pl-4">
        <Button
          onClick={handleChange}
          className="w-fit bg-primary"
          disabled={missmatchUrl || disableActiveBtn}
          tooltip={String(tooltipMessage)}
        >
          {isMemberActivated ? "Deactivate governance" : "Activate governance"}
        </Button>
      </div>
    </>
  );
}
