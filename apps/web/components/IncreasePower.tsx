"use client";

import { erc20ABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import {
  Address,
  useBalance,
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
import { getChainIdFromPath } from "@/utils/path";

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
  const [increaseInput, setIncreaseInput] = useState<number | undefined>();

  const requestedAmount = parseUnits(
    (increaseInput ?? 0).toString(),
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
      setIncreaseInput(0);
    }
  }, [increaseStakeStatus]);

  //   useEffect(() => {
  //     updateUnregisterMemberTransactionStatus(unregisterMemberStatus);
  //   }, [unregisterMemberStatus]);
  const chainId = getChainIdFromPath();

  const { data: accountTokenBalance } = useBalance({
    address: connectedAccount,
    token: registerToken as `0x${string}` | undefined,
    chainId: chainId || 0,
  });

  console.log(accountTokenBalance?.value);

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
          tokenSymbol={`Stake ${tokenSymbol}`}
          status={increaseStakeStatus === "success" ? "success" : "loading"}
          isLoading={increasePowerIsLoading}
          failedMessage="An error has occurred, please try again!"
          successMessage="Waiting for signature"
          type="register"
        />
      </TransactionModal>
      <div className="flex max-w-xl flex-col  space-y-2">
        <label htmlFor="stake" className="text-md w-full text-center font-bold">
          Stake more tokens in the community ! ...it will increase your voting
          power
        </label>
        <input
          type="number"
          value={increaseInput}
          placeholder="0"
          className="w-full rounded-lg border-2 border-info p-2"
          onChange={(e) => handleInputChange(e)}
        />
        <Button
          onClick={handleChange}
          className="w-full"
          disabled={
            increaseInput == 0 ||
            increaseInput == undefined ||
            increaseInput < 0 ||
            accountTokenBalance?.value == 0n
          }
          tooltip={`${(increaseInput ?? 0) > 0 && accountTokenBalance?.value == 0n ? `not enought ${tokenSymbol} balance` : "input can not be empty or less than 0"} `}
        >
          {increaseInput !== undefined && increaseInput > 0
            ? `Stake ${increaseInput} more tokens`
            : "Fill input with tokens to stake"}
          <span className="loading-spinner"></span>
        </Button>
      </div>
    </>
  );
};
