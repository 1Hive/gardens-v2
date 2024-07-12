"use client";

import React, { useEffect } from "react";
import { Address, useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "./Button";
import { usePubSubContext } from "@/contexts/pubsub.context";
import useChainIdFromPath from "@/hooks/useChainIdFromPath";
import useContractWriteWithConfirmations from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { cvStrategyABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abiWithErrors";
import useErrorDetails from "@/utils/getErrorName";

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
  const chainId = useChainIdFromPath();
  const { publish } = usePubSubContext();

  const {
    transactionData: activatePointsTxData,
    write: writeActivatePoints,
    error: errorActivatePoints,
    status: activatePointsStatus,
  } = useContractWriteWithConfirmations({
    chainId,
    address: strategyAddress,
    abi: abiWithErrors(cvStrategyABI),
    functionName: "activatePoints",
    onConfirmations: () => {
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
    transactionData: deactivatePointsTxData,
    write: writeDeactivatePoints,
    error: errorDeactivatePoints,
    status: deactivatePointsStatus,
  } = useContractWriteWithConfirmations({
    address: strategyAddress,
    abi: abiWithErrors(cvStrategyABI),
    functionName: "deactivatePoints",
    onConfirmations: () => {
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
    useTransactionNotification(activatePointsTxData);

  const { updateTransactionStatus: updateDeactivePointsStatus } =
    useTransactionNotification(deactivatePointsTxData);

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
          btnStyle={isMemberActivated ? "outline" : "filled"}
          color={isMemberActivated ? "danger" : "primary"}
          disabled={missmatchUrl || disableActiveBtn}
          tooltip={String(tooltipMessage)}
        >
          {isMemberActivated ? "Deactivate governance" : "Activate governance"}
        </Button>
      </div>
    </>
  );
}
