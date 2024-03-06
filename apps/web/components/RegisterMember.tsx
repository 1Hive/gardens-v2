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
    if (approveToken) {
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

  //TODO: handle error states
  //modal variables
  const approveToken = allowTokenStatus === "success";
  const allowanceFailed = allowTokenStatus === "error" && !approveToken;
  const registerMemberFailed = registerMemberStatus === "error";

  const commonClassname =
    "relative flex flex-1 flex-col items-center justify-start transition-all duration-300 ease-in-out";
  const circleClassname = `relative flex h-28 w-28 items-center rounded-full border-8 p-1 text-center`;
  const textClassname = `absolute top-9 max-w-min text-center leading-5 text-white ${approveToken && "text-success"}`;
  const messageClassname = `absolute bottom-0 text-sm max-w-xs px-10 text-center `;

  return (
    <>
      {/* Modal */}
      <dialog id="transaction_modal" className="modal" ref={modalRef}>
        <div className="modal-box max-w-xl bg-surface">
          {/* modal title and close btn */}
          <div className="flex items-start justify-between pb-10">
            <h4 className="text-lg font-bold">Register in 1hive</h4>
            <Button size="sm" onClick={() => modalRef.current?.close()}>
              X
            </Button>
          </div>
          <div className="flex h-48 overflow-hidden px-6">
            {/* modal approve token transaction step */}
            <div className={commonClassname}>
              <div
                className={`rounded-full first:bg-secondary ${
                  allowanceFailed
                    ? "border-[1px] border-error first:bg-error"
                    : approveToken &&
                      "border-[1px] border-success first:bg-success"
                }`}
              >
                <div
                  className={`${circleClassname} border-white ${allowanceFailed ? "animate-none" : !approveToken && "animate-pulse"}`}
                />
              </div>
              <span className={textClassname}>Approve arbHNY</span>
              <p
                className={`${messageClassname} ${approveToken && "text-success"}`}
              >
                {allowanceFailed
                  ? "An error has occurred, please try again!"
                  : approveToken
                    ? "Transaction sent successful!"
                    : "Waiting for signature"}
              </p>
            </div>

            {/* modal register transaction step  */}
            <div className={commonClassname}>
              <div
                className={`rounded-full first:bg-secondary ${
                  registerMemberFailed
                    ? "border-[1px] border-error first:bg-error"
                    : approveToken
                      ? "first:bg-secondary"
                      : "scale-90"
                }`}
              >
                <div
                  className={`${circleClassname} border-white ${registerMemberFailed ? "animate-none" : approveToken ? "animate-pulse" : ""}`}
                />
              </div>
              <span
                className={`${textClassname} ${!approveToken && "text-sm"}`}
              >
                Register in 1hive
              </span>
              <p className={messageClassname}>
                {registerMemberFailed
                  ? "An error has occurred, please try again!"
                  : approveToken
                    ? "Waiting for signature"
                    : "Waiting for signature"}
              </p>
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
