"use client";

import React, { useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { formatEther, parseEther } from "viem";
import { base } from "viem/chains";
import {
  useAccount,
  useBalance,
  useContractWrite,
  useNetwork,
  usePublicClient,
  useSwitchNetwork,
} from "wagmi";

const TOP_DAWG_PARTNER_ABI = [
  {
    name: "createMarkee",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_message", type: "string" },
      { name: "_name", type: "string" },
    ],
    outputs: [{ name: "markeeAddress", type: "address" }],
  },
] as const;

const MAX_MESSAGE_LENGTH = 100;

type Props = {
  onClose: () => void;
  onSuccess: () => void;
  strategyAddress: `0x${string}`;
  currentTopDawg: bigint;
  minimumPrice: bigint;
};

export default function MarkeeModal({
  onClose,
  onSuccess,
  strategyAddress,
  currentTopDawg,
  minimumPrice,
}: Props) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [ethAmount, setEthAmount] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitching } = useSwitchNetwork();
  const { data: balance } = useBalance({ address, chainId: base.id });

  const isOnBase = chain?.id === base.id;

  // wagmi v1 API
  const { writeAsync, isLoading: isPending } = useContractWrite({
    address: strategyAddress,
    abi: TOP_DAWG_PARTNER_ABI,
    functionName: "createMarkee",
  });

  const publicClient = usePublicClient({ chainId: base.id });

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  const minBeat =
    currentTopDawg > BigInt(0) ? currentTopDawg + BigInt(1) : minimumPrice;
  const minBeatEth = parseFloat(formatEther(minBeat > BigInt(0) ? minBeat : BigInt(0)));

  const validate = () => {
    if (!message.trim()) {
      setInputError("Message cannot be empty.");
      return false;
    }
    if (!ethAmount || isNaN(parseFloat(ethAmount)) || parseFloat(ethAmount) <= 0) {
      setInputError("Enter a valid ETH amount.");
      return false;
    }
    let parsedAmount: bigint;
    try {
      parsedAmount = parseEther(ethAmount);
    } catch {
      setInputError("Invalid ETH amount.");
      return false;
    }
    if (minBeat > BigInt(0) && parsedAmount < minBeat) {
      setInputError(
        `You need at least ${minBeatEth.toFixed(6)} ETH to become top dawg.`,
      );
      return false;
    }
    if (balance && parsedAmount > balance.value) {
      setInputError("Insufficient ETH balance.");
      return false;
    }
    setInputError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !writeAsync) return;
    if (!publicClient) {
      setInputError("Unable to connect to Base. Please refresh and try again.");
      return;
    }
    setIsConfirming(true);
    try {
      const { hash } = await writeAsync({
        args: [message.trim(), name.trim()],
        value: parseEther(ethAmount),
        chainId: base.id,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      onSuccess();
    } catch (err: any) {
      setIsConfirming(false);
      const msg = err?.message ?? "";
      if (!msg.includes("User rejected") && !msg.includes("user rejected")) {
        setInputError("Transaction failed. Please try again.");
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const isLoading = isPending || isConfirming || isSwitching;

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClick={handleBackdropClick}
      onClose={onClose}
    >
      <div className="modal-box bg-neutral border border-border-neutral max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-neutral-content">
              Edit the Gardens Sign
            </h3>
            <p className="text-sm text-neutral-content/60 mt-0.5">
              Powered by{" "}
              <a
                href="https://markee.xyz"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-primary-content transition-colors"
              >
                Markee
              </a>
              {" "}· 62% to Gardens treasury
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Wrong network banner */}
        {!isOnBase && (
          <div className="mb-5 rounded border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-yellow-400">
              Switch to Base to pay for the sign.
            </p>
            <button
              onClick={() => switchNetwork?.(base.id)}
              className="btn btn-xs ml-3 bg-yellow-500 text-black border-0 hover:opacity-80"
              disabled={isSwitching}
            >
              {isSwitching ? "Switching..." : "Switch to Base"}
            </button>
          </div>
        )}

        {/* Current top dawg info */}
        {currentTopDawg > BigInt(0) && (
          <div className="mb-5 rounded border border-border-neutral bg-neutral-soft px-4 py-3 text-sm text-neutral-content/70">
            Current top dawg paid{" "}
            <span className="font-mono font-semibold text-neutral-content">
              {parseFloat(formatEther(currentTopDawg)).toFixed(4)} ETH
            </span>
            . Pay more to take the sign.
          </div>
        )}

        {/* Message input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-content mb-1.5">
            Message{" "}
            <span className="text-neutral-content/50 font-normal">
              ({message.length}/{MAX_MESSAGE_LENGTH})
            </span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full bg-neutral border-border-neutral text-neutral-content placeholder:text-neutral-content/30 resize-none font-mono text-sm"
            placeholder="this is a sign."
            value={message}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={3}
            onChange={(e) => {
              setMessage(e.target.value);
              setInputError(null);
            }}
          />
        </div>

        {/* Name input (optional) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-content mb-1.5">
            Your name{" "}
            <span className="text-neutral-content/50 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full bg-neutral border-border-neutral text-neutral-content placeholder:text-neutral-content/30 text-sm"
            placeholder="anonymous"
            value={name}
            maxLength={50}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* ETH amount */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-neutral-content mb-1.5">
            ETH amount
            {balance && (
              <span className="text-neutral-content/50 font-normal ml-2">
                (balance: {parseFloat(formatEther(balance.value)).toFixed(4)} ETH)
              </span>
            )}
          </label>
          <input
            type="number"
            className="input input-bordered w-full bg-neutral border-border-neutral text-neutral-content placeholder:text-neutral-content/30 font-mono text-sm"
            placeholder={minBeatEth > 0 ? minBeatEth.toFixed(6) : "0.001"}
            value={ethAmount}
            min="0"
            step="0.0001"
            onChange={(e) => {
              setEthAmount(e.target.value);
              setInputError(null);
            }}
          />
          {minBeat > BigInt(0) && (
            <p className="mt-1 text-xs text-neutral-content/50">
              Minimum to win:{" "}
              <span className="font-mono">{minBeatEth.toFixed(6)} ETH</span>
            </p>
          )}
        </div>

        {/* Error */}
        {inputError && (
          <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {inputError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            disabled={isLoading}
          >
            Cancel
          </button>
          {isOnBase ? (
            <button
              onClick={handleSubmit}
              className="btn btn-sm bg-primary text-primary-content hover:opacity-80 border-0"
              disabled={isLoading || !message.trim() || !ethAmount}
            >
              {isPending ?
                "Confirm in wallet..."
              : isConfirming ?
                "Confirming..."
              : "Pay & set message"}
            </button>
          ) : (
            <button
              onClick={() => switchNetwork?.(base.id)}
              className="btn btn-sm bg-yellow-500 text-black border-0 hover:opacity-80"
              disabled={isSwitching}
            >
              {isSwitching ? "Switching..." : "Switch to Base"}
            </button>
          )}
        </div>

        {/* Chain info */}
        <p className="mt-4 text-center text-xs text-neutral-content/40">
          Transaction on Base · You&apos;ll receive MARKEE tokens
        </p>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
