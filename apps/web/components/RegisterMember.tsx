"use client";
import React, { useEffect, useRef } from "react";
import {
  useContractWrite,
  useAccount,
  useChainId,
  useContractRead,
  Address,
  useWaitForTransaction,
} from "wagmi";
import { Button } from "./Button";
import { toast } from "react-toastify";
import useErrorDetails from "@/utils/getErrorName";
import {
  confirmationsRequired,
  getContractsAddrByChain,
} from "@/constants/contracts";
import { useViemClient } from "@/hooks/useViemClient";
import { erc20ABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ChevronRightIcon } from "@heroicons/react/24/solid";

export function RegisterMember({
  name: communityName,
  tokenSymbol,
  communityAddress,
  registerToken,
}: {
  name: string;
  tokenSymbol: string;
  communityAddress: Address;
  registerToken: Address;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();

  const modalRef = useRef<HTMLDialogElement | null>(null);

  const registryContractCallConfig = {
    address: communityAddress,
    abi: abiWithErrors(registryCommunityABI),
  };

  const {
    data: isMember,
    error,
    isSuccess,
  } = useContractRead({
    ...registryContractCallConfig,
    functionName: "isMember",
    args: [address],
    watch: true,
  });

  const { data: registerStakeAmount, error: stakeAmountError } =
    useContractRead({
      ...registryContractCallConfig,
      functionName: "getStakeAmountWithFees",
    });

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

  const {
    data: unregisterMemberData,
    write: writeUnregisterMember,
    error: unregisterMemberError,
    status: unregisterMemberStatus,
  } = useContractWrite({
    ...registryContractCallConfig,
    functionName: "unregisterMember",
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
    confirmations: 1,
    hash: allowTokenData?.hash,
  });

  const { data: allowance } = useContractRead({
    address: registerToken,
    abi: abiWithErrors(erc20ABI),
    args: [address, communityAddress], // [ owner,  spender address ]
    functionName: "allowance",
    watch: true,
  });

  useErrorDetails(registerMemberError, "stakeAndRegisterMember");
  useErrorDetails(unregisterMemberError, "unregisterMember");
  // useErrorDetails(errorMemberRegistered, "isMember");
  useErrorDetails(allowTokenError, "approve");
  // useErrorDetails(errorGardenToken, "gardenToken");

  async function handleChange() {
    if (address) {
      if (isMember) {
        writeUnregisterMember();
      } else {
        // Check if allowance is equal to registerStakeAmount
        if (allowance !== registerStakeAmount) {
          writeAllowToken();
          modalRef.current?.showModal();
        } else {
          // Handle the case where allowance is already equal to registerStakeAmount
          modalRef.current?.showModal();
          writeRegisterMember();
        }
      }
    } else {
      openConnectModal?.();
    }
  }

  const { updateTransactionStatus: updateAllowTokenTransactionStatus } =
    useTransactionNotification(allowTokenData);

  const { updateTransactionStatus: updateRegisterMemberTransactionStatus } =
    useTransactionNotification(registerMemberData);

  const { updateTransactionStatus: updateUnregisterMemberTransactionStatus } =
    useTransactionNotification(unregisterMemberData);

  const approveToken = allowTokenStatus === "success";
  const allowanceFailed = allowTokenStatus === "error";
  const registerMemberFailed = approveToken && registerMemberStatus === "error";
  const allowanceIsSet =
    allowance === registerStakeAmount && registerMemberFailed;

  useEffect(() => {
    updateAllowTokenTransactionStatus(allowTokenStatus);
    if (waitAllowTokenStatus === "success") {
      writeRegisterMember();
    }
  }, [waitAllowTokenStatus]);

  useEffect(() => {
    updateRegisterMemberTransactionStatus(registerMemberStatus);
    if (registerMemberStatus === "success") {
      modalRef.current?.close();
    }
  }, [registerMemberStatus]);

  useEffect(() => {
    updateUnregisterMemberTransactionStatus(unregisterMemberStatus);
  }, [unregisterMemberStatus]);

  //TODO: check behavior => arb sepolia

  return (
    <>
      {/* Modal */}
      <dialog id="transaction_modal" className="modal" ref={modalRef}>
        <div className="modal-box relative max-w-xl bg-surface">
          <div className="-px-2 absolute left-0 top-[45%] flex w-full items-center justify-center -space-x-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <ChevronRightIcon
                key={i}
                className={`h-4 w-4 transition-colors duration-200 ease-in ${approveToken ? "text-success" : allowanceFailed ? "text-error" : "text-secondary"}`}
              />
            ))}
          </div>

          {/* modal title and close btn */}
          <div className="flex items-start justify-between pb-10">
            <h4 className="text-2xl">Register in {communityName}</h4>
            <Button size="sm" onClick={() => modalRef.current?.close()}>
              X
            </Button>
          </div>

          {/* modal approve token transaction step */}
          <div className="flex h-48 overflow-hidden px-6">
            <TransactionModalStep
              tokenSymbol={`Approve ${tokenSymbol}`}
              status={allowTokenStatus}
              isLoading={allowTokenStatus === "loading"}
              failedMessage="An error has occurred, please try again!"
              successMessage="Transaction sent successfully!"
            />

            <TransactionModalStep
              tokenSymbol={`Register in ${communityName}`}
              status={registerMemberStatus}
              isLoading={registerMemberIsLoading}
              failedMessage="An error has occurred, please try again!"
              successMessage="Waiting for signature"
              type="register"
            />
          </div>
        </div>
      </dialog>

      <Button onClick={handleChange} className="w-full bg-primary">
        {address
          ? isMember
            ? "Leave community"
            : "Register in community"
          : "Connect Wallet"}
      </Button>
    </>
  );
}

type TransactionModalStepProps = {
  tokenSymbol?: string;
  status: "success" | "error" | "idle" | "loading";
  isLoading: boolean;
  failedMessage: string;
  successMessage: string;
  type?: string;
};

const TransactionModalStep = ({
  tokenSymbol,
  status,
  isLoading,
  failedMessage,
  successMessage,
  type,
}: TransactionModalStepProps) => {
  const isSuccess = status === "success";
  const isFailed = status === "error";
  const loadingClass = isLoading ? "animate-pulse" : "animate-none";
  const successClass = isSuccess ? "text-success" : "";
  const errorClass = isFailed ? "text-error" : "";

  return (
    <div className="relative flex flex-1 flex-col items-center justify-start transition-all duration-300 ease-in-out">
      <div
        className={`rounded-full bg-secondary ${isFailed ? "border-[1px] border-error first:bg-error" : isSuccess ? "border-[1px] border-success first:bg-success" : ""}`}
      >
        <div
          className={`relative flex h-28 w-28 items-center rounded-full border-8 border-white p-1 text-center ${loadingClass}`}
        />
      </div>
      <span
        className={`absolute top-9 max-w-min text-center leading-5 text-white ${successClass}`}
      >
        {tokenSymbol}
      </span>
      <p
        className={`absolute bottom-0 max-w-xs px-10 text-center text-sm ${successClass} ${errorClass}`}
      >
        {isFailed
          ? failedMessage
          : isSuccess
            ? successMessage
            : "Waiting for signature"}
      </p>
    </div>
  );
};
