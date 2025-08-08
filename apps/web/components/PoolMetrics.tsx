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
import { useCheat } from "@/hooks/useCheat";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { useSuperfluidStream } from "@/hooks/useSuperfluidStream";
import { superfluidCFAv1ForwarderAbi, superTokenABI } from "@/src/customAbis";
import { abiWithErrors } from "@/utils/abi";
import { delayAsync } from "@/utils/delayAsync";
import {
  ceilDiv,
  roundToSignificant,
  safeParseUnits,
  scaleDownRoundUp,
  scaleTo,
  SECS_PER_MONTH,
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
  superToken?:
    | {
        value: bigint; // balance in super token units
        symbol: string;
        decimals: number;
        address: Address;
        formatted?: string;
        sameAsUnderlying?: boolean;
      }
    | undefined;
}

export const PoolMetrics: FC<PoolMetricsProps> = ({
  strategy,
  poolToken,
  chainId,
  superToken,
}) => {
  const { id: poolAddress, poolId } = strategy;
  const [amountInput, setAmount] = useState<string>("");
  const [streamDuration, setStreamDuration] = useState("1"); // months
  const [isStreamTxModalOpen, setIsStreamTxModalOpen] = useState(false);
  const { address: accountAddress } = useAccount();
  const [isStreamModalOpened, setIsStreamModalOpened] = useState(false);
  const [isTransferModalOpened, setIsTransferModalOpened] = useState(false);
  const [forceAllBalanceUsage, setForceAllBalanceUsage] = useState(false);

  const showUseSuperTokenBalance = useCheat("showUseSuperTokenBalance");
  const {
    currentUserOtherFlowRateBn,
    currentFlowRateBn,
    currentUserFlowRateBn,
    setCurrentUserFlowRateBn,
    setCurrentFlowRateBn,
    refetch: refetchSuperfluidStream,
  } = useSuperfluidStream({
    receiver: poolAddress,
    superToken: superToken?.address as Address,
  });

  useEffect(() => {
    if (!accountAddress || !poolAddress) return;
    refetchSuperfluidStream();
  }, [accountAddress, poolAddress, refetchSuperfluidStream]);

  // ---------- units ----------
  const underlyingDec = poolToken.decimals;
  const superDec = superToken?.decimals ?? underlyingDec;

  // ---------- inputs as bigint ----------
  const amount = Number(amountInput || "0");

  // ---------- flow rates (super units/sec) ----------
  const amountUnderlyingBn = safeParseUnits(amountInput, underlyingDec);
  const monthsBn = BigInt(Math.max(1, +streamDuration || 1));

  // total to stream in SUPER units
  const totalSuperBn = scaleTo(amountUnderlyingBn, underlyingDec, superDec);

  // ceil divide helper

  // per-second flow rate in SUPER units (int96 > 0)
  const denom = monthsBn * SECS_PER_MONTH;
  const streamRequestedAmountPerSecBn =
    totalSuperBn === 0n ? 0n : ceilDiv(totalSuperBn, denom);

  // ---------- super balance budgeting ----------
  const reservedSuperTokenBn =
    (currentUserOtherFlowRateBn ?? 0n) * (SECS_PER_MONTH * 3n); // super units
  const superBalanceBn = superToken?.value ?? 0n;
  const availableSuperBn =
    superBalanceBn > reservedSuperTokenBn ?
      superBalanceBn - reservedSuperTokenBn
    : 0n;
  const availableUsedSuperBn =
    forceAllBalanceUsage ? superBalanceBn : availableSuperBn;

  // how much super is needed to cover total requested amount
  const requestedTotalSuperBn = scaleTo(
    amountUnderlyingBn,
    underlyingDec,
    superDec,
  );
  const netNeededSuperBn =
    requestedTotalSuperBn > availableUsedSuperBn ?
      requestedTotalSuperBn - availableUsedSuperBn
    : 0n;
  const isSuperTokenEnoughBalance = netNeededSuperBn === 0n;

  // amount to upgrade() in UNDERLYING units (round up)
  const upgradeAmountUnderlyingBn = scaleDownRoundUp(
    netNeededSuperBn,
    superDec,
    underlyingDec,
  );

  // ---------- wagmi writes ----------
  const { writeAsync: writeFundPoolAsync, isLoading: isSendFundsLoading } =
    useContractWriteWithConfirmations({
      address: poolToken.address,
      abi: abiWithErrors(erc20ABI),
      functionName: "transfer",
      contractName: "ERC20",
      args: [poolAddress as Address, amountUnderlyingBn],
    });

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
        (old) => (old ?? 0n) + streamRequestedAmountPerSecBn,
      );
      setCurrentUserFlowRateBn(streamRequestedAmountPerSecBn);
    },
    args: [
      superToken?.address as Address,
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
          streamRequestedAmountPerSecBn -
          (currentUserFlowRateBn ?? 0n),
      );
      setCurrentUserFlowRateBn(streamRequestedAmountPerSecBn);
    },
    args: [
      superToken?.address as Address,
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
        await writeEditStreamAsync();
      } else {
        await writeStreamFundsAsync();
      }
    },
    args: [netNeededSuperBn],
  });

  const {
    allowanceTxProps: wrapAllowanceTx,
    handleAllowance: handleWrapAllowance,
    resetState: resetWrapAllowanceState,
  } = useHandleAllowance(
    accountAddress,
    poolToken,
    superToken?.address as Address,
    upgradeAmountUnderlyingBn,
    () => writeWrapFunds(),
  );

  // ---------- balances ----------
  const { data: walletBalance } = useBalance({
    address: accountAddress,
    formatUnits: poolToken.decimals,
    token: poolToken.address as Address,
    watch: true,
    chainId: chainId,
    enabled: !!accountAddress && !!poolToken.address,
  });

  const hasInsufficientBalance =
    !!walletBalance?.formatted && +walletBalance.formatted < amount;

  // effective available in UNDERLYING units
  const effectiveAvailableUnderlyingBn =
    (walletBalance?.value ?? 0n) +
    scaleTo(availableUsedSuperBn, superDec, underlyingDec);

  const effectiveAvailableBalance = Number(
    formatUnits(effectiveAvailableUnderlyingBn, underlyingDec),
  );

  const hasInsufficientStreamBalance =
    hasInsufficientBalance &&
    effectiveAvailableUnderlyingBn < amountUnderlyingBn;

  // ---------- display numbers ----------
  const requestedStreamPerMonthUnderlying = Number(
    formatUnits(
      scaleTo(
        streamRequestedAmountPerSecBn * SECS_PER_MONTH,
        superDec,
        underlyingDec,
      ),
      underlyingDec,
    ),
  );

  const currentFlowPerMonthUnderlying = Number(
    formatUnits(
      scaleTo(
        (currentFlowRateBn ?? 0n) * SECS_PER_MONTH,
        superDec,
        underlyingDec,
      ),
      underlyingDec,
    ),
  );

  const currentUserFlowPerMonthUnderlying = Number(
    formatUnits(
      scaleTo(
        (currentUserFlowRateBn ?? 0n) * SECS_PER_MONTH,
        superDec,
        underlyingDec,
      ),
      underlyingDec,
    ),
  );

  const reservedSuperToken = Number(
    formatUnits(reservedSuperTokenBn, superDec),
  );

  // ---------- buttons/tooltips ----------
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

  // ---------- tx state ----------
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
  }, [editStreamStatus, editStreamError]);

  useEffect(() => {
    setWrapFundsTx((prev) => ({
      ...prev,
      message: getTxMessage(wrapFundsStatus, wrapFundsError),
      status: wrapFundsStatus ?? "idle",
    }));
  }, [wrapFundsStatus, wrapFundsError]);

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

  // ---------- actions ----------
  const handleStreamFunds = async () => {
    resetTxsStatus();
    if (superToken?.sameAsUnderlying) {
      await writeStreamFundsAsync();
      setIsStreamModalOpened(false);
      return;
    }
    if (isSuperTokenEnoughBalance) {
      await writeStreamFundsAsync();
      setIsStreamModalOpened(false);
      return;
    }
    setIsStreamTxModalOpen(true);
    await handleWrapAllowance({ formAmount: upgradeAmountUnderlyingBn });
    setIsStreamModalOpened(false);
  };

  const handleStreamEdit = async () => {
    resetTxsStatus();
    if (superToken?.sameAsUnderlying) {
      await writeStreamFundsAsync();
      setIsStreamModalOpened(false);
      return;
    }
    if (isSuperTokenEnoughBalance) {
      await writeEditStreamAsync();
      setIsStreamModalOpened(false);
      return;
    }
    setIsStreamTxModalOpen(true);
    await handleWrapAllowance({ formAmount: upgradeAmountUnderlyingBn });
    setIsStreamModalOpened(false);
  };

  // ---------- UI ----------
  const fundAmountInput = (
    <label className="input input-bordered input-info flex items-center gap-2">
      <input
        max={walletBalance?.formatted}
        min={0}
        value={amountInput}
        onChange={(e) => {
          const value = e.target.value;
          if (+value >= 0) setAmount(value);
        }}
        required
        type="number"
        placeholder="0"
        className="grow"
      />
      {poolToken.symbol}
    </label>
  );

  const availableBalanceTooltipMessage = [
    walletBalance && +walletBalance.formatted > 0 ?
      `${roundToSignificant(walletBalance.formatted, 4, { truncate: true })} ${poolToken.symbol}`
    : null,
    superToken && superToken.formatted != null && +superToken.formatted > 0 ?
      `${roundToSignificant(superToken.formatted, 4, { truncate: true })} ${superToken.symbol}`
    : null,
    reservedSuperToken > 0 ?
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
          <Skeleton isLoading={requestedStreamPerMonthUnderlying == null}>
            <DisplayNumber
              number={roundToSignificant(requestedStreamPerMonthUnderlying, 2)}
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
          {currentUserFlowPerMonthUnderlying > 0 && (
            <>
              <div className="border border-l-primary-button border-l-4 rounded-md p-2 flex items-center gap-2 justify-between">
                <div className="flex flex-col gap-1">
                  You are currently streaming:
                  <div>
                    <div
                      data-tip={`${currentUserFlowPerMonthUnderlying} ${poolToken.symbol}/mo`}
                      className="tooltip tooltip-top-right text-left"
                    >
                      {roundToSignificant(currentUserFlowPerMonthUnderlying, 4)}
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
                      Math.max(+(prev || 0) - 1, 1).toString(),
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
                  data-tip={`${requestedStreamPerMonthUnderlying} ${poolToken.symbol}/mo`}
                >
                  {roundToSignificant(requestedStreamPerMonthUnderlying, 4)}
                </div>{" "}
                {poolToken.symbol}
              </div>
            </div>
          </div>

          <div className="w-full flex justify-end mt-4">
            {currentUserFlowRateBn == null ?
              <Button
                onClick={handleStreamFunds}
                color="primary"
                isLoading={isStreamFundsLoading}
                disabled={isStreamButtonDisabled}
                tooltip={streamTooltipMessage}
                className="w-full"
              >
                Stream {roundToSignificant(amount, 4)} {poolToken.symbol}
              </Button>
            : <Button
                onClick={handleStreamEdit}
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
                    data-tip={availableBalanceTooltipMessage}
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
                                {
                                  truncate: true,
                                },
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

      <div className="col-span-12 xl:col-span-3 h-fit mb-16">
        <div className="backdrop-blur-sm rounded-lg">
          <section className="section-layout gap-2 flex flex-col">
            <h3>Pool Funds</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center gap-3 z-o">
                <p className="subtitle2">Funds in pool:</p>
                <div className="flex items-center gap-1">
                  <DisplayNumber
                    copiable={true}
                    number={[poolToken.balance, poolToken.decimals]}
                    tokenSymbol={poolToken.symbol}
                    compact={true}
                    valueClassName="text-2xl mr-1 font-bold text-primary-content"
                  />
                </div>
              </div>

              {currentFlowRateBn != null && currentFlowRateBn > 0n && (
                <div className="flex justify-between gap-3 items-center">
                  <p className="subtitle2">Incoming Stream:</p>
                  <div className="flex items-center gap-1">
                    <p className="flex items-center whitespace-nowrap tooltip">
                      <div
                        data-tip={`${currentFlowPerMonthUnderlying} ${poolToken.symbol}/mo`}
                        className="tooltip"
                      >
                        {roundToSignificant(currentFlowPerMonthUnderlying, 3)}
                      </div>{" "}
                      {poolToken.symbol}
                      /mo
                    </p>
                    <div
                      className="tooltip tooltip-top-left cursor-pointer w-8"
                      data-tip={`This pool is receiving ${roundToSignificant(
                        currentFlowPerMonthUnderlying,
                        4,
                      )} ${poolToken.symbol}/month through Superfluid streaming`}
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
                    number={[walletBalance?.value ?? 0n, poolToken.decimals]}
                    tokenSymbol={poolToken.symbol}
                    compact={true}
                    valueClassName="text-black text-lg"
                    symbolClassName="text-sm text-black"
                  />
                </div>
              )}
            </div>

            <div
              className={`w-full dropdown dropdown-hover dropdown-start ${
                missmatchUrl || !isConnected ? "" : "tooltip"
              } z-50`}
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
                <ul className="dropdown-content menu bg-base-100 rounded-box z-[1] w-full p-2 shadow">
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
                      disabled={missmatchUrl || !isConnected || !superToken}
                      tooltip={
                        missmatchUrl || !isConnected ? tooltipMessage : (
                          "Not enabled yet, the community's Council Safe can connect to enable streaming for this Pool"
                        )
                      }
                      icon={<ArrowPathRoundedSquareIcon className="w-5 h-5" />}
                      className="w-full mt-1 xl:!justify-start"
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
