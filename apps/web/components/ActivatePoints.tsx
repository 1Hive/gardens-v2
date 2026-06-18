"use client";

import React from "react";
import { useModal } from "connectkit";
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
  activate?: boolean;
  memberPower?: bigint | null;
};

export function ActivatePoints({
  strategy,
  isMember,
  isMemberActivated,
  handleTxSuccess = () => {},
  activate = true,
  memberPower,
}: ActiveMemberProps) {
  const { address: connectedAccount } = useAccount();
  const { setOpen: setConnectModalOpen } = useModal();
  const chainId = useChainIdFromPath();
  const { publishAfterIndexed } = usePubSubContext();
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
    onConfirmations: (receipt) => {
      publishAfterIndexed(
        receipt,
        {
          topic: "member",
          id: connectedAccount,
          type: "update",
          function: "activatePoints",
          containerId: strategy.id,
          chainId,
        },
        connectedAccount ?
          {
            optimistic: {
              kind: "pool-governance",
              strategyId: strategy.id,
              memberAddress: connectedAccount,
              isActivated: true,
              activatedPoints: memberPower?.toString(),
            },
          }
        : undefined,
      );
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
    onConfirmations: (receipt) => {
      publishAfterIndexed(
        receipt,
        {
          topic: "member",
          id: connectedAccount,
          containerId: strategy.id,
          type: "update",
          function: "deactivatePoints",
          chainId,
        },
        connectedAccount ?
          {
            optimistic: {
              kind: "pool-governance",
              strategyId: strategy.id,
              memberAddress: connectedAccount,
              isActivated: false,
              activatedPoints: "0",
            },
          }
        : undefined,
      );
    },
  });

  useErrorDetails(errorActivatePoints, "activatePoints");
  useErrorDetails(errorDeactivatePoints, "deactivatePoints");

  function handleActivate() {
    if (!connectedAccount) return setConnectModalOpen(true);
    writeActivatePoints?.({ args: [] });
  }

  function handleDeactivate() {
    if (!connectedAccount) return setConnectModalOpen(true);
    writeDeactivatePoints?.({ args: [] });
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

  // ACTIVATE BUTTON
  if (activate) {
    return (
      <div className="w-full flex justify-end">
        <Button
          onClick={handleActivate}
          btnStyle="filled"
          color="primary"
          disabled={missmatchUrl || disableActiveBtn}
          tooltip={tooltipMessage}
          isLoading={isLoadingActivatePoints}
          testId="btn-activate-governance"
        >
          Activate governance
        </Button>
      </div>
    );
  }

  // DEACTIVATE BUTTON
  return (
    <Button
      onClick={handleDeactivate}
      btnStyle="filled"
      color="danger"
      className="!w-full"
      disabled={missmatchUrl || disableActiveBtn || !isMemberActivated}
      tooltip={tooltipMessage}
      isLoading={isLoadingDeactivatePoints}
    >
      Deactivate governance
    </Button>
  );
}
