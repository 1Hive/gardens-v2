"use client";
import React, { useEffect, useRef } from "react";
import {
  useBalance,
  useContractReads,
  useContractWrite,
  useAccount,
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
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { calculateFees, formatTokenAmount, gte, dn } from "@/utils/numbers";
import { getChainIdFromPath } from "@/utils/path";

export function RegisterMember({
  name: communityName,
  tokenSymbol,
  communityAddress,
  registerToken,
  registerTokenDecimals,
  membershipAmount,
  protocolFee,
  communityFee,
  connectedAccount,
}: {
  name: string;
  tokenSymbol: string;
  communityAddress: Address;
  registerToken: Address;
  registerTokenDecimals: number;
  membershipAmount: string;
  protocolFee: string;
  communityFee: string;
  connectedAccount: Address;
}) {
  const chainId = getChainIdFromPath();
  const { openConnectModal } = useConnectModal();

  const modalRef = useRef<HTMLDialogElement | null>(null);

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
    args: [connectedAccount],
    watch: true,
  });

  const { data: registerStakeAmount, error: stakeAmountError } =
    useContractRead({
      ...registryContractCallConfig,
      functionName: "getStakeAmountWithFees",
    });

  const { data: accountTokenBalance } = useBalance({
    address: connectedAccount,
    token: registerToken as `0x${string}` | undefined,
    chainId: chainId || 0,
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

  console.log(registerStakeAmount);

  const powerAmount = 50000000000000000000n;

  const { data: allowMock, write: writeMockallow } = useContractWrite({
    address: registerToken,
    abi: abiWithErrors(erc20ABI),
    args: [communityAddress, powerAmount as bigint], // [allowed spender address, amount ]
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

  const { data: dataAllowance } = useContractRead({
    address: registerToken,
    abi: abiWithErrors2<typeof erc20ABI>(erc20ABI),
    args: [connectedAccount, communityAddress], // [ owner,  spender address ]
    functionName: "allowance",
    watch: true,
  });

  useErrorDetails(registerMemberError, "stakeAndRegisterMember");
  useErrorDetails(unregisterMemberError, "unregisterMember");
  // useErrorDetails(errorMemberRegistered, "isMember");
  useErrorDetails(allowTokenError, "approve");
  // useErrorDetails(errorGardenToken, "gardenToken");

  async function handleChange() {
    if (connectedAccount) {
      if (isMember) {
        writeUnregisterMember();
      } else {
        // Check if allowance is equal to registerStakeAmount
        if (dataAllowance !== registerStakeAmount) {
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
    dataAllowance === registerStakeAmount && registerMemberFailed;

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

  console.log(dataAllowance);

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

      <div className="space-y-4">
        <div className="stats flex">
          <div
            className="stat flex-1 items-center bg-info px-4 py-3 text-sm font-bold text-white"
            role="alert"
          >
            <div className="flex items-center">
              <svg
                className="mr-2 h-4 w-4 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M12.432 0c1.34 0 2.01.912 2.01 1.957 0 1.305-1.164 2.512-2.679 2.512-1.269 0-2.009-.75-1.974-1.99C9.789 1.436 10.67 0 12.432 0zM8.309 20c-1.058 0-1.833-.652-1.093-3.524l1.214-5.092c.211-.814.246-1.141 0-1.141-.317 0-1.689.562-2.502 1.117l-.528-.88c2.572-2.186 5.531-3.467 6.801-3.467 1.057 0 1.233 1.273.705 3.23l-1.391 5.352c-.246.945-.141 1.271.106 1.271.317 0 1.357-.392 2.379-1.207l.6.814C12.098 19.02 9.365 20 8.309 20z" />
              </svg>
              <div>
                <p>
                  Registration amount:{" "}
                  {formatTokenAmount(membershipAmount, registerTokenDecimals)}{" "}
                  {tokenSymbol}
                </p>
                <p>
                  Community fee:{" "}
                  {calculateFees(
                    membershipAmount,
                    communityFee,
                    registerTokenDecimals,
                  )}{" "}
                  {tokenSymbol}
                </p>
                <p>
                  Protocol fee:{" "}
                  {calculateFees(
                    membershipAmount,
                    protocolFee,
                    registerTokenDecimals,
                  )}{" "}
                  {tokenSymbol}
                </p>
              </div>
            </div>
          </div>
          <h4>allowance: {formatTokenAmount(dataAllowance, 18)}</h4>

          <div className="stat flex-1 items-center gap-2">
            <Button
              onClick={handleChange}
              className="w-full bg-primary"
              size="md"
              disabled={!accountHasBalance}
              tooltip={`Connected account has not enough ${tokenSymbol}`}
            >
              {connectedAccount
                ? isMember
                  ? "Leave community"
                  : "Register in community"
                : "Connect Wallet"}
            </Button>
            <Button onClick={() => writeMockallow?.()}>Allow Tokens</Button>
          </div>
        </div>
      </div>
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
