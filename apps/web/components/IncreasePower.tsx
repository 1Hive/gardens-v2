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
import { toast } from "react-toastify";
import { formatTokenAmount } from "@/utils/numbers";
import { parseUnits } from "viem";
import { getChainIdFromPath } from "@/utils/path";
import { useDisableButtons, ConditionObject } from "@/hooks/useDisableButtons";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import useErrorDetails from "@/utils/getErrorName";
import { chainDataMap } from "@/configs/chainServer";
import { DisplayNumber } from "./DisplayNumber";
import { usePubSubContext } from "@/contexts/pubsub.context";

type IncreasePowerProps = {
  communityAddress: Address;
  registerToken: Address;
  connectedAccount: Address;
  tokenSymbol: string;
  registerTokenDecimals: number;
  registerStakeAmount: bigint;
  memberStakedTokens: bigint;
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
  registerStakeAmount,
  memberStakedTokens,
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

  const [increaseInput, setIncreaseInput] = useState<number | string>("");

  const { publish } = usePubSubContext();

  //handeling states
  type states = "idle" | "loading" | "success" | "error";
  const [allowanceTransactionStatus, setAllowanceTransactionStatus] =
    useState<states>("idle");
  const [resetTransactionStatus, setResetTransactionStatus] =
    useState<states>("idle");

  const requestedAmount = parseUnits(
    (increaseInput ?? 0).toString(),
    registerTokenDecimals,
  );

  const chainId = getChainIdFromPath();

  const { data: accountTokenBalance } = useBalance({
    address: connectedAccount,
    token: registerToken as `0x${string}` | undefined,
    chainId: Number(chainId),
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
    //watch: true,
  });
  //

  const {
    data: allowTokenData,
    write: writeAllowToken,
    error: allowTokenError,
    status: allowTokenStatus,
    isSuccess: isAllowTokenSuccess,
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
    confirmations: chainDataMap[+chainId].confirmations,
    hash: allowTokenData?.hash,
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
    isSuccess: isWaitResetAllowanceStatus,
    status: waitResetAllowanceStatus,
  } = useWaitForTransaction({
    confirmations: chainDataMap[+chainId].confirmations,
    hash: resetAllowance?.hash,
  });

  const { data: allowance } = useContractRead({
    address: registerToken,
    abi: abiWithErrors2<typeof erc20ABI>(erc20ABI),
    args: [connectedAccount, communityAddress], // [ owner,  spender address ]
    functionName: "allowance",
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
    args: [requestedAmount as bigint],
    onSuccess: () => {
      publish({
        topic: "member",
        type: "update",
        function: "increasePower",
        containerId: communityAddress,
        id: connectedAccount,
        chainId: chainId,
      });
    },
  });
  const {
    data: decreasePowerData,
    write: writeDecreasePower,
    error: errorDecreasePower,
    status: decreasePowerStatus,
    isLoading: decreasePowerIsLoading,
    isError: isErrordecreasePower,
  } = useContractWrite({
    ...registryContractCallConfig,
    functionName: "decreasePower",
    args: [requestedAmount as bigint],

    onSuccess: () => {
      publish({
        topic: "member",
        type: "update",
        containerId: communityAddress,
        function: "decreasePower",
        id: connectedAccount,
        chainId: chainId,
      });
    },
  });
  useErrorDetails(errorDecreasePower, "errorDecrease");

  const { updateTransactionStatus: updateDecreasePowerTransactionStatus } =
    useTransactionNotification(decreasePowerData);

  useEffect(() => {
    updateDecreasePowerTransactionStatus(decreasePowerStatus);
    if (decreasePowerStatus === "success") {
      setIncreaseInput("");
    }
  }, [decreasePowerStatus]);

  const decreasePoweErrorName = useErrorDetails(errorDecreasePower);
  useEffect(() => {
    if (isErrordecreasePower && decreasePoweErrorName.errorName !== undefined) {
      toast.error(decreasePoweErrorName.errorName);
    }
  }, [errorDecreasePower]);

  const requestesMoreThanAllowance =
    (allowance ?? 0n) > 0n && requestedAmount > (allowance ?? 0n);

  async function handleChange() {
    setAllowanceTransactionStatus("idle");
    setResetTransactionStatus("idle");
    if (requestesMoreThanAllowance) {
      writeResetAllowance?.();
      return;
    }
    if (requestedAmount <= (allowance ?? 0n)) {
      writeIncreasePower?.();
      openModal();
      setPendingAllowance(true);
    } else {
      // initial state, allowance === 0
      writeAllowToken?.();
      openModal();
    }
  }

  const handleInputChange = (e: any) => {
    setIncreaseInput(e.target.value);
  };

  const { updateTransactionStatus: updateAllowTokenTransactionStatus } =
    useTransactionNotification(allowTokenData);

  useEffect(() => {
    updateAllowTokenTransactionStatus(allowTokenStatus);
    setAllowanceTransactionStatus(allowTokenStatus);
    setResetTransactionStatus(resetAllowanceStatus);
    if (
      resetTransactionStatus === "success" &&
      allowanceTransactionStatus === "idle"
    ) {
      writeAllowToken?.();
      setResetTransactionStatus("idle");
    }
    if (isWaitSuccess) {
      writeIncreasePower?.();
    }
  }, [waitResetAllowanceStatus, isWaitSuccess, allowTokenStatus]);

  useEffect(() => {
    if (increaseStakeStatus === "success") {
      closeModal();
      setIncreaseInput("");
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
  const disablePowerBtnCondition: ConditionObject[] = [
    {
      condition: !isMember,
      message: "Join community to increase voting power",
    },
    {
      condition:
        Number(increaseInput) === 0 ||
        increaseInput === undefined ||
        Number(increaseInput) < 0,
      message: "Input can not be zero or negative",
    },
  ];

  const disableIncPowerBtnCondition: ConditionObject[] = [
    ...disablePowerBtnCondition,
    {
      condition: isInputIncreaseGreaterThanBalance,
      message: `Not enough ${tokenSymbol} balance to stake`,
    },

    {
      condition: requestesMoreThanAllowance,
      message: `You have a pending allowance of ${formatTokenAmount(allowance ?? 0n, registerTokenDecimals)} ${tokenSymbol}. In order to stake more tokens, plaese stake the pending allowance first`,
    },
  ];

  const disableDecPowerBtnCondition: ConditionObject[] = [
    ...disablePowerBtnCondition,
    {
      condition:
        parseUnits(increaseInput.toString(), registerTokenDecimals) >
        memberStakedTokens - registerStakeAmount,
      message: "You can only decrease your added stake.",
    },
  ];

  const disabledDecPowerButton = disableDecPowerBtnCondition.some(
    (cond) => cond.condition,
  );

  const disabledIncPowerButton = disableIncPowerBtnCondition.some(
    (cond) => cond.condition,
  );
  const { tooltipMessage } = useDisableButtons(disableIncPowerBtnCondition);
  const { tooltipMessage: decreaseTooltipMsg } = useDisableButtons(
    disableDecPowerBtnCondition,
  );
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
      <div className="grid max-w-[460px] grid-cols-2 gap-4">
        <div className="col-span-2 mt-3 flex items-center gap-2 rounded-lg bg-info px-2 py-4 text-white">
          <ExclamationCircleIcon height={32} width={32} />
          <p className="text-sm text-white">
            Staking more tokens in the community will increase your voting power
            to support proposals
          </p>
        </div>

        <div className="col-span-2 flex flex-col gap-4">
          {isMember && (
            <div className="flex items-center justify-between">
              <div className="flex-start flex">
                <p>Balance:</p>
                <DisplayNumber
                  number={accountTokenBalance?.formatted ?? "0"}
                  tokenSymbol={tokenSymbol}
                  compact={true}
                />
              </div>
              <div className="flex-start flex">
                <p>Current Stake:</p>
                <DisplayNumber
                  number={[BigInt(memberStakedTokens), registerTokenDecimals]}
                  tokenSymbol={tokenSymbol}
                  compact={true}
                />
              </div>
            </div>
          )}
          {/* <div className=""> */}
          <div className="relative">
            <input
              type="number"
              value={increaseInput}
              placeholder="Amount"
              className="input input-bordered input-info w-full disabled:bg-gray-300 disabled:text-black"
              onChange={(e) => handleInputChange(e)}
              disabled={!isMember}
            />
            <span className="absolute right-8 top-3.5 text-black">
              {tokenSymbol}
            </span>
          </div>
        </div>

        <Button
          onClick={handleChange}
          className="w-full"
          disabled={disabledIncPowerButton}
          tooltip={tooltipMessage}
        >
          {increaseInput !== undefined && Number(increaseInput) > 0
            ? `Stake ${tokenSymbol}`
            : "Increase stake"}
          <span className="loading-spinner"></span>
        </Button>

        {isMember && (
          <Button
            onClick={() => writeDecreasePower?.()}
            className="w-full"
            disabled={disabledDecPowerButton}
            tooltip={decreaseTooltipMsg}
          >
            Decrease stake
            <span className="loading-spinner"></span>
          </Button>
        )}
      </div>
    </>
  );
};
