"use client";

import { FC, useEffect, useState } from "react";
import {
  ArrowPathRoundedSquareIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
// eslint-disable-next-line import/no-extraneous-dependencies
import sfMeta from "@superfluid-finance/metadata";
import { erc20ABI } from "@wagmi/core";
import { trimEnd } from "lodash-es";
import Image from "next/image";
import { formatUnits } from "viem";
import { Address, useAccount, useBalance } from "wagmi";
import { CVStrategy } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { FormCheckBox } from "./Forms/FormCheckBox";
import { Modal } from "./Modal";
import { Skeleton } from "./Skeleton";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { SuperfluidStream } from "@/assets";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useFlag } from "@/hooks/useFlag";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { useSuperfluidStream } from "@/hooks/useSuperfluidStream";
import { superfluidCFAv1ForwarderAbi, superTokenABI } from "@/src/customAbis";
import { abiWithErrors } from "@/utils/abi";
import { delayAsync } from "@/utils/delayAsync";
import {
  MONTH_TO_SEC,
  SEC_TO_MONTH,
  bigNumberMin,
  roundToSignificant,
  safeParseUnits,
  scaleDownRoundUp,
  scaleTo,
} from "@/utils/numbers";
import { getTxMessage } from "@/utils/transactionMessages";

interface PoolMetricsProps {
  strategy: Pick<CVStrategy, "id" | "poolId" | "token"> & {
    config: Pick<CVStrategy["config"], "superfluidToken">;
  };
  poolToken: {
    address: Address;
    symbol: string;
    decimals: number;
    balance: bigint;
  };
  communityAddress: Address;
  poolId: number;
  chainId: number;
  superToken:
    | {
        value: bigint;
        symbol: string;
        decimals: number;
        address: Address;
        formatted?: string;
        sameAsUnderlying?: boolean;
      }
    | undefined;
  streamingRatePerSecond?: bigint | string | number | null;
}

