"use client";

import { erc20ABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import {
  Address,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { Button } from "./Button";
import { TransactionModal, TransactionModalStep } from "./TransactionModal";
import { useEffect, useRef, useState } from "react";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { formatTokenAmount } from "@/utils/numbers";
import { parseUnits } from "viem";

type IncreasePowerProps = {
  communityAddress: Address;
  registerToken: Address;
  connectedAccount: Address;
  tokenSymbol: string;
  registerTokenDecimals: number;
};

export const IncreasePower = ({
  communityAddress,
  registerToken,
  connectedAccount,
  tokenSymbol,
  registerTokenDecimals,
}: IncreasePowerProps) => {
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const [increaseInput, setIncreaseInput] = useState(0);

  const requestedAmount = parseUnits(
    increaseInput.toString(),
    registerTokenDecimals,
  );

  const {
    data: allowTokenData,
    write: writeAllowToken,
    error: allowTokenError,
    status: allowTokenStatus,
  } = useContractWrite({
    address: registerToken,
    abi: abiWithErrors(erc20ABI),
    args: [communityAddress, requestedAmount as bigint], // [allowed spender address, amount ]
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

  const {
    data: increasePowerData,
    write: writeIncreasePower,
    error: errorIncreaseStake,
    status: increaseStakeStatus,
    isLoading: increasePowerIsLoading,
  } = useContractWrite({
    address: communityAddress as Address,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "increasePower",
    args: [requestedAmount ?? dataAllowance],
  });

  console.log(dataAllowance);

  async function handleChange() {
    if (dataAllowance !== 0n) {
      writeIncreasePower?.();
      modalRef.current?.showModal();
    } else {
      writeAllowToken?.();
      modalRef.current?.showModal();
    }
    // writeAllowToken?.();
    // modalRef.current?.showModal();
  }

  const handleInputChange = (e: any) => {
    setIncreaseInput(e.target.value);
  };

  const { updateTransactionStatus: updateAllowTokenTransactionStatus } =
    useTransactionNotification(allowTokenData);

  useEffect(() => {
    updateAllowTokenTransactionStatus(allowTokenStatus);
    if (waitAllowTokenStatus === "success") {
      writeIncreasePower?.();
    }
  }, [waitAllowTokenStatus]);

  console.log(waitAllowTokenStatus);

  useEffect(() => {
    if (increaseStakeStatus === "success") {
      modalRef.current?.close();
    }
  }, [increaseStakeStatus]);

  //   useEffect(() => {
  //     updateUnregisterMemberTransactionStatus(unregisterMemberStatus);
  //   }, [unregisterMemberStatus]);

  return (
    <>
      <TransactionModal
        ref={modalRef}
        label={`Stake ${increaseInput} more tokens`}
        isSuccess={waitAllowTokenStatus === "success"}
        isFailed={waitAllowTokenStatus === "error"}
      >
        <TransactionModalStep
          tokenSymbol={`Approve ${tokenSymbol}`}
          status={allowTokenStatus}
          isLoading={allowTokenStatus === "loading"}
          failedMessage="An error has occurred, please try again!"
          successMessage="Transaction sent successfully!"
        />

        <TransactionModalStep
          tokenSymbol="Stake more tokens"
          status={increaseStakeStatus === "success" ? "success" : "loading"}
          isLoading={increasePowerIsLoading}
          failedMessage="An error has occurred, please try again!"
          successMessage="Waiting for signature"
          type="register"
        />
      </TransactionModal>
      <div className="mt-10 flex max-w-lg flex-col  space-y-2">
        <label htmlFor="stake" className="w-full text-center text-sm font-bold">
          Stake more tokens in the community ! ...it will increase your voting
          power
        </label>
        <input
          type="number"
          placeholder="0"
          className="w-full rounded-lg border-2 border-info p-2"
          onChange={(e) => handleInputChange(e)}
        />
        <Button onClick={handleChange} className="w-full">
          {increaseInput !== 0
            ? `Adding ${increaseInput} tokens to the Stake`
            : "Fill input with tokens to stake"}
          <span className="loading-spinner"></span>
        </Button>
      </div>
    </>
  );
};
