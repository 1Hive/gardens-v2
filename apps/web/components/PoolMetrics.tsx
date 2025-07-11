"use client";

import { FC, useEffect, useState } from "react";
import {
  ArrowPathRoundedSquareIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
// eslint-disable-next-line import/no-extraneous-dependencies
import sfMeta from "@superfluid-finance/metadata";
import { erc20ABI } from "@wagmi/core";
import Image from "next/image";
import { Address, useAccount, useBalance } from "wagmi";
import { CVStrategy } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { Modal } from "./Modal";
import { Skeleton } from "./Skeleton";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { SuperfluidStream } from "@/assets";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { useSuperfluidStream } from "@/hooks/useSuperfluidStream";
import { superfluidCFAv1ForwarderAbi, superTokenABI } from "@/src/customAbis";
import { abiWithErrors } from "@/utils/abi";
import { delayAsync } from "@/utils/delayAsync";
import { toPrecision } from "@/utils/numbers";
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
}

const secondsToMonth = 60 * 60 * 24 * 30;
const monthToSeconds = 1 / secondsToMonth;

export const PoolMetrics: FC<PoolMetricsProps> = ({
  strategy,
  poolToken,
  chainId,
}) => {
  const { config, id: poolAddress, poolId } = strategy;
  const [amountInput, setAmount] = useState<string>("");
  const [streamDuration, setStreamDuration] = useState("1"); // in months
  const [isStreamTxModalOpen, setIsStreamTxModalOpen] = useState(false);
  const { address: accountAddress } = useAccount();
  const [isStreamModalOpened, setIsStreamModalOpened] = useState(false);
  const [isTransferModalOpened, setIsTransferModalOpened] = useState(false);
  const { data: balance } = useBalance({
    address: accountAddress,
    formatUnits: poolToken.decimals,
    token: poolToken.address,
    watch: true,
    enabled: !!accountAddress,
  });
  const { data: superTokenBalance } = useBalance({
    address: accountAddress,
    formatUnits: poolToken.decimals,
    token: config.superfluidToken as Address,
    watch: true,
    enabled: !!config.superfluidToken && !!accountAddress,
  });

  const {
    currentFlowRateBn,
    currentUserFlowRateBn,
    setCurrentUserFlowRateBn,
    setCurrentFlowRateBn,
    refetch: refetchSuperfluidStream,
  } = useSuperfluidStream({
    receiver: poolAddress,
    superToken: config.superfluidToken as Address,
  });

  const amount = +(+amountInput) || 0;

  const requestedAmountBn = BigInt(
    Math.round(amount * 10 ** poolToken.decimals),
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
  }, [accountAddress, refetchSuperfluidStream]);

  const currentFlowPerMonth =
    (Number(currentFlowRateBn) / 10 ** poolToken.decimals) * secondsToMonth;

  const currentUserFlowPerMonth =
    (Number(currentUserFlowRateBn) / 10 ** poolToken.decimals) * secondsToMonth;

  const requestedStreamPerMonth =
    +streamDuration ? amount / +streamDuration : 0;

  const streamRequestedAmountPerSec = requestedStreamPerMonth * monthToSeconds;
  const streamRequestedAmountPerSecBn = BigInt(
    Math.round(streamRequestedAmountPerSec * 10 ** poolToken.decimals),
  );

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
    // showNotification: isSuperTokenBalanceSufficient,
    onConfirmations: () => {
      setCurrentFlowRateBn((old) => (old ?? 0n) + requestedAmountBn);
      setCurrentUserFlowRateBn(amount);
    },
    args: [
      config.superfluidToken as Address,
      accountAddress as Address,
      poolAddress as Address,
      streamRequestedAmountPerSecBn,
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
          BigInt(
            (
              (currentUserFlowRateBn ?? 0) - streamRequestedAmountPerSec
            ).toFixed(0),
          ),
      );
      setCurrentUserFlowRateBn(streamRequestedAmountPerSec);
    },
    args: [
      config.superfluidToken as Address,
      accountAddress as Address,
      poolAddress as Address,
      streamRequestedAmountPerSecBn,
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
        config.superfluidToken as Address,
        accountAddress as Address,
        poolAddress as Address,
        "0x",
      ],
      onConfirmations: () => {
        setCurrentFlowRateBn(
          (old) =>
            (old ?? 0n) - BigInt((currentUserFlowRateBn ?? 0).toFixed(0)),
        );
        setCurrentUserFlowRateBn(null);
      },
    });

  const {
    write: writeWrapFunds,
    transactionStatus: wrapFundsStatus,
    error: wrapFundsError,
  } = useContractWriteWithConfirmations({
    address: config.superfluidToken as Address,
    abi: superTokenABI,
    functionName: "upgrade",
    contractName: "SuperToken",
    showNotification: false,
    onConfirmations: async () => {
      await delayAsync(2000);
      if (currentUserFlowRateBn) {
        writeEditStreamAsync();
      } else {
        writeStreamFundsAsync();
      }
    },
    args: [requestedAmountBn],
  });

  const {
    allowanceTxProps: wrapAllowanceTx,
    handleAllowance: handleWrapAllowance,
    resetState: resetWrapAllowanceState,
  } = useHandleAllowance(
    accountAddress,
    poolToken,
    config.superfluidToken as Address,
    requestedAmountBn,
    () => writeWrapFunds(),
  );

  const { data: walletBalance } = useBalance({
    address: accountAddress,
    formatUnits: poolToken.decimals,
    token: poolToken.address as Address,
    watch: true,
    chainId: chainId,
  });
  const hasInsufficientBalance =
    !!walletBalance?.formatted && +walletBalance.formatted < amount;

  const hasInsufficientStreamBalance =
    hasInsufficientBalance &&
    superTokenBalance &&
    superTokenBalance.value < requestedAmountBn;

  const { tooltipMessage, isButtonDisabled, isConnected, missmatchUrl } =
    useDisableButtons([
      {
        message: `Connected account has insufficient ${poolToken.symbol} balance`,
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
      message: `Connected account has insufficient ${poolToken.symbol} balance`,
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
    // Check if super token balance is already sufficient
    // if (isSuperTokenBalanceSufficient) {
    //   await writeStreamFundsAsync();
    //   setIsStreamModalOpened(false);
    //   return;
    // }
    setWrapFundsTx((prev) => ({
      ...prev,
      message: getTxMessage("idle"),
      status: "idle",
    }));
    setIsStreamTxModalOpen(true);
    await handleWrapAllowance({
      formAmount: requestedAmountBn,
    });
    setIsStreamModalOpened(false);
  };

  const handleStreamEdit = async () => {
    resetTxsStatus();
    // Check if super token balance is already sufficient
    // if (isSuperTokenBalanceSufficient) {
    //   await writeEditStreamAsync();
    //   setIsStreamModalOpened(false);
    //   return;
    // }
    setWrapFundsTx((prev) => ({
      ...prev,
      message: getTxMessage("idle"),
      status: "idle",
    }));
    setIsStreamTxModalOpen(true);
    await handleWrapAllowance({
      formAmount: requestedAmountBn,
    });
    setIsStreamModalOpened(false);
  };

  const fundAmountInput = (
    <label className="input input-bordered input-info flex items-center gap-2">
      <input
        max={balance?.formatted}
        min={0}
        maxLength={20}
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
        className="grow"
      />
      {poolToken.symbol}
    </label>
  );

  return (
    <>
      <TransactionModal
        label={`Stream funds in pool #${poolId}`}
        transactions={[wrapAllowanceTx, wrapFundsTx, streamFundsTx]}
        isOpen={isStreamTxModalOpen}
        onClose={() => setIsStreamTxModalOpen(false)}
      >
        <div className="flex items-center gap-2 mb-4">
          <p>Streaming:</p>
          <Skeleton isLoading={requestedStreamPerMonth == undefined}>
            <DisplayNumber
              number={toPrecision(requestedStreamPerMonth, 2)}
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
          {currentUserFlowPerMonth > 0 && (
            <>
              <div className="border border-l-primary-button border-l-4 rounded-md p-2 flex items-center gap-2 justify-between">
                <div className="flex flex-col gap-1">
                  You are currently streaming:
                  <div>
                    {toPrecision(currentUserFlowPerMonth, 4)} {poolToken.symbol}
                    /month
                  </div>
                </div>
                <button className="btn btn-ghost">
                  {isStopStreamLoading ?
                    <div className="loading loading-spinner text-error-content" />
                  : <div
                      className="tooltip"
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
            Change stream amount:
            {fundAmountInput}
          </label>
          <div className="border rounded-md flex flex-col p-4 gap-4 bg-base-200">
            <div className="flex items-center gap-2 w-full justify-between">
              <label htmlFor="duration">Duration</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setStreamDuration((prev) =>
                      Math.max((+prev || 0) - 1, 1).toString(),
                    )
                  }
                >
                  -
                </button>
                <input
                  className="input input-bordered input-info w-24"
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
                    setStreamDuration((prev) => ((+prev || 0) + 1).toString())
                  }
                >
                  +
                </button>
              </div>
            </div>
            <div className="w-full flex justify-between">
              <div>Monthly funding</div>
              <div>
                {toPrecision(requestedStreamPerMonth, 2)} {poolToken.symbol}
              </div>
            </div>
          </div>
          <div className="w-full flex justify-end mt-4">
            {!currentUserFlowRateBn ?
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
                Stream {amount} {poolToken.symbol}
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
                Replace stream with {amount} {poolToken.symbol}
              </Button>
            }
          </div>

          {superTokenBalance && superTokenBalance.value > 0 && (
            <>
              <hr className="w-full" />
              <div className="flex items-center gap-2 justify-between">
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center gap-2 w-full">
                    <div className="whitespace-nowrap">
                      Super token balance:
                    </div>
                    <div className="flex items-center gap-1 w-full">
                      {toPrecision(superTokenBalance.formatted, 4)}{" "}
                      {superTokenBalance.symbol}
                    </div>
                  </div>
                  <div className="text-sm text-neutral-content flex items-center gap-1">
                    Manage it on{" "}
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
            </>
          )}
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
      <div className="col-span-12 xl:col-span-3 h-fit">
        <div className="backdrop-blur-sm rounded-lg">
          <section className="section-layout gap-2 flex flex-col">
            <h3>Pool Funds</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center gap-3 z-o">
                <p className="subtitle2">Funds in pool:</p>
                <div className="flex items-center gap-1">
                  <DisplayNumber
                    copiable
                    number={[poolToken.balance, poolToken.decimals]}
                    tokenSymbol={poolToken.symbol}
                    compact={true}
                    valueClassName="text-2xl mr-1 font-bold text-primary-content"
                  />
                </div>
              </div>
              {currentFlowRateBn && currentFlowRateBn > 0n && (
                <div className="flex justify-between gap-3 items-center">
                  <p className="subtitle2">Incoming Stream:</p>
                  <div className="flex items-center gap-1">
                    <p className="flex items-center whitespace-nowrap">
                      {toPrecision(currentFlowPerMonth, 4)} {poolToken.symbol}
                      /mo
                    </p>
                    <div
                      className="tooltip tooltip-top-left cursor-pointer w-8"
                      data-tip={`This pool is receiving ${toPrecision(currentFlowPerMonth, 4)} ${poolToken.symbol}/month through Superfluid streaming`}
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
                    valueClassName="text-black text-lg"
                    symbolClassName="text-sm text-black"
                  />
                </div>
              )}
            </div>
            <div
              className={`w-full dropdown dropdown-hover dropdown-start ${missmatchUrl || !isConnected ? "" : "tooltip"} z-50`}
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
                className="w-full mt-1"
              >
                Add Funds
              </Button>
              {!missmatchUrl && isConnected && (
                <ul className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                  <li>
                    <Button
                      type="submit"
                      btnStyle="ghost"
                      color="primary"
                      disabled={missmatchUrl || !isConnected}
                      tooltip={
                        missmatchUrl || !isConnected ? tooltipMessage : (
                          undefined
                        )
                      }
                      icon={<BanknotesIcon className="w-5 h-5" />}
                      className="w-full mt-1 !justify-start"
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
                      disabled={missmatchUrl || !isConnected}
                      tooltip={
                        missmatchUrl || !isConnected ? tooltipMessage : (
                          undefined
                        )
                      }
                      icon={<ArrowPathRoundedSquareIcon className="w-5 h-5" />}
                      className="w-full mt-1 !justify-start"
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
      </div>
    </>
  );
};
