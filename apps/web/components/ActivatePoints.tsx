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
import { abiWithErrors } from "@/utils/abi";
import { useErrorDetails } from "@/utils/getErrorName";

type ActiveMemberProps = {
  strategy: Pick<CVStrategy, "id" | "poolId"> & {
    config: Pick<CVStrategyConfig, "allowlist">;
  };
  communityAddress: Address;
  isMemberActivated: boolean | undefined;
  isMember: boolean | undefined;
};

export function ActivatePoints({
  strategy,
  communityAddress,
  isMember,
  isMemberActivated,
}: ActiveMemberProps) {
  const { address: connectedAccount } = useAccount();
  const { openConnectModal } = useConnectModal();
  const chainId = useChainIdFromPath();
  const { publish } = usePubSubContext();
  const allowList = (strategy?.config?.allowlist as Address[]) ?? [];
  const isAllowed = useCheckAllowList(allowList, connectedAccount);

  const { write: writeActivatePoints, error: errorActivatePoints } =
    useContractWriteWithConfirmations({
      chainId,
      address: strategy.id as Address,
      contractName: "CV Strategy",
      abi: abiWithErrors(cvStrategyABI),
      functionName: "activatePoints",
      fallbackErrorMessage: "Error activating points, please report a bug.",
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

  const { write: writeDeactivatePoints, error: errorDeactivatePoints } =
    useContractWriteWithConfirmations({
      address: strategy.id as Address,
      abi: abiWithErrors(cvStrategyABI),
      contractName: "CV Strategy",
      functionName: "deactivatePoints",
      fallbackErrorMessage: "Error deactivating points, please report a bug.",
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

  async function handleChange() {
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
      onClick={handleChange}
      btnStyle={isMemberActivated ? "outline" : "filled"}
      color={isMemberActivated ? "danger" : "primary"}
      disabled={missmatchUrl || disableActiveBtn || !isAllowed}
      tooltip={String(tooltipMessage)}
    >
      {isMemberActivated ? "Deactivate governance" : "Activate governance"}
    </Button>
  );
}
