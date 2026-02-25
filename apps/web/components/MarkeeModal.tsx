"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatEther, parseEther, UserRejectedRequestError } from "viem";
import { useAccount, useBalance, useChainId, useSwitchNetwork } from "wagmi";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { MarkeeAbi } from "@/src/customAbis";
import {
  fetchMarkeeLeaderboard,
  GARDENS_STRATEGY,
  MarkeeNetwork,
} from "@/utils/markee";
import { getTxMessage } from "@/utils/transactionMessages";

// Confirmed from Basescan readContract
const DEFAULT_MAX_MESSAGE = 223;
const DEFAULT_MAX_NAME = 22;
const trimTrailingZeros = (value: string) =>
  value.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");

type LeaderboardEntry = {
  message: string;
  name: string;
  totalFundsAdded: string;
};

type Props = {
  onClose: () => void;
  onSuccess: () => void;
  currentTopDawg: bigint;
  currentMessage: string;
  minimumPrice: bigint;
  takeTopSpot: bigint;
};

export default function MarkeeModal({
  onClose,
  onSuccess,
  currentMessage,
  minimumPrice,
  takeTopSpot,
}: Props) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [ethAmount, setEthAmount] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState(false);
  const [ethError, setEthError] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const { address } = useAccount();
  const connectedChainId = useChainId();
  const {
    switchNetwork,
    switchNetworkAsync,
    isLoading: isSwitching,
  } = useSwitchNetwork();
  const { openConnectModal } = useConnectModal();

  const activeAddress = address;
  const isOnBase = connectedChainId === MarkeeNetwork.id;
  const isConnected = !!activeAddress;
  const { data: baseBalanceData } = useBalance({
    address: activeAddress,
    chainId: MarkeeNetwork.id,
    watch: true,
    enabled: activeAddress != null,
  });
  const baseBalance = baseBalanceData?.value ?? null;

  const { writeAsync, isLoading: isPending } =
    useContractWriteWithConfirmations({
      address: GARDENS_STRATEGY,
      abi: MarkeeAbi,
      functionName: "createMarkee",
      contractName: "TopDawgPartnerStrategy",
      onConfirmations: onSuccess,
      showNotification: false,
      chainId: MarkeeNetwork.id,
      account: activeAddress,
    });

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (!leaderboardOpen || leaderboard.length > 0) return;
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    fetchMarkeeLeaderboard(GARDENS_STRATEGY)
      .then((entries) => {
        setLeaderboard(entries);
      })
      .catch(() => {
        setLeaderboardError("Unable to load leaderboard.");
      })
      .finally(() => setLeaderboardLoading(false));
  }, [leaderboardOpen, leaderboard.length]);

  // Passed in from MarkeeSign (computed correctly there)
  const takeTopSpotInput = formatEther(takeTopSpot);
  const minToJoinInput = formatEther(minimumPrice);
  const takeTopSpotEth = trimTrailingZeros(
    parseFloat(takeTopSpotInput).toFixed(3),
  );
  const minToJoinEth = trimTrailingZeros(parseFloat(minToJoinInput).toFixed(6));

  const totalRaised = leaderboard.reduce(
    (sum, e) => sum + BigInt(e.totalFundsAdded),
    BigInt(0),
  );

  const validate = () => {
    let valid = true;
    if (!message.trim()) {
      setMessageError(true);
      valid = false;
    } else {
      setMessageError(false);
    }
    if (
      !ethAmount ||
      isNaN(parseFloat(ethAmount)) ||
      parseFloat(ethAmount) <= 0
    ) {
      setEthError(true);
      setInputError("Enter a valid ETH amount.");
      valid = false;
    } else {
      let parsedAmount: bigint;
      try {
        parsedAmount = parseEther(ethAmount);
      } catch {
        setEthError(true);
        setInputError("Invalid ETH amount.");
        return false;
      }
      if (parsedAmount < minimumPrice) {
        setEthError(true);
        setInputError(
          `Minimum is ${minToJoinEth} ETH to join the leaderboard.`,
        );
        valid = false;
      } else if (baseBalance != null && parsedAmount > baseBalance) {
        setEthError(true);
        setInputError("Insufficient ETH balance.");
        valid = false;
      } else {
        setEthError(false);
        if (valid) setInputError(null);
      }
    }
    if (!valid && message.trim()) {
      // Only set generic error if no specific eth error was set
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!activeAddress) {
      setInputError("Connect your wallet before submitting.");
      return;
    }
    if (!isOnBase) {
      try {
        if (switchNetworkAsync) {
          await switchNetworkAsync(MarkeeNetwork.id);
        } else {
          switchNetwork?.(MarkeeNetwork.id);
        }
        setInputError("Switched to Base. Please submit again.");
      } catch (switchError) {
        console.error("[MarkeeModal] Failed to switch to Base", switchError);
        setInputError("Please switch your wallet to Base mainnet first.");
      }
      return;
    }
    setIsConfirming(true);
    try {
      const value = parseEther(ethAmount);
      const args = [message.trim(), name.trim()] as const;

      await writeAsync({
        args,
        value,
      });
      // onSuccess is called via onConfirmations in the hook
    } catch (err: any) {
      if (err?.cause instanceof UserRejectedRequestError) return;
      setInputError(
        getTxMessage("error", err, "Transaction failed. Please try again."),
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const isLoading = isPending || isConfirming || isSwitching;
  let parsedAmount: bigint | null = null;
  if (ethAmount && !isNaN(parseFloat(ethAmount)) && parseFloat(ethAmount) > 0) {
    try {
      parsedAmount = parseEther(ethAmount);
    } catch {
      parsedAmount = null;
    }
  }
  const hasInsufficientBalance =
    isOnBase &&
    baseBalance != null &&
    parsedAmount != null &&
    parsedAmount > baseBalance;
  const amountHasError = ethError || hasInsufficientBalance;
  const buyDisabled =
    isLoading || (isConnected && !isOnBase) || hasInsufficientBalance;
  const buyTooltip = hasInsufficientBalance ? "Insufficient balance" : "";
  const isFormDirty =
    message.length > 0 || name.length > 0 || ethAmount.length > 0;
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target !== dialogRef.current) return;
    if (isFormDirty) return;
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClick={handleBackdropClick}
      onClose={onClose}
    >
      <div className="modal-box bg-neutral border border-border-neutral dark:border-white/15 dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)] max-w-md w-full p-0 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-neutral border-b border-border-neutral dark:border-white/15 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-content">
              Change the Markee Message
            </h3>
            <p className="text-xs text-neutral-content/60 mt-0.5">
              62% to Gardens Treasury · 38% to{" "}
              <a
                href="https://app.gardens.fund/gardens/8453/0xee3027f1e021b09d629922d40436c5dea3c6cb38/0xce6b968c8bd130ca08f1fcc97b509a824380d867"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-primary-content transition-colors"
              >
                Markee Cooperative
              </a>
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle ml-3 flex-shrink-0"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
        {/* Current message + leaderboard */}
        <div className="mb-5 rounded border border-neutral-content/20 bg-neutral-focus px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-content/50 mb-1">
              Current message
            </p>
            <p className="font-mono text-sm text-neutral-content break-words">
              {currentMessage}
            </p>
          </div>

          <button
            onClick={() => setLeaderboardOpen((o) => !o)}
            className="mt-3 flex items-center gap-1 text-xs text-neutral-content/50 hover:text-neutral-content/80 transition-colors"
          >
            <ChevronDownIcon
              className={`h-3.5 w-3.5 transition-transform duration-200 ${leaderboardOpen ? "rotate-180" : ""}`}
            />
            {leaderboardOpen ? "Hide leaderboard" : "Show leaderboard"}
          </button>

          {leaderboardOpen && (
            <div className="mt-3 border-t border-neutral-content/10 pt-3 space-y-2">
              {leaderboardLoading ?
                <p className="text-xs text-neutral-content/40 font-mono">
                  loading...
                </p>
              : leaderboardError ?
                <p className="text-xs text-red-400">{leaderboardError}</p>
              : leaderboard.length === 0 ?
                <p className="text-xs text-neutral-content/40">
                  No entries yet.
                </p>
              : <>
                  {leaderboard.map((entry) => (
                    <div
                      key={`${entry.totalFundsAdded}-${entry.name}-${entry.message}`}
                      className="flex items-start justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-neutral-content break-words">
                          {entry.message}
                        </p>
                        {entry.name && (
                          <p className="text-xs text-neutral-content/40 mt-0.5">
                            {entry.name}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-mono text-neutral-content/50 flex-shrink-0 mt-0.5">
                        {parseFloat(
                          formatEther(BigInt(entry.totalFundsAdded)),
                        ).toFixed(3)}{" "}
                        ETH
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-neutral-content/10">
                    <span className="text-xs text-neutral-content/50 font-medium">
                      Total raised
                    </span>
                    <span className="text-xs font-mono font-semibold text-neutral-content/70">
                      {parseFloat(formatEther(totalRaised)).toFixed(3)} ETH
                    </span>
                  </div>
                </>
              }
              <p className="pt-2 text-xs text-neutral-content/40 border-t border-neutral-content/10">
                Add funds and edit your existing messages at{" "}
                <a
                  href="https://www.markee.xyz/ecosystem/gardens"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-neutral-content/70 transition-colors"
                >
                  markee.xyz/ecosystem/gardens
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Your Message */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-content mb-1.5">
            Your Message{" "}
            <span className="text-xs text-neutral-content/40 font-normal">
              ({message.length}/{DEFAULT_MAX_MESSAGE})
            </span>
          </label>
          <textarea
            className={`textarea textarea-bordered w-full bg-neutral text-neutral-content placeholder:text-neutral-content/30 resize-y min-h-[88px] max-h-56 font-mono text-sm transition-colors ${
              messageError ? "border-red-500" : "border-border-neutral"
            }`}
            placeholder="this is a sign."
            value={message}
            maxLength={DEFAULT_MAX_MESSAGE}
            rows={3}
            onChange={(e) => {
              setMessage(e.target.value);
              setMessageError(false);
              setInputError(null);
            }}
          />
          {messageError && (
            <p className="mt-1 text-xs text-red-400">Message is required.</p>
          )}
        </div>

        {/* Your Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-content mb-1.5">
            Your Name{" "}
            <span className="text-xs text-neutral-content/40 font-normal">
              (optional · {name.length}/{DEFAULT_MAX_NAME})
            </span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full bg-neutral border-border-neutral text-neutral-content placeholder:text-neutral-content/30 text-sm"
            placeholder="vitalik"
            value={name}
            maxLength={DEFAULT_MAX_NAME}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* ETH Amount — 3 columns */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-content mb-2">
            ETH Amount
            {isOnBase && baseBalance != null && (
              <span className="text-xs text-neutral-content/40 font-normal ml-2">
                (balance: {parseFloat(formatEther(baseBalance)).toFixed(3)} ETH)
              </span>
            )}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Take top spot — gold border highlight */}
            <div
              className="tooltip tooltip-top"
              data-tip={`Set to ${takeTopSpotInput} ETH`}
            >
              <button
                type="button"
                onClick={() => {
                  setEthAmount(takeTopSpotInput);
                  setEthError(false);
                  setInputError(null);
                }}
                className={`flex flex-col items-center justify-center rounded bg-neutral-focus hover:bg-neutral-focus/80 transition-colors px-2 py-2.5 text-center cursor-pointer ${
                  ethAmount === takeTopSpotInput ?
                    "border-2 border-yellow-400"
                  : "border-2 border-yellow-400/50 hover:border-yellow-400"
                }`}
              >
                <span className="text-xs font-mono font-semibold text-neutral-content">
                  {takeTopSpotEth} ETH
                </span>
                <span className="text-xs text-neutral-content/50 mt-0.5 leading-tight">
                  Take top spot
                </span>
              </button>
            </div>

            {/* Minimum to buy */}
            <div
              className="tooltip tooltip-top"
              data-tip={`Set to ${minToJoinInput} ETH`}
            >
              <button
                type="button"
                onClick={() => {
                  setEthAmount(minToJoinInput);
                  setEthError(false);
                  setInputError(null);
                }}
                className={`flex flex-col items-center justify-center rounded border bg-neutral-focus hover:border-neutral-content/40 hover:bg-neutral-focus/80 transition-colors px-2 py-2.5 text-center cursor-pointer ${
                  (
                    ethAmount === minToJoinInput &&
                    ethAmount !== takeTopSpotInput
                  ) ?
                    "border-neutral-content/60"
                  : "border-neutral-content/20"
                }`}
              >
                <span className="text-xs font-mono font-semibold text-neutral-content">
                  {minToJoinEth} ETH
                </span>
                <span className="text-xs text-neutral-content/50 mt-0.5 leading-tight">
                  Minimum to buy
                </span>
              </button>
            </div>

            {/* Custom entry — match height of preset buttons */}
            <input
              type="number"
              className={`input input-bordered w-full h-auto bg-neutral text-neutral-content placeholder:text-neutral-content/30 font-mono text-xs text-center transition-colors py-2.5 ${
                amountHasError ? "border-red-500" : "border-border-neutral"
              }`}
              placeholder={takeTopSpotEth}
              value={ethAmount}
              min="0"
              step="any"
              onChange={(e) => {
                setEthAmount(e.target.value);
                setEthError(false);
                setInputError(null);
              }}
            />
          </div>
          {(ethError || hasInsufficientBalance) && (
            <p className="mt-2 rounded border border-red-500/30 bg-red-500/10 px-2 pt-2 pb-1.5 text-xs text-red-300">
              {hasInsufficientBalance ?
                "Insufficient ETH balance."
              : inputError}
            </p>
          )}
        </div>

        {/* Wrong network banner — below ETH selection */}
        {isConnected && !isOnBase && (
          <div className="mb-4 rounded border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-yellow-400">
              Switch to Base to pay for the sign.
            </p>
            <button
              onClick={() => switchNetwork?.(MarkeeNetwork.id)}
              className="btn btn-xs ml-3 bg-yellow-500 text-black border-0 hover:opacity-80"
              disabled={isSwitching}
            >
              {isSwitching ? "Switching..." : "Switch to Base"}
            </button>
          </div>
        )}

        {/* General error */}
        {inputError && !messageError && !ethError && (
          <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {inputError}
          </div>
        )}

        {/* Action — centered */}
        <div className="flex justify-center mt-5">
          {!isConnected ?
            <button
              onClick={() => {
                dialogRef.current?.close();
                openConnectModal?.();
              }}
              className="btn btn-sm bg-primary text-primary-content hover:opacity-80 border-0 px-8"
            >
              Connect Wallet
            </button>
          : <div
              className={buyTooltip ? "tooltip tooltip-top" : ""}
              data-tip={buyTooltip}
            >
              <button
                onClick={handleSubmit}
                disabled={buyDisabled}
                className={`btn btn-sm px-8 text-white transition-colors ${
                  buyDisabled ?
                    "!bg-neutral-700/70 !text-neutral-300/70 !border !border-neutral-500/60 !shadow-none opacity-80 cursor-not-allowed"
                  : "border-0 bg-green-600 hover:bg-green-500"
                }`}
              >
                {isPending ?
                  "Confirm in wallet..."
                : isConfirming ?
                  "Confirming..."
                : "Buy Message"}
              </button>
            </div>
          }
        </div>

        <p className="mt-4 text-center text-xs text-neutral-content/40">
          You&apos;ll receive MARKEE tokens and become a Markee Network owner
        </p>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button
          onClick={(e) => {
            if (isFormDirty) {
              e.preventDefault();
              return;
            }
            onClose();
          }}
        >
          close
        </button>
      </form>
    </dialog>
  );
}
