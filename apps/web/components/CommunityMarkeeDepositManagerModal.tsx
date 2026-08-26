"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { getWalletClient } from "@wagmi/core";
import { Address, formatEther, parseEther } from "viem";
import {
  useAccount,
  useBalance,
  useNetwork,
  usePublicClient,
  useSwitchNetwork,
} from "wagmi";
import { Button } from "@/components/Button";
import { InfoWrapper } from "@/components/InfoWrapper";
import { Modal } from "@/components/Modal";
import { chainConfigMap, getExplorerUrl } from "@/configs/chains";
import { ComputedStatus } from "@/hooks/useContractWriteWithConfirmations";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { reportClientError } from "@/utils/clientErrorReporter";
import { logOnce } from "@/utils/log";
import {
  ethxApproveABI,
  formatMarkeeEthxBalance,
  formatMarkeeRunway,
  getMarkeeRunwayProgress,
  getMarkeeRunwaySeconds,
  MARKEE_SECONDS_IN_MONTH,
} from "@/utils/markeeStreaming";
import { isUserRejectedTransactionError } from "@/utils/transactionMessages";

type Action = "deposit" | null;

type Props = {
  activeRatePerSecond: bigint;
  chainId: number;
  ethxAddress: Address;
  ethxBalance: bigint;
  isOpen: boolean;
  onBalancesChanged: () => void;
  onClose: () => void;
};

const sanitizeAmount = (value: string) => {
  const cleaned = value.replace(/[^\d.]/gu, "");
  const [whole = "", ...decimals] = cleaned.split(".");
  return decimals.length > 0 ? `${whole}.${decimals.join("")}` : whole;
};

const parseAmount = (value: string) => {
  try {
    return parseEther(value || "0");
  } catch {
    return 0n;
  }
};

