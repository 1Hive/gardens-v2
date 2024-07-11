"use client";

import React, { useEffect, useRef, useState } from "react";
import { useBalance, useContractRead, Address, useAccount } from "wagmi";
import { Button } from "./Button";
import { TransactionModal } from "./TransactionModal";
import useErrorDetails from "@/utils/getErrorName";
import { erc20ABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { gte } from "@/utils/numbers";
import { useDisableButtons, ConditionObject } from "@/hooks/useDisableButtons";
import { usePubSubContext } from "@/contexts/pubsub.context";
import useContractWriteWithConfirmations from "@/hooks/useContractWriteWithConfirmations";
import useChainIdFromPath from "@/hooks/useChainIdFromPath";

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
}: RegisterMemberProps) {
  const urlChainId = useChainIdFromPath();
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

  const { data: isMember } = useContractRead({
    ...registryContractCallConfig,
    functionName: "isMember",
    enabled: accountAddress !== undefined,
    args: [accountAddress as Address],
    watch: true,
    chainId: urlChainId,
  });

  const { data: registerStakeAmount } = useContractRead({
    ...registryContractCallConfig,
    functionName: "getStakeAmountWithFees",
    chainId: urlChainId,
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
    transactionData: registerMemberTxData,
    write: writeRegisterMember,
    error: registerMemberError,
    status: registerMemberStatus,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "stakeAndRegisterMember",
    onConfirmations: () => {
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
    transactionData: unregisterMemberTxData,
    write: writeUnregisterMember,
    error: unregisterMemberError,
    status: unregisterMemberStatus,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "unregisterMember",
    onConfirmations: () => {
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
    transactionData: allowTokenTxData,
    write: writeAllowToken,
    error: allowTokenError,
    confirmed: allowTokenConfirmed,
    confirmationsStatus: allowTokenStatus,
  } = useContractWriteWithConfirmations({
    address: registerToken,
    abi: abiWithErrors(erc20ABI),
    args: [communityAddress, registerStakeAmount as bigint], // [allowed spender address, amount ]
    functionName: "approve",
  });

  const { data: dataAllowance } = useContractRead({
    address: registerToken,
    abi: abiWithErrors2<typeof erc20ABI>(erc20ABI),
    args: [accountAddress as Address, communityAddress], // [ owner,  spender address ]
    functionName: "allowance",
    watch: true,
    enabled: !!accountAddress,
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
    useTransactionNotification(allowTokenTxData);

  const { updateTransactionStatus: updateRegisterMemberTransactionStatus } =
    useTransactionNotification(registerMemberTxData);

  const { updateTransactionStatus: updateUnregisterMemberTransactionStatus } =
    useTransactionNotification(unregisterMemberTxData);

  useEffect(() => {
    updateAllowTokenTransactionStatus(allowTokenStatus);
    if (allowTokenConfirmed) {
      writeRegisterMember();
    }
  }, [allowTokenConfirmed]);

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
