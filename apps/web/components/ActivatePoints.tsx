"use client";

import React from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Address, useAccount } from "wagmi";
import { CVStrategy, CVStrategyConfig } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import useCheckAllowList from "@/hooks/useCheckAllowList";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { cvStrategyABI } from "@/src/generated";
import { useErrorDetails } from "@/utils/getErrorName";

type ActiveMemberProps = {
  strategy: Pick<CVStrategy, "id" | "poolId"> & {
    config: Pick<CVStrategyConfig, "allowlist">;
  };
  communityAddress: Address;
  isMemberActivated: boolean | undefined;
  isMember: boolean | undefined;
  handleTxSuccess?: () => void;
};

export function ActivatePoints({
  strategy,
  isMember,
  isMemberActivated,
  handleTxSuccess = () => {},
}: ActiveMemberProps) {
  const { address: connectedAccount } = useAccount();
  const { openConnectModal } = useConnectModal();
  const chainId = useChainIdFromPath();
  const { publish } = usePubSubContext();
  const allowList = (strategy?.config?.allowlist as Address[]) ?? [];
  const isAllowed = useCheckAllowList(allowList, connectedAccount);

  const {
    write: writeActivatePoints,
    error: errorActivatePoints,
    isLoading: isLoadingActivatePoints,
  } = useContractWriteWithConfirmations({
    chainId,
    address: strategy.id as Address,
    contractName: "CV Strategy",
    abi: cvStrategyABI,
    functionName: "activatePoints",
    fallbackErrorMessage: "Error activating points, please report a bug.",
    onSuccess: () => {
      handleTxSuccess?.();
    },
    onConfirmations: () => {
      publish({
        topic: "member",
        id: connectedAccount,
        type: "update",
        function: "activatePoints",
        containerId: strategy.poolId,
        chainId,
      });
    },
  });

  const {
    write: writeDeactivatePoints,
    error: errorDeactivatePoints,
    isLoading: isLoadingDeactivatePoints,
  } = useContractWriteWithConfirmations({
    address: strategy.id as Address,
    abi: cvStrategyABI,
    contractName: "CV Strategy",
    functionName: "deactivatePoints",
    fallbackErrorMessage: "Error deactivating points, please report a bug.",
    onSuccess: () => {
      handleTxSuccess?.();
    },
    onConfirmations: () => {
      publish({
        topic: "member",
        id: connectedAccount,
        containerId: strategy.poolId,
        type: "update",
        function: "deactivatePoints",
        chainId,
      });
    },
  });

  useErrorDetails(errorActivatePoints, "activatePoints");
  useErrorDetails(errorDeactivatePoints, "deactivatePoints");

  async function handleClick() {
    if (connectedAccount) {
      if (isMemberActivated) {
        writeDeactivatePoints?.({ args: [] });
      } else {
        writeActivatePoints?.({
          args: [],
        });
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
    {
      condition: !isAllowed,
      message: "Address not in allowlist",
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
      onClick={handleClick}
      btnStyle={isMemberActivated ? "outline" : "filled"}
      color={isMemberActivated ? "danger" : "primary"}
      disabled={missmatchUrl || disableActiveBtn || !isAllowed}
      tooltip={tooltipMessage}
      isLoading={isLoadingActivatePoints || isLoadingDeactivatePoints}
    >
      {isMemberActivated ? "Deactivate governance" : "Activate governance"}
    </Button>
  );
}
