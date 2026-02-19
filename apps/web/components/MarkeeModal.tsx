"use client";

import React, { useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { formatEther, parseEther } from "viem";
import { base } from "viem/chains";
import { useContractWrite, usePublicClient } from "wagmi";

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
  const [isSuccess, setIsSuccess] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // wagmi v1 API
  const { writeAsync, isLoading: isPending } = useContractWrite({
    address: strategyAddress,
    abi: TOP_DAWG_PARTNER_ABI,
    functionName: "createMarkee",
    chainId: base.id,
  });

  const publicClient = usePublicClient({ chainId: base.id });

  // Open dialog on mount
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  const minBeat =
    currentTopDawg > BigInt(0) ? currentTopDawg + BigInt(1) : minimumPrice;
  const minBeatEth = parseFloat(formatEther(minBeat));

  const validate = () => {
    if (!message.trim()) {
      setInputError("Message cannot be empty.");
      return false;
    }
    if (!ethAmount || isNaN(parseFloat(ethAmount)) || parseFloat(ethAmount) <= 0) {
      setInputError("Enter a valid ETH amount.");
      return false;
    }
    if (minBeat > BigInt(0) && parseEther(ethAmount) < minBeat) {
      setInputError(
        `You need at least ${minBeatEth.toFixed(4)} ETH to become top dawg.`,
      );
      return false;
    }
    setInputError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !writeAsync) return;
    try {
      const { hash } = await writeAsync({
        args: [message.trim(), name.trim()],
        value: parseEther(ethAmount),
      });

      if (hash && publicClient) {
        setIsConfirming(true);
        await publicClient.waitForTransactionReceipt({ hash });
        setIsConfirming(false);
        setIsSuccess(true);
        onSuccess();
      }
    } catch (err: any) {
      setIsConfirming(false);
      if (!err?.message?.includes("User rejected")) {
        setInputError("Transaction failed. Please try again.");
      }
    }
  };

  const isLoading = isPending || isConfirming;

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
          </label>
          <input
            type="number"
            className="input input-bordered w-full bg-neutral border-border-neutral text-neutral-content placeholder:text-neutral-content/30 font-mono text-sm"
            placeholder={minBeatEth > 0 ? minBeatEth.toFixed(4) : "0.001"}
            value={ethAmount}
            min="0"
            step="0.001"
            onChange={(e) => {
              setEthAmount(e.target.value);
              setInputError(null);
            }}
          />
          {minBeat > BigInt(0) && (
            <p className="mt-1 text-xs text-neutral-content/50">
              Minimum to win:{" "}
              <span className="font-mono">{minBeatEth.toFixed(4)} ETH</span>
            </p>
          )}
        </div>

        {/* Error */}
        {inputError && (
          <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {inputError}
          </div>
        )}

        {/* Success state */}
        {isSuccess && (
          <div className="mb-4 rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
            🎉 Your message is live on the Gardens sign!
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
