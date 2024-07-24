"use client";

import React, { useCallback, useMemo, useEffect } from "react";
import { Address, useAccount, useBalance } from "wagmi";
import { TokenGarden, isMemberQuery } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { TransactionModal } from "./TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import useModal from "@/hooks/useModal";
import { erc20ABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { useErrorDetails } from "@/utils/getErrorName";
import { gte } from "@/utils/numbers";

type RegisterMemberProps = {
  allowance: bigint | undefined;
  registrationCost: bigint;
  token: Pick<TokenGarden, "symbol" | "id" | "decimals">;
  communityAddress: Address;
  memberData: isMemberQuery | undefined;
};

export function RegisterMember({
  allowance,
  registrationCost,
  token,
  communityAddress,
  memberData,
}: RegisterMemberProps) {
  const urlChainId = useChainIdFromPath();
  const { closeModal, openModal, ref } = useModal();
  const { publish } = usePubSubContext();
  const { address: accountAddress } = useAccount();

  const [pendingAllowance, setPendingAllowance] = React.useState(false);

  const registryContractCallConfig = useMemo(() => ({
    address: communityAddress,
    abi: abiWithErrors2(registryCommunityABI),
    contractName: "Registry Community",
  }), [communityAddress]);

  const { data: accountTokenBalance } = useBalance({
    address: accountAddress,
    token: token.id as `0x${string}` | undefined,
    chainId: urlChainId,
  });

  // Derived state
  const accountHasBalance = useMemo(() => gte(
    accountTokenBalance?.value,
    registrationCost,
    token.decimals,
  ), [accountTokenBalance?.value, registrationCost, token.decimals]);

  // Contract writes
  const {
    write: writeRegisterMember,
    error: registerMemberError,
    status: registerMemberStatus,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "stakeAndRegisterMember",
    showNotification: false,
    onConfirmations: useCallback(() => {
      publish({
        topic: "member",
        type: "add",
        containerId: communityAddress,
        function: "stakeAndRegisterMember",
        id: communityAddress,
        urlChainId: urlChainId,
      });
    }, [publish, communityAddress, urlChainId]),
  });

  const {
    write: writeUnregisterMember,
    error: unregisterMemberError,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "unregisterMember",
    fallbackErrorMessage: "Problem unregistering member. Please try again.",
    onConfirmations: useCallback(() => {
      publish({
        topic: "member",
        type: "delete",
        containerId: communityAddress,
        function: "unregisterMember",
        id: communityAddress,
        urlChainId: urlChainId,
      });
    }, [publish, communityAddress, urlChainId]),
  });

  const {
    write: writeAllowToken,
    error: allowTokenError,
    confirmationsStatus: allowTokenStatus,
  } = useContractWriteWithConfirmations({
    address: token.id as Address,
    abi: abiWithErrors(erc20ABI),
    args: [communityAddress, registrationCost],
    functionName: "approve",
    contractName: "ERC20",
    showNotification: false,
    onConfirmations: useCallback(() => {
      writeRegisterMember();
    }, [writeRegisterMember]),
  });

  // Error handling
  useErrorDetails(registerMemberError, "stakeAndRegisterMember");
  useErrorDetails(unregisterMemberError, "unregisterMember");
  useErrorDetails(allowTokenError, "approve");

  // Event handlers
  const handleClick = useCallback(async () => {
    if (memberData) {
      writeUnregisterMember();
    } else {
      if (allowance !== 0n) {
        writeRegisterMember();
        openModal();
        setPendingAllowance(true);
      } else {
        writeAllowToken();
        openModal();
      }
    }
  }, [memberData, allowance, writeUnregisterMember, writeRegisterMember, writeAllowToken, openModal]);

  // Effects
  useEffect(() => {
    if (registerMemberStatus === "success") {
      closeModal();
      setPendingAllowance(false);
    }
  }, [registerMemberStatus, closeModal]);

  // Disable button conditions
  const disableRegMemberBtnCondition = useMemo<ConditionObject[]>(() => [
    {
      condition: !memberData && !accountHasBalance,
      message: "Connected account has insufficient balance",
    },
  ], [memberData, accountHasBalance]);

  const disabledRegMemberButton = disableRegMemberBtnCondition.some(
    (cond) => cond.condition,
  );
  const { tooltipMessage, missmatchUrl } = useDisableButtons(
    disableRegMemberBtnCondition,
  );

  const InitialTransactionSteps = useMemo(() => [
    {
      transaction: "Approve token expenditure",
      message: "waiting for signature",
      current: true,
      dataContent: "1",
      loading: false,
      stepClassName: "idle",
      messageClassName: "",
    },
    {
      transaction: "Register",
      message: "waiting for approval",
      dataContent: "2",
      current: false,
      stepClassName: "idle",
      messageClassName: "",
    },
  ], []);

  console.log(memberData);
  return (
    <>
      <TransactionModal
        ref={ref}
        label="Register in community"
        allowTokenStatus={allowTokenStatus}
        stepTwoStatus={registerMemberStatus}
        initialTransactionSteps={InitialTransactionSteps}
        token={token.symbol}
        pendingAllowance={pendingAllowance}
        setPendingAllowance={setPendingAllowance}
        closeModal={closeModal}
      />
      <div className="flex gap-4">
        <div className="flex items-center justify-center">
          <Button
            onClick={handleClick}
            btnStyle={memberData ? "outline" : "filled"}
            color={memberData ? "danger" : "primary"}
            disabled={missmatchUrl || disabledRegMemberButton}
            tooltip={tooltipMessage}
          >
            {memberData ? "Leave community" : "Register in community"}
          </Button>
        </div>
      </div>
    </>
  );
}