export const PoolMetrics: FC<PoolMetricsProps> = ({
  strategy,
  poolToken,
  chainId,
  superToken,
  streamingRatePerSecond,
}) => {
  const { id: poolAddress, poolId } = strategy;
  const [amountInput, setAmount] = useState<string>("");
  const [streamDuration, setStreamDuration] = useState("1"); // in months
  const [isStreamTxModalOpen, setIsStreamTxModalOpen] = useState(false);
  const { address: accountAddress } = useAccount();
  const [isStreamModalOpened, setIsStreamModalOpened] = useState(false);
  const [isTransferModalOpened, setIsTransferModalOpened] = useState(false);
  const [forceAllBalanceUsage, setForceAllBalanceUsage] = useState(false);

  const showUseSuperTokenBalance = useFlag("showUseSuperTokenBalance");
  const {
    currentUserOtherFlowRateBn,
    currentFlowRateBn,
    currentUserFlowRateBn,
    totalAmountDistributedBn,
    setCurrentUserFlowRateBn,
    setCurrentFlowRateBn,
    refetch: refetchSuperfluidStream,
  } = useSuperfluidStream({
    receiver: poolAddress,
    superToken: superToken?.address as Address,
  });

  const amount = +(amountInput || 0);

  const requestedAmountBn = BigInt(
    Math.floor(amount * 10 ** poolToken.decimals),
  );

  const { writeAsync: writeFundPoolAsync, isLoading: isSendFundsLoading } =
    useContractWriteWithConfirmations({
      address: poolToken.address,
      abi: abiWithErrors(erc20ABI),
      functionName: "transfer",
      contractName: "ERC20",
      args: [poolAddress as Address, requestedAmountBn],
    });

  useEffect(() => {
    if (!accountAddress || !poolAddress) return;
    // Refetch superfluid stream when account address or pool address changes
    refetchSuperfluidStream();
  }, [accountAddress]);

  const currentFlowPerMonth =
    superToken && currentFlowRateBn != null ?
      +formatUnits(currentFlowRateBn, superToken.decimals) * SEC_TO_MONTH
    : null;

  const currentUserFlowPerMonth =
    superToken && currentUserFlowRateBn != null ?
      +formatUnits(currentUserFlowRateBn, superToken.decimals) * SEC_TO_MONTH
    : null;

  const configuredFlowPerSecondBn =
    streamingRatePerSecond != null ?
      (() => {
        try {
          return BigInt(streamingRatePerSecond);
        } catch (_error) {
          return null;
        }
      })()
    : null;

  const configuredFlowPerMonth =
    superToken && configuredFlowPerSecondBn != null ?
      +formatUnits(configuredFlowPerSecondBn, superToken.decimals) * SEC_TO_MONTH
    : null;

  const totalAmountDistributed =
    totalAmountDistributedBn != null ?
      +formatUnits(
        totalAmountDistributedBn,
        superToken?.decimals ?? poolToken.decimals,
      )
    : null;

  const requestedStreamPerMonth =
    streamDuration != null ? amount / +streamDuration : 0;

  const streamRequestedAmountPerSec = requestedStreamPerMonth * MONTH_TO_SEC;
  const streamRequestedAmountPerSecScaledUpBn =
    superToken &&
    safeParseUnits(streamRequestedAmountPerSec, superToken.decimals);

  // If user is streaming super same token to other recipient, we can deduct from balance a 3 month budget for each stream
  const secsTo3MonthsBn = 3n * BigInt(SEC_TO_MONTH);
  const reservedSuperTokenBn =
    currentUserOtherFlowRateBn != null ?
      bigNumberMin(
        currentUserOtherFlowRateBn * secsTo3MonthsBn,
        superToken?.value ?? 0n,
      )
    : 0n;
  const reservedSuperToken =
    superToken && +formatUnits(reservedSuperTokenBn, superToken.decimals);

  const userSuperTokenAvailableBudgetBn =
    currentUserOtherFlowRateBn != null && !!superToken ?
      superToken.value - reservedSuperTokenBn
    : 0n;

  const requestedAmountBnScaledUpBn =
    superToken &&
    scaleTo(requestedAmountBn, poolToken.decimals, superToken.decimals);

  // Used for upgrade transaction
  const effectiveRequestedAmountScaledUpBn =
    requestedAmountBnScaledUpBn != null ?
      forceAllBalanceUsage ?
        requestedAmountBnScaledUpBn - (superToken?.value ?? 0n)
      : requestedAmountBnScaledUpBn - (userSuperTokenAvailableBudgetBn ?? 0n)
    : undefined;

  // Used for allowance of pooltoken
  const effectiveRequestedAmountScaledDownBn =
    effectiveRequestedAmountScaledUpBn != null ?
      scaleDownRoundUp(
        effectiveRequestedAmountScaledUpBn,
        superToken?.decimals ?? 0,
        poolToken.decimals,
      )
    : undefined;

  const isSuperTokenEnoughBalance =
    effectiveRequestedAmountScaledUpBn != null &&
    effectiveRequestedAmountScaledUpBn <= 0n;

  const {
    writeAsync: writeStreamFundsAsync,
    transactionStatus: streamFundsStatus,
    error: streamFundsError,
    isLoading: isStreamFundsLoading,
  } = useContractWriteWithConfirmations({
    address: sfMeta.getNetworkByChainId(+chainId)?.contractsV1
      .cfaV1Forwarder as Address,
    abi: abiWithErrors(superfluidCFAv1ForwarderAbi),
    functionName: "createFlow",
    contractName: "SuperFluid Constant Flow Agreement",
    showNotification: isSuperTokenEnoughBalance,
    onConfirmations: () => {
      setCurrentFlowRateBn(
        (old) =>
          (old ?? 0n) + (streamRequestedAmountPerSecScaledUpBn as bigint),
      );
      setCurrentUserFlowRateBn(streamRequestedAmountPerSecScaledUpBn as bigint);
    },
    args: [
      superToken?.address as Address,
      accountAddress as Address,
      poolAddress as Address,
      streamRequestedAmountPerSecScaledUpBn as bigint,
      "0x",
    ],
  });

  const {
    writeAsync: writeEditStreamAsync,
    transactionStatus: editStreamStatus,
    error: editStreamError,
    isLoading: isEditStreamLoading,
  } = useContractWriteWithConfirmations({
    address: sfMeta.getNetworkByChainId(+chainId)?.contractsV1
      .cfaV1Forwarder as Address,
    abi: abiWithErrors(superfluidCFAv1ForwarderAbi),
    functionName: "updateFlow",
    contractName: "SuperFluid Constant Flow Agreement",
    onConfirmations: () => {
      setCurrentFlowRateBn(
        (old) =>
          (old ?? 0n) +
          (streamRequestedAmountPerSecScaledUpBn as bigint) -
          (currentUserFlowRateBn ?? 0n),
      );
      setCurrentUserFlowRateBn(streamRequestedAmountPerSecScaledUpBn as bigint);
    },
    args: [
      superToken?.address as Address,
      accountAddress as Address,
      poolAddress as Address,
      streamRequestedAmountPerSecScaledUpBn as bigint,
      "0x",
    ],
  });

  const { writeAsync: writeStopStreamAsync, isLoading: isStopStreamLoading } =
    useContractWriteWithConfirmations({
      address: sfMeta.getNetworkByChainId(+chainId)?.contractsV1
        .cfaV1Forwarder as Address,
      abi: abiWithErrors(superfluidCFAv1ForwarderAbi),
      functionName: "deleteFlow",
      contractName: "SuperFluid Constant Flow Agreement",
      args: [
        superToken?.address as Address,
        accountAddress as Address,
        poolAddress as Address,
        "0x",
      ],
      onConfirmations: () => {
        setCurrentFlowRateBn(
          (old) => (old ?? 0n) - (currentUserFlowRateBn ?? 0n),
        );
        setCurrentUserFlowRateBn(null);
      },
    });

  const {
    write: writeWrapFunds,
    transactionStatus: wrapFundsStatus,
    error: wrapFundsError,
  } = useContractWriteWithConfirmations({
    address: superToken?.address as Address,
    abi: superTokenABI,
    functionName: "upgrade",
    contractName: "SuperToken",
    showNotification: false,
    onConfirmations: async () => {
      await delayAsync(2000);
      if (currentUserFlowRateBn != null) {
        writeEditStreamAsync();
      } else {
        writeStreamFundsAsync();
      }
    },
    args: [effectiveRequestedAmountScaledUpBn as bigint],
  });

  const {
    allowanceTxProps: wrapAllowanceTx,
    handleAllowance: handleWrapAllowance,
    resetState: resetWrapAllowanceState,
  } = useHandleAllowance(
    accountAddress,
    poolToken,
    superToken?.address as Address,
    effectiveRequestedAmountScaledDownBn as bigint,
    () => writeWrapFunds(),
  );

  const { data: walletBalance } = useBalance({
    address: accountAddress,
    formatUnits: poolToken.decimals,
    token: poolToken.address as Address,
    watch: true,
    chainId: chainId,
    enabled: !!accountAddress && !!poolToken.address,
  });

  const walletBalanceScaledUpBn =
    walletBalance && superToken ?
      scaleTo(walletBalance.value, poolToken.decimals, superToken.decimals)
    : walletBalance?.value;

  const hasInsufficientBalance =
    !!walletBalance?.formatted && +walletBalance.formatted < amount;

  const effectiveAvailableBalanceScaledBn =
    (
      userSuperTokenAvailableBudgetBn != null &&
      walletBalanceScaledUpBn != null &&
      superToken
    ) ?
      (forceAllBalanceUsage ?
        superToken.value
      : userSuperTokenAvailableBudgetBn) + walletBalanceScaledUpBn
    : walletBalanceScaledUpBn;

  const effectiveAvailableBalance =
    effectiveAvailableBalanceScaledBn != null && superToken ?
      formatUnits(effectiveAvailableBalanceScaledBn, superToken.decimals)
    : null;

  const hasInsufficientStreamBalance =
    hasInsufficientBalance &&
    effectiveAvailableBalanceScaledBn != null &&
    requestedAmountBnScaledUpBn != null &&
    effectiveAvailableBalanceScaledBn < requestedAmountBnScaledUpBn;

  const { tooltipMessage, isButtonDisabled, isConnected, missmatchUrl } =
    useDisableButtons([
      {
        message: `Insufficient ${poolToken.symbol} balance`,
        condition: hasInsufficientBalance,
      },
      {
        message: "Amount must be greater than 0",
        condition: amount <= 0,
      },
    ]);

  const {
    tooltipMessage: streamTooltipMessage,
    isButtonDisabled: isStreamButtonDisabled,
  } = useDisableButtons([
    {
      message: `Insufficient ${poolToken.symbol} balance`,
      condition: hasInsufficientStreamBalance,
    },
    {
      message: "Amount must be greater than 0",
      condition: amount <= 0,
    },
    {
      message: "Duration must be greater than 0",
      condition: +streamDuration <= 0,
    },
  ]);

  const [wrapFundsTx, setWrapFundsTx] = useState<TransactionProps>({
    contractName: "Wrap funds",
    message: getTxMessage("idle"),
    status: "idle",
  });

  const [streamFundsTx, setStreamFundsTx] = useState<TransactionProps>({
    contractName: "Stream funds",
    message: getTxMessage("idle"),
    status: "idle",
  });

  useEffect(() => {
    setStreamFundsTx((prev) => ({
      ...prev,
      message: getTxMessage(streamFundsStatus, streamFundsError),
      status: streamFundsStatus ?? "idle",
    }));
  }, [streamFundsStatus, streamFundsError]);

  useEffect(() => {
    setStreamFundsTx((prev) => ({
      ...prev,
      message: getTxMessage(editStreamStatus, editStreamError),
      status: editStreamStatus ?? "idle",
    }));
  }, [editStreamStatus, streamFundsError]);

  useEffect(() => {
    setWrapFundsTx((prev) => ({
      ...prev,
      message: getTxMessage(wrapFundsStatus, wrapFundsError),
      status: wrapFundsStatus ?? "idle",
    }));
  }, [wrapFundsStatus]);

  const resetTxsStatus = () => {
    setWrapFundsTx((prev) => ({
      ...prev,
      message: getTxMessage("idle"),
      status: "idle",
    }));
    setStreamFundsTx((prev) => ({
      ...prev,
      message: getTxMessage("idle"),
      status: "idle",
    }));
    resetWrapAllowanceState();
  };

  const handleStreamFunds = async () => {
    resetTxsStatus();
    if (superToken?.sameAsUnderlying) {
      // If super token is the same as underlying token, we can directly stream funds
      setStreamFundsTx((prev) => ({
        ...prev,
        message: getTxMessage("idle"),
        status: "idle",
      }));
      await writeStreamFundsAsync();
      setIsStreamModalOpened(false);
      return;
    }
    // Check if super token balance is already sufficient
    if (isSuperTokenEnoughBalance) {
      await writeStreamFundsAsync();
      setIsStreamModalOpened(false);
      return;
    }
    setWrapFundsTx((prev) => ({
      ...prev,
      message: getTxMessage("idle"),
      status: "idle",
    }));
    setIsStreamTxModalOpen(true);
    await handleWrapAllowance();
    setIsStreamModalOpened(false);
  };

  const handleStreamEdit = async () => {
    resetTxsStatus();
    if (superToken?.sameAsUnderlying) {
      // If super token is the same as underlying token, we can directly stream funds
      setStreamFundsTx((prev) => ({
        ...prev,
        message: getTxMessage("idle"),
        status: "idle",
      }));
      await writeStreamFundsAsync();
      setIsStreamModalOpened(false);
      return;
    }
    if (isSuperTokenEnoughBalance) {
      await writeEditStreamAsync();
      setIsStreamModalOpened(false);
      return;
    }
    setWrapFundsTx((prev) => ({
      ...prev,
      message: getTxMessage("idle"),
      status: "idle",
    }));
    setIsStreamTxModalOpen(true);
    await handleWrapAllowance();
    setIsStreamModalOpened(false);
  };

  const fundAmountInput = (
    <label className="input input-bordered input-info flex items-center gap-2 dark:bg-primary-soft-dark">
      <input
        max={walletBalance?.formatted}
        min={0}
        value={amountInput}
        onChange={(e) => {
          const value = e.target.value;
          if (+value >= 0) {
            setAmount(value);
          }
        }}
        required
        type="number"
        placeholder="0"
        className="grow dark:bg-primary-soft-dark"
      />
      {poolToken.symbol}
    </label>
  );

  const availableBalanceTooltipMessage = [
    walletBalance && +walletBalance.formatted > 0 ?
      `${roundToSignificant(walletBalance.formatted, 4, { truncate: true })} ${poolToken?.symbol}`
    : null,
    superToken && superToken.formatted != null && +superToken.formatted > 0 ?
      `${roundToSignificant(superToken.formatted, 4, { truncate: true })} ${superToken.symbol}`
    : null,
    reservedSuperToken != null && reservedSuperToken > 0 ?
      `- ${roundToSignificant(reservedSuperToken, 4, { truncate: true })} ${superToken?.symbol} reserved for other streams`
    : null,
  ]
    .filter(Boolean)
    .join(" + ")
    .replace(" + -", " - ");

  return (
    <>
      <TransactionModal
        label={`Stream funds in pool #${poolId}`}
        transactions={[wrapAllowanceTx, wrapFundsTx, streamFundsTx].filter(
          Boolean,
        )}
        isOpen={isStreamTxModalOpen}
        onClose={() => setIsStreamTxModalOpen(false)}
      >
        <div className="flex items-center gap-2 mb-4">
          <p>Streaming:</p>
          <Skeleton isLoading={requestedStreamPerMonth == undefined}>
            <DisplayNumber
              number={roundToSignificant(requestedStreamPerMonth, 2)}
              tokenSymbol={poolToken.symbol}
            />
          </Skeleton>
          <p>
            for {streamDuration} month{+streamDuration > 1 ? "s" : ""}
          </p>
        </div>
      </TransactionModal>
      <Modal
        title="Stream Funds"
        isOpen={isStreamModalOpened}
        size="extra-small"
        onClose={() => setIsStreamModalOpened(false)}
      >
        <div className="flex flex-col gap-6">
          {currentUserFlowPerMonth != null && currentUserFlowPerMonth > 0 && (
            <>
              <div className="border border-l-primary-button border-l-4 rounded-md p-2 flex items-center gap-2 justify-between">
                <div className="flex flex-col gap-1">
                  You are currently streaming:
                  <div>
                    <div
                      data-tip={`${currentUserFlowPerMonth} ${poolToken.symbol}/mo`}
                      className="tooltip tooltip-top-right text-left"
                    >
                      {roundToSignificant(currentUserFlowPerMonth, 4)}
                    </div>{" "}
                    {poolToken.symbol}
                    /month
                  </div>
                </div>
                <button className="btn btn-ghost">
                  {isStopStreamLoading ?
                    <div className="loading loading-spinner text-error-content" />
                  : <div
                      className="tooltip tooltip-top-left"
                      data-tip="Stop streaming to this pool"
                    >
                      <TrashIcon
                        className="w-5 h-5 text-error"
                        onClick={async () => {
                          await writeStopStreamAsync();
                          setIsStreamModalOpened(false);
                        }}
                      />
                    </div>
                  }
                </button>
              </div>
              <hr className="w-full" />
            </>
          )}

          <label className="flex flex-col gap-2">
            {Boolean(currentFlowRateBn) ? "Change" : ""} Stream amount:
            {fundAmountInput}
          </label>
          <div className="border rounded-md flex flex-col p-4 gap-4 bg-base-200">
            <div className="flex items-center gap-2 w-full justify-between">
              <label htmlFor="duration">Duration</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setStreamDuration((prev) =>
                      Math.max(+(prev || 0) - 1, 1).toString(),
                    )
                  }
                >
                  -
                </button>
                <input
                  className="input input-bordered dark:bg-primary-soft-dark input-info w-24"
                  id="duration"
                  placeholder="1"
                  min={1}
                  type="number"
                  value={streamDuration}
                  onChange={(e) => setStreamDuration(e.target.value)}
                />
                <span className="text-sm">
                  month{+streamDuration > 1 ? "s" : ""}
                </span>
                <button
                  onClick={() =>
                    setStreamDuration((prev) => (+(prev || 0) + 1).toString())
                  }
                >
                  +
                </button>
              </div>
            </div>
            <div className="w-full flex justify-between">
              <div>Monthly funding</div>
              <div>
                <div
                  className="tooltip tooltip-top-left"
                  data-tip={`${requestedStreamPerMonth} ${poolToken.symbol}/mo`}
                >
                  {roundToSignificant(requestedStreamPerMonth, 4)}
                </div>{" "}
                {poolToken.symbol}
              </div>
            </div>
          </div>
          <div className="w-full flex justify-end mt-4">
            {currentUserFlowRateBn == null ?
              <Button
                onClick={() => {
                  handleStreamFunds();
                }}
                color="primary"
                isLoading={isStreamFundsLoading}
                disabled={isStreamButtonDisabled}
                tooltip={streamTooltipMessage}
                className="w-full"
              >
                Stream {roundToSignificant(amount, 4)} {poolToken.symbol}
              </Button>
            : <Button
                onClick={() => {
                  handleStreamEdit();
                }}
                color="primary"
                isLoading={isEditStreamLoading}
                disabled={isStreamButtonDisabled}
                tooltip={streamTooltipMessage ?? "Replace current stream"}
                forceShowTooltip={true}
                className="w-full"
              >
                Replace stream with {roundToSignificant(amount, 4)}{" "}
                {poolToken.symbol}
              </Button>
            }
          </div>

          <hr className="w-full" />
          <div className="flex items-center gap-2 justify-between">
            <div className="flex flex-col gap-1 w-full">
              <div className="flex items-center gap-2 w-full">
                <div className="whitespace-nowrap">Available balance:</div>
                <div className="flex items-center gap-1 w-full">
                  <div
                    className="tooltip"
                    data-tip={
                      availableBalanceTooltipMessage.length ?
                        availableBalanceTooltipMessage
                      : "No available balance"
                    }
                  >
                    {forceAllBalanceUsage ?
                      <Button
                        btnStyle="link"
                        color="primary"
                        size="sm"
                        className="!p-0"
                        onClick={() => {
                          setAmount(
                            trimEnd(
                              roundToSignificant(
                                effectiveAvailableBalance ?? 0,
                                4,
                                { truncate: true },
                              ),
                              ".",
                            ),
                          );
                        }}
                      >
                        {roundToSignificant(effectiveAvailableBalance ?? 0, 4, {
                          truncate: true,
                        })}
                      </Button>
                    : roundToSignificant(effectiveAvailableBalance ?? 0, 4)}
                  </div>{" "}
                  {poolToken?.symbol}
                </div>
              </div>
              {showUseSuperTokenBalance && (
                <div>
                  <FormCheckBox
                    registerKey="useExistingBalance"
                    label="Include existing balance"
                    tooltip="Please make sure this balance isn't used for another stream."
                    value={forceAllBalanceUsage}
                    onChange={(e) => setForceAllBalanceUsage(e.target.checked)}
                    customTooltipIcon={
                      <ExclamationTriangleIcon
                        width={20}
                        height={20}
                        className="!text-warning-content"
                      />
                    }
                  />
                </div>
              )}
              <div className="text-sm text-neutral-content flex items-center gap-1">
                Check it on{" "}
                <a
                  className="text-primary-content hover:text-primary-hover-content flex items-center gap-1"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://app.superfluid.org/"
                >
                  Superfluid app
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 inline-block" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <Modal
        title="1-time Transfer"
        isOpen={isTransferModalOpened}
        size="extra-small"
        onClose={() => setIsTransferModalOpened(false)}
      >
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            Amount to transfer:
            {fundAmountInput}
          </label>
          <div className="w-full flex justify-end mt-4">
            <Button
              onClick={async () => {
                await writeFundPoolAsync();
                setIsTransferModalOpened(false);
              }}
              color="primary"
              isLoading={isSendFundsLoading}
              disabled={isButtonDisabled}
              tooltip={tooltipMessage}
              className="w-full"
            >
              Transfer {amount} {poolToken.symbol}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="backdrop-blur-sm rounded-lg">
        <section className="section-layout gap-4 flex flex-col">
          <h4>Pool Funds</h4>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center gap-3">
              <p className="text-sm">Funds in pool:</p>
              <div className="flex items-center gap-1">
                <DisplayNumber
                  copiable={true}
                  number={[poolToken.balance, poolToken.decimals]}
                  tokenSymbol={poolToken.symbol}
                  compact={true}
                  valueClassName="text-2xl mr-1 font-bold"
                />
              </div>
            </div>
            {currentFlowRateBn != null &&
              currentFlowPerMonth != null &&
              currentFlowRateBn > 0n && (
                <div className="flex justify-between gap-3 items-center">
                  <p className="subtitle2">Current Flow to GDA:</p>
                  <div className="flex items-center gap-1">
                    <p className="flex items-center whitespace-nowrap tooltip">
                      <div
                        data-tip={`${currentFlowPerMonth} ${poolToken.symbol}/mo`}
                        className="tooltip"
                      >
                        {roundToSignificant(currentFlowPerMonth, 3)}
                      </div>{" "}
                      {poolToken.symbol}
                      /mo
                    </p>
                    {configuredFlowPerMonth != null && (
                      <p className="text-xs text-neutral-soft-content whitespace-nowrap">
                        target {roundToSignificant(configuredFlowPerMonth, 3)}{" "}
                        {poolToken.symbol}/mo
                      </p>
                    )}
                    <div
                      className="tooltip tooltip-top-left cursor-pointer w-8"
                      data-tip={`This pool is receiving ${roundToSignificant(currentFlowPerMonth, 4)} ${poolToken.symbol}/month through Superfluid streaming`}
                    >
                      <Image
                        src={SuperfluidStream}
                        alt="Incoming Stream"
                        width={32}
                        height={32}
                        className="mb-[1.6px]"
                      />
                    </div>
                  </div>
                </div>
              )}
            {totalAmountDistributed != null && totalAmountDistributed > 0 && (
              <div className="flex justify-between items-center gap-3">
                <p className="text-sm">Total Streamed via GDA:</p>
                <p className="text-sm font-medium">
                  {roundToSignificant(totalAmountDistributed, 4)}{" "}
                  {superToken?.symbol ?? poolToken.symbol}
                </p>
              </div>
            )}
            {accountAddress && (
              <div className="flex justify-between items-center">
                <p className="text-sm">Wallet:</p>
                <DisplayNumber
                  number={[
                    walletBalance?.value ?? BigInt(0),
                    poolToken.decimals,
                  ]}
                  tokenSymbol={poolToken.symbol}
                  compact={true}
                  valueClassName="text-lg"
                  symbolClassName="text-sm"
                />
              </div>
            )}
          </div>
          <div
            className={`z-[9999] w-full dropdown dropdown-hover dropdown-top ${missmatchUrl || !isConnected ? "" : "tooltip"}`}
          >
            <Button
              type="submit"
              btnStyle="outline"
              color="primary"
              disabled={missmatchUrl || !isConnected}
              tooltip={
                missmatchUrl || !isConnected ? tooltipMessage : undefined
              }
              icon={<PlusIcon className="w-5 h-5" />}
              className="!w-full mt-1"
            >
              Add Funds
            </Button>
            {!missmatchUrl && isConnected && (
              <ul className="dropdown-content menu bg-primary rounded-box w-full p-2 shadow fixed z-[9999] left-0 top-full mt-2">
                <li>
                  <Button
                    type="submit"
                    btnStyle="ghost"
                    color="primary"
                    icon={<BanknotesIcon className="w-5 h-5" />}
                    className="w-full mt-1 xl:!justify-start"
                    onClick={() => setIsTransferModalOpened(true)}
                  >
                    1-time Transfer
                  </Button>
                </li>
                <li>
                  <Button
                    type="submit"
                    btnStyle="ghost"
                    color="secondary"
                    disabled={!superToken}
                    tooltip={
                      "Not enabled yet, the community's Council Safe can connect to enable streaming for this Pool"
                    }
                    icon={<ArrowPathRoundedSquareIcon className="w-5 h-5" />}
                    className="w-full mt-1 xl:!justify-start z-50"
                    onClick={() => setIsStreamModalOpened(true)}
                  >
                    Stream Funds
                  </Button>
                </li>
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
};
