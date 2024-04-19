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
import { TransactionModal, TransactionStep } from "./TransactionModal";
import { useEffect, useRef, useState } from "react";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { formatTokenAmount } from "@/utils/numbers";
import { parseUnits } from "viem";
import { getChainIdFromPath } from "@/utils/path";
import { useDisableButtons, ConditionObject } from "@/hooks/useDisableButtons";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

type IncreasePowerProps = {
  communityAddress: Address;
  registerToken: Address;
  connectedAccount: Address;
  tokenSymbol: string;
  registerTokenDecimals: number;
};

const InitialTransactionSteps: TransactionStep[] = [
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
    transaction: "Stake",
    message: "waiting for approval",
    dataContent: "2",
    current: false,
    stepClassName: "idle",
    messageClassName: "",
  },
];

export const IncreasePower = ({
  communityAddress,
  registerToken,
  connectedAccount,
  tokenSymbol,
  registerTokenDecimals,
}: IncreasePowerProps) => {
  //modal ref
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const openModal = () => modalRef.current?.showModal();
  const closeModal = () => modalRef.current?.close();
  //
  //new logic
  const [pendingAllowance, setPendingAllowance] = useState<boolean | undefined>(
    false,
  );

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
    data: resetAllowance,
    write: writeResetAllowance,
    status: resetAllowanceStatus,
  } = useContractWrite({
    address: registerToken,
    abi: abiWithErrors(erc20ABI),
    args: [communityAddress, 0n as bigint], // [allowed spender address, amount ]
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
    //watch: true,
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
    args: [
      (BigInt(dataAllowance == 0n) ? requestedAmount : dataAllowance) as bigint,
    ],
  });

  const requestesMoreThanAllowance =
    (dataAllowance ?? 0n) > 0n && requestedAmount > (dataAllowance ?? 0n);

  async function handleChange() {
    const requestesMoreThanAllowance =
      (dataAllowance ?? 0n) > 0n && requestedAmount > (dataAllowance ?? 0n);

    if (requestesMoreThanAllowance) {
      // Reset allowance to 0
      writeResetAllowance?.();
      console.log("Resetting allowance...");

      // Update state or perform any necessary actions after resetting allowance
      return; // Exit early after resetting allowance
    }

    if (dataAllowance === requestedAmount) {
      // If allowance is exactly equal to requested amount, increase power
      writeIncreasePower?.();
      openModal();
      setPendingAllowance(true);
      console.log("Step 3 stake...");
    } else {
      // If allowance is less than requested amount, approve new allowance
      writeAllowToken?.();
      openModal();
      console.log("Step 2 ...");
    }
  }

  const handleInputChange = (e: any) => {
    setIncreaseInput(e.target.value);
  };

  const { updateTransactionStatus: updateAllowTokenTransactionStatus } =
    useTransactionNotification(allowTokenData);

  useEffect(() => {
    updateAllowTokenTransactionStatus(allowTokenStatus);
    if (resetAllowanceStatus === "success") {
      writeAllowToken?.();
    }

    if (allowTokenStatus === "success") {
      writeIncreasePower?.();
    }
  }, [allowTokenStatus, resetAllowanceStatus]);

  console.log(resetAllowanceStatus);
  console.log(allowTokenStatus);
  console.log(increaseStakeStatus);

  useEffect(() => {
    if (increaseStakeStatus === "success") {
      closeModal();
      setIncreaseInput(0);
      setPendingAllowance(false);
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

  //IncreasePower Disable Button condition => message mapping
  const disableIncPowerBtnCondition: ConditionObject[] = [
    {
      condition: !isMember,
      message: "Join community to increase voting power",
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
  const { tooltipMessage } = useDisableButtons(disableIncPowerBtnCondition);
  //

  return (
    <>
      <TransactionModal
        ref={modalRef}
        label={`Stake ${tokenSymbol} in community`}
        initialTransactionSteps={InitialTransactionSteps}
        allowTokenStatus={allowTokenStatus}
        stepTwoStatus={increaseStakeStatus}
        token={tokenSymbol}
        pendingAllowance={pendingAllowance}
        setPendingAllowance={setPendingAllowance}
      ></TransactionModal>

      {/* input */}
      <div className="flex max-w-md flex-col space-y-2">
        <div className="mt-3 flex max-w-[420px] items-center gap-2 rounded-lg bg-info px-2 py-1 text-white">
          <ExclamationCircleIcon height={32} width={32} />
          <p className="text-sm">
            Staking more tokens in the community will increase your voting power
            to support proposals
          </p>
        </div>

        <div className="relative max-w-[420px]">
          <input
            type="number"
            value={increaseInput}
            placeholder="Amount"
            className="input input-bordered input-info w-full disabled:bg-gray-300 disabled:text-black"
            onChange={(e) => handleInputChange(e)}
            disabled={!isMember}
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