export function CommunityMarkeeDepositManagerModal({
  activeRatePerSecond,
  chainId,
  ethxAddress,
  ethxBalance,
  isOpen,
  onBalancesChanged,
  onClose,
}: Props) {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const publicClient = usePublicClient({ chainId });
  const { data: nativeBalance } = useBalance({
    address,
    chainId,
    enabled: isOpen && address != null,
    watch: true,
  });
  const [action, setAction] = useState<Action>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [lastTransaction, setLastTransaction] = useState<{
    hash: `0x${string}`;
  } | null>(null);
  const [transactionHash, setTransactionHash] = useState<
    `0x${string}` | undefined
  >();
  const [transactionError, setTransactionError] = useState<Error | null>(null);
  const [transactionStatus, setTransactionStatus] =
    useState<ComputedStatus>(undefined);
  const amountWei = useMemo(() => parseAmount(amount), [amount]);
  const isBusy =
    transactionStatus === "waiting" || transactionStatus === "loading";
  const runway = getMarkeeRunwaySeconds(ethxBalance, activeRatePerSecond);
  const progress =
    activeRatePerSecond > 0n ? getMarkeeRunwayProgress(runway) : 100;
  const runwayIsLow = activeRatePerSecond > 0n && runway < 7n * 86_400n;

  useTransactionNotification({
    chainId,
    contractName: "Deposit ETH for streaming",
    enabled: transactionStatus != null,
    fallbackErrorMessage: "Unable to update your streamable balance.",
    safeAddress: address,
    targetAddress: ethxAddress,
    transactionData:
      transactionHash != null ? { hash: transactionHash } : undefined,
    transactionError,
    transactionHash,
    transactionStatus,
    watchTransaction: true,
  });

  useEffect(() => {
    if (isOpen) return;
    setAction(null);
    setAmount("");
    setError(null);
    setTransactionError(null);
    setTransactionHash(undefined);
    setTransactionStatus(undefined);
    setLastTransaction(null);
  }, [isOpen]);

  const prepareAction = (nextAction: Exclude<Action, null>) => {
    setAction((current) => (current === nextAction ? null : nextAction));
    setAmount("");
    setError(null);
    setLastTransaction(null);
  };

  const setDepositMonths = (months: number) => {
    if (activeRatePerSecond <= 0n) return;
    setAmount(
      formatEther(
        activeRatePerSecond * MARKEE_SECONDS_IN_MONTH * BigInt(months),
      ),
    );
    setError(null);
  };

  const setDepositWalletPercentage = (percentage: number) => {
    setDepositPercentage(percentage);
    setAmount(
      formatEther(((nativeBalance?.value ?? 0n) * BigInt(percentage)) / 100n),
    );
    setError(null);
  };

  const submit = async () => {
    if (address == null || publicClient == null || action == null) return;
    setError(null);
    setTransactionError(null);

    if (amountWei <= 0n) {
      setError(`Enter an amount to ${action}.`);
      return;
    }
    if ((nativeBalance?.value ?? 0n) < amountWei) {
      setError("Your wallet does not have enough native ETH.");
      return;
    }

    try {
      setTransactionStatus("waiting");
      if (chain?.id !== chainId) await switchNetworkAsync?.(chainId);
      const walletClient = await getWalletClient({ chainId });
      if (walletClient == null)
        throw new Error("Connect your wallet to continue.");

      const hash = await walletClient.writeContract({
        abi: ethxApproveABI,
        account: address,
        address: ethxAddress,
        functionName: "upgradeByETHTo",
        args: [address],
        value: amountWei,
      });
      setTransactionHash(hash);
      setTransactionStatus("loading");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("The balance transaction reverted.");
      }
      setTransactionStatus("success");
      setLastTransaction({ hash });
      setAction(null);
      setAmount("");
      onBalancesChanged();
    } catch (cause) {
      if (isUserRejectedTransactionError(cause)) {
        setTransactionStatus(undefined);
        return;
      }
      const nextError =
        cause instanceof Error ? cause : new Error("The transaction failed.");
      setTransactionError(nextError);
      setTransactionStatus("error");
      setError(
        "Your streamable balance could not be updated. Please try again.",
      );
      const context = {
        type: "markee-deposit-manager-error",
        action,
        chainId,
        connectedAccount: address,
        ethxAddress,
        tags: {
          error_type: "markee-deposit-manager-error",
          chain_id: chainId,
        },
      };
      logOnce(
        "error",
        "[CommunityMarkee] Deposit Manager failed",
        cause,
        context,
      );
      reportClientError(cause, context);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      title="Deposit Manager"
      testId="markee-deposit-manager"
      footer={null}
    >
      <button
        type="button"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary-content"
        onClick={onClose}
      >
        <ArrowLeftIcon className="h-4 w-4" /> Back
      </button>

      <div className="flex flex-col gap-5">
        {activeRatePerSecond > 0n && (
          <section>
            <div className="mb-2 flex items-center justify-between gap-4">
              <InfoWrapper
                tooltip="If your ETHx runs out, your active Markee streams can be liquidated."
                size="sm"
                className="tooltip-top-left"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-soft-content">
                  Runs out in
                </span>
              </InfoWrapper>
              <span className="font-mono text-sm font-semibold text-neutral-content">
                {activeRatePerSecond > 0n ? formatMarkeeRunway(runway) : "—"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-content/10">
              <div
                className={`h-full rounded-full transition-all ${runwayIsLow ? "bg-danger-content" : "bg-primary-content"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>
        )}

        <section className="rounded-xl border border-neutral-content/15 bg-neutral/30 p-4">
          <InfoWrapper
            tooltip="Markee uses Superfluid for payment streaming. Deposit ETH to get ETHx you can use for payments."
            size="sm"
            className="tooltip-top-left"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-soft-content">
              ETHx balance
            </span>
          </InfoWrapper>
          <p className="mt-2 font-mono text-3xl font-semibold text-neutral-content">
            {formatMarkeeEthxBalance(ethxBalance)}{" "}
            <span className="text-sm text-neutral-soft-content">ETHx</span>
          </p>
          <div className="mt-4">
            <Button
              btnStyle={action === "deposit" ? "filled" : "outline"}
              color="primary"
              className="w-full"
              onClick={() => prepareAction("deposit")}
            >
              Deposit
            </Button>
          </div>

          {lastTransaction != null && (
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
              <span className="text-primary-content">✓ Deposit confirmed</span>
              <a
                className="text-primary-content underline decoration-dotted underline-offset-4"
                href={`${getExplorerUrl(chainId).replace(/\/$/u, "")}/tx/${lastTransaction.hash}`}
                target="_blank"
                rel="noreferrer"
              >
                View transaction ↗
              </a>
            </div>
          )}

          {action != null && (
            <div className="mt-4 flex flex-col gap-3 border-t border-neutral-content/15 pt-4">
              <div className="flex justify-between gap-4 text-xs text-neutral-soft-content">
                <span>
                  Wallet ETH:{" "}
                  {formatEther(nativeBalance?.value ?? 0n).slice(0, 8)}
                </span>
                <span>ETHx: {formatEther(ethxBalance).slice(0, 8)}</span>
              </div>
              <div className="join flex w-full">
                <input
                  inputMode="decimal"
                  className="input join-item input-bordered input-info min-w-0 flex-1 bg-primary-soft-dark font-mono outline-none"
                  value={amount}
                  disabled={isBusy}
                  onChange={(event) => {
                    setAmount(sanitizeAmount(event.target.value));
                    setError(null);
                  }}
                  placeholder="Amount in ETH"
                />
                <Button
                  btnStyle="filled"
                  color="primary"
                  className="join-item rounded-l-none"
                  disabled={isBusy || amountWei <= 0n}
                  isLoading={isBusy}
                  onClick={submit}
                >
                  Deposit
                </Button>
              </div>
              {activeRatePerSecond > 0n ?
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((shortcut) => (
                    <button
                      type="button"
                      key={shortcut}
                      className="h-8 rounded-lg border border-neutral-content/25 text-xs text-neutral-soft-content transition-colors hover:border-primary-content hover:text-primary-content disabled:opacity-40"
                      onClick={() => setDepositMonths(shortcut)}
                    >
                      {shortcut}mo
                    </button>
                  ))}
                </div>
              : <label className="flex flex-col gap-1.5">
                  <span className="flex items-center justify-between text-xs text-neutral-soft-content">
                    <span>% of wallet balance</span>
                    <span className="font-mono font-semibold text-neutral-content">
                      {depositPercentage}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    className="range range-primary range-xs"
                    disabled={(nativeBalance?.value ?? 0n) <= 0n}
                    value={depositPercentage}
                    onChange={(event) =>
                      setDepositWalletPercentage(Number(event.target.value))
                    }
                  />
                </label>
              }
              {error != null && (
                <p className="text-xs text-danger-content">{error}</p>
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-primary-content/30 bg-primary-content/5 p-4">
            <p className="text-xs uppercase tracking-wider text-primary-content">
              Streaming now
            </p>
            <p className="mt-2 font-mono text-neutral-content">
              {formatEther(activeRatePerSecond * MARKEE_SECONDS_IN_MONTH).slice(
                0,
                10,
              )}{" "}
              ETHx/mo
            </p>
          </div>
          <div className="rounded-xl border border-neutral-content/15 bg-neutral/30 p-4">
            <p className="text-xs uppercase tracking-wider text-neutral-soft-content">
              Network
            </p>
            <p className="mt-2 text-neutral-content">
              {chainConfigMap[chainId]?.name ?? `Chain ${chainId}`}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
