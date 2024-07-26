"use client";

import React from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Address, useAccount } from "wagmi";
import { Button } from "./Button";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { cvStrategyABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { useErrorDetails } from "@/utils/getErrorName";

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

  const { write: writeActivatePoints, error: errorActivatePoints } =
    useContractWriteWithConfirmations({
      chainId,
      address: strategyAddress,
      contractName: "CV Strategy",
      abi: abiWithErrors(cvStrategyABI),
      functionName: "activatePoints",
      fallbackErrorMessage: "Error activating points. Please try again.",
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

  const { write: writeDeactivatePoints, error: errorDeactivatePoints } =
    useContractWriteWithConfirmations({
      address: strategyAddress,
      abi: abiWithErrors(cvStrategyABI),
      contractName: "CV Strategy",
      functionName: "deactivatePoints",
      fallbackErrorMessage: "Error deactivating points. Please try again.",
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
    <Button
      onClick={handleChange}
      btnStyle={isMemberActivated ? "outline" : "filled"}
      color={isMemberActivated ? "danger" : "primary"}
      disabled={missmatchUrl || disableActiveBtn}
      tooltip={String(tooltipMessage)}
    >
      {isMemberActivated ? "Deactivate governance" : "Activate governance"}
    </Button>
  );
}
