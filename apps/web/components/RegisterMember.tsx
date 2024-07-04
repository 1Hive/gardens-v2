"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  useBalance,
  useContractWrite,
  useContractRead,
  Address,
  useWaitForTransaction,
  useAccount,
} from "wagmi";
import { Button } from "./Button";
import useErrorDetails from "@/utils/getErrorName";
import { erc20ABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { gte } from "@/utils/numbers";
import { TransactionModal } from "./TransactionModal";
import { useDisableButtons, ConditionObject } from "@/hooks/useDisableButtons";
import { chainDataMap } from "@/configs/chainServer";
import { usePubSubContext } from "@/contexts/pubsub.context";
import useChainFromPath from "@/hooks/useChainIdFromtPath";

type RegisterMemberProps = {
  tokenSymbol: string;
  communityAddress: Address;
  registerToken: Address;
  registerTokenDecimals: number;
  membershipAmount: bigint;
  protocolFee: string;
  communityFee: string;
};

export function RegisterMember({
  tokenSymbol,
  communityAddress,
  registerToken,
  registerTokenDecimals,
  membershipAmount,
  protocolFee,
  communityFee,
}: RegisterMemberProps) {
  const { id: urlChainId } = useChainFromPath();
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const openModal = () => modalRef.current?.showModal();
  const closeModal = () => modalRef.current?.close();

  const { publish } = usePubSubContext();

  const { address: accountAddress } = useAccount();

  //
  //new logic
  const [pendingAllowance, setPendingAllowance] = useState<boolean | undefined>(
    false,
  );

  const registryContractCallConfig = {
    address: communityAddress,
    abi: abiWithErrors2(registryCommunityABI),
  };

  const {
    data: isMember,
    error,
    isSuccess,
  } = useContractRead({
    ...registryContractCallConfig,
    functionName: "isMember",
    enabled: accountAddress !== undefined,
    args: [accountAddress as Address],
    watch: true,
  });

  const { data: registerStakeAmount, error: stakeAmountError } =
    useContractRead({
      ...registryContractCallConfig,
      functionName: "getStakeAmountWithFees",
    });

  const { data: accountTokenBalance } = useBalance({
    address: accountAddress,
    token: registerToken as `0x${string}` | undefined,
    chainId: urlChainId,
  });

  const accountHasBalance = gte(
    accountTokenBalance?.value,
    registerStakeAmount as bigint,
    registerTokenDecimals,
  );

  const {
    data: registerMemberData,
    write: writeRegisterMember,
    isLoading: registerMemberIsLoading,
    error: registerMemberError,
    status: registerMemberStatus,
  } = useContractWrite({
    ...registryContractCallConfig,
    functionName: "stakeAndRegisterMember",
  });

  useWaitForTransaction({
    confirmations: chainDataMap[urlChainId].confirmations,
    hash: registerMemberData?.hash,
    onSuccess: () => {
      // Deprecated but temporary until unified useContractWriteWithConfirmations is implemented
      publish({
        topic: "member",
        type: "add",
        containerId: communityAddress,
        function: "stakeAndRegisterMember",
        id: communityAddress,
        urlChainId: urlChainId,
      });
    },
  });

  const {
    data: unregisterMemberData,
    write: writeUnregisterMember,
    error: unregisterMemberError,
    status: unregisterMemberStatus,
  } = useContractWrite({
    ...registryContractCallConfig,
    functionName: "unregisterMember",
  });

  useWaitForTransaction({
    confirmations: chainDataMap[urlChainId].confirmations,
    hash: unregisterMemberData?.hash,
    onSuccess: () => {
      // Deprecated but temporary until unified useContractWriteWithConfirmations is implemented
      publish({
        topic: "member",
        type: "delete",
        containerId: communityAddress,
        function: "unregisterMember",
        id: communityAddress,
        urlChainId: urlChainId,
      });
    },
  });

  const {
    data: allowTokenData,
    write: writeAllowToken,
    error: allowTokenError,
    status: allowTokenStatus,
  } = useContractWrite({
    address: registerToken,
    abi: abiWithErrors(erc20ABI),
    args: [communityAddress, registerStakeAmount as bigint], // [allowed spender address, amount ]
    functionName: "approve",
  });

  const {
    data,
    isError,
    isLoading,
    isSuccess: isWaitSuccess,
    status: waitAllowTokenStatus,
  } = useWaitForTransaction({
    confirmations: chainDataMap[urlChainId].confirmations,
    hash: allowTokenData?.hash,
  });

  const { data: dataAllowance } = useContractRead({
    address: registerToken,
    abi: abiWithErrors2<typeof erc20ABI>(erc20ABI),
    enabled: accountAddress !== undefined,
    args: [accountAddress as Address, communityAddress], // [ owner,  spender address ]
    functionName: "allowance",
    watch: true,
  });

  useErrorDetails(registerMemberError, "stakeAndRegisterMember");
  useErrorDetails(unregisterMemberError, "unregisterMember");
  // useErrorDetails(errorMemberRegistered, "isMember");
  useErrorDetails(allowTokenError, "approve");
  // useErrorDetails(errorGardenToken, "gardenToken");

  async function handleChange() {
    if (isMember) {
      writeUnregisterMember();
    } else {
      if (dataAllowance !== 0n) {
        writeRegisterMember();
        openModal();
        setPendingAllowance(true);
      } else {
        writeAllowToken();
        openModal();
      }
    }
  }

  const { updateTransactionStatus: updateAllowTokenTransactionStatus } =
    useTransactionNotification(allowTokenData);

  const { updateTransactionStatus: updateRegisterMemberTransactionStatus } =
    useTransactionNotification(registerMemberData);

  const { updateTransactionStatus: updateUnregisterMemberTransactionStatus } =
    useTransactionNotification(unregisterMemberData);

  useEffect(() => {
    updateAllowTokenTransactionStatus(allowTokenStatus);
    if (waitAllowTokenStatus === "success") {
      writeRegisterMember();
    }
  }, [waitAllowTokenStatus]);

  useEffect(() => {
    updateRegisterMemberTransactionStatus(registerMemberStatus);
    if (registerMemberStatus === "success") {
      closeModal();
      setPendingAllowance(false);
    }
  }, [registerMemberStatus]);

  useEffect(() => {
    updateUnregisterMemberTransactionStatus(unregisterMemberStatus);
  }, [unregisterMemberStatus]);

  //RegisterMember Disable Button condition => message mapping
  const disableRegMemberBtnCondition: ConditionObject[] = [
    {
      condition: !isMember && !accountHasBalance,
      message: "Connected account has insufficient balance",
    },
  ];
  const disabledRegMemberButton = disableRegMemberBtnCondition.some(
    (cond) => cond.condition,
  );
  const { tooltipMessage, missmatchUrl } = useDisableButtons(
    disableRegMemberBtnCondition,
  );

  const InitialTransactionSteps = [
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
  ];

  return (
    <>
      <TransactionModal
        ref={modalRef}
        label="Register in community"
        allowTokenStatus={allowTokenStatus}
        stepTwoStatus={registerMemberStatus}
        initialTransactionSteps={InitialTransactionSteps}
        token={tokenSymbol}
        pendingAllowance={pendingAllowance}
        setPendingAllowance={setPendingAllowance}
      />
      <div className="flex gap-4">
        <div className="flex items-center justify-center">
          <Button
            onClick={handleChange}
            btnStyle={isMember ? "outline" : "filled"}
            color={isMember ? "danger" : "primary"}
            disabled={missmatchUrl || disabledRegMemberButton}
            tooltip={tooltipMessage}
          >
            {isMember ? "Leave community" : "Register in community"}
          </Button>
        </div>
      </div>
    </>
  );
}
