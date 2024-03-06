"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  useContractReads,
  useContractWrite,
  useAccount,
  useChainId,
  useContractRead,
  Address,
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
import { getBuiltGraphSDK } from "#/subgraph/.graphclient";
import { WriteContractResult } from "wagmi/actions";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cn from "classnames";

export function RegisterMember({
  communityAddress,
  registerToken,
}: {
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
    args: [communityAddress, registerStakeAmount as bigint], // allowed spender address, amount
    functionName: "approve",
  });

  const approveToken = allowTokenStatus === "success";

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
        // Only open the modal when writeAllowToken is called
        writeAllowToken();
        modalRef.current?.showModal();
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

  useEffect(() => {
    updateAllowTokenTransactionStatus(allowTokenStatus);
    if (allowTokenStatus === "success") {
      writeRegisterMember();
    }
  }, [allowTokenStatus]);

  useEffect(() => {
    updateRegisterMemberTransactionStatus(registerMemberStatus);
    if (registerMemberStatus === "success") {
      modalRef.current?.close();
    }
  }, [registerMemberStatus]);

  useEffect(() => {
    updateUnregisterMemberTransactionStatus(unregisterMemberStatus);
  }, [unregisterMemberStatus]);

  //TODO: reusable classnames: commonClassesnames, circleClassesnames, textClassesnames
  //TODO: handle error states
  //TODO: refacotr useEffects

  return (
    <>
      <dialog id="transaction_modal" className="modal" ref={modalRef}>
        <div className="modal-box max-w-xl bg-surface">
          {/* title and close btn */}
          <div className="flex items-start justify-between pb-10">
            <h4 className="text-lg font-bold">Register in 1hive</h4>

            <Button size="sm" onClick={() => modalRef.current?.close()}>
              X
            </Button>
          </div>
          <div className="flex h-48 overflow-hidden px-10 ">
            <div
              className={`relative flex flex-1 flex-col items-center justify-start transition-all duration-200 ease-out`}
            >
              <div
                className={`relative flex h-28 w-28  animate-pulse items-center rounded-full border-8 border-secondary p-1 text-center ${cn(
                  {
                    "animate-none border-4 border-success ": approveToken,
                  },
                )}`}
              />
              <span
                className={`absolute top-9 max-w-min text-center leading-5 text-secondary ${approveToken && "text-success"}`}
              >
                Approve arbHNY
              </span>
              <span
                className={`absolute bottom-2 text-xs ${approveToken && "text-success"}`}
              >
                {approveToken
                  ? "Transaction sent succesfull !"
                  : "Waiting for signature "}
              </span>
            </div>

            <div
              className={`relative flex flex-1  flex-col items-center justify-start transition-all duration-200 ease-in ${cn(
                {
                  "": approveToken,
                },
              )}`}
            >
              <div
                className={`relative flex h-28 w-28 items-center rounded-full border-8 p-1 text-center ${cn(
                  {
                    "animate-pulse border-secondary": approveToken,
                    "animate-none border-4 border-success ":
                      registerMemberStatus === "success",
                  },
                )}`}
              />
              <span className="absolute top-9 max-w-min text-center leading-5 text-secondary">
                Register in 1hive
              </span>
              <span className={`absolute bottom-2 text-xs`}>
                {approveToken
                  ? "Waiting for signature"
                  : "Waiting for signature"}
              </span>
            </div>
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
