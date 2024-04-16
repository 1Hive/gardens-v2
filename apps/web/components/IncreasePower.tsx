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
import { Show, When, Else } from "./Show";
import { useTooltipMessage, ConditionObject } from "@/hooks/useTooltipMessage";

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

  const chainId = getChainIdFromPath();

  const { data: accountTokenBalance } = useBalance({
    address: connectedAccount,
    token: registerToken as `0x${string}` | undefined,
    chainId: chainId || 0,
  });

  //TODO: create a hook for this
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
    args: [connectedAccount as Address],
    watch: true,
  });
  //

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
    ...registryContractCallConfig,
    functionName: "increasePower",
    args: [requestedAmount ?? dataAllowance],
  });

  async function handleChange() {
    if (dataAllowance !== 0n) {
      writeIncreasePower?.();
      modalRef.current?.showModal();
    } else {
      writeAllowToken?.();
      modalRef.current?.showModal();
    }
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

  const { updateTransactionStatus: updateIncreaseStakeTransactionStatus } =
    useTransactionNotification(increasePowerData);

  useEffect(() => {
    updateIncreaseStakeTransactionStatus(increaseStakeStatus);
  }, [increaseStakeStatus]);

  const isInputIncreaseGreaterThanBalance =
    Number(increaseInput as unknown as number) >
    Number(accountTokenBalance?.formatted);

  console.log(dataAllowance, "dataAllowance");
  console.log(increasePowerData);

  //IncreasePower Tooltip condition => message mapping
  const disableIncPowerBtnCondition: ConditionObject[] = [
    {
      condition: !isMember,
      message: "Join community to increase power",
    },
    {
      condition: isInputIncreaseGreaterThanBalance,
      message: `Not enough ${tokenSymbol} balance to stake`,
    },
    {
      condition:
        increaseInput == 0 || increaseInput == undefined || increaseInput < 0,
      message: "Input can not be zero or negtive",
    },
  ];
  const disabledIncPowerButton = disableIncPowerBtnCondition.some(
    (cond) => cond.condition,
  );
  const tooltipMessage = useTooltipMessage(disableIncPowerBtnCondition);

  return (
    <>
      <TransactionModal
        ref={modalRef}
        label={`Stake ${increaseInput} more tokens`}
        isSuccess={waitAllowTokenStatus === "success"}
        isFailed={waitAllowTokenStatus === "error"}
      >
        {/* <Show>
          <Show.When isTrue={dataAllowance === 0n || dataAllowance > 0n}> */}
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
        {/* </Show.When>
        </Show> */}
      </TransactionModal>

      {/* input */}
      <div className="flex max-w-md flex-col space-y-2">
        <label
          htmlFor="stake"
          className="text-md max-w-[420px] rounded-lg bg-info px-4 py-1 text-start font-semibold text-white"
        >
          Staking more tokens in the community will increase your voting power
          to support proposals
        </label>
        <div className="relative max-w-[420px]">
          <input
            type="number"
            value={increaseInput}
            placeholder="0"
            className="input input-bordered  input-info w-full "
            onChange={(e) => handleInputChange(e)}
          />
          <span className="absolute right-10 top-3.5 text-black">
            {tokenSymbol}
          </span>
        </div>
        <Button
          onClick={handleChange}
          className="w-full max-w-[420px]"
          disabled={disabledIncPowerButton}
          tooltip={tooltipMessage}
        >
          {increaseInput !== undefined && increaseInput > 0
            ? `Stake ${tokenSymbol}`
            : "Increase stake"}
          <span className="loading-spinner"></span>
        </Button>
      </div>
    </>
  );
};
