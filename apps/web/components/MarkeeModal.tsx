"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ClipboardDocumentIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
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

type LeaderboardEntry = {
  message: string;
  name: string;
  totalFundsAdded: string;
};

type Props = {
  onClose: () => void;
  onSuccess: () => void;
  strategyAddress: `0x${string}`;
  currentTopDawg: bigint;
  currentMessage: string;
  minimumPrice: bigint;
  subgraphUrl: string;
};

export default function MarkeeModal({
  onClose,
  onSuccess,
  strategyAddress,
  currentTopDawg,
  currentMessage,
  minimumPrice,
  subgraphUrl,
}: Props) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [ethAmount, setEthAmount] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitching } = useSwitchNetwork();
  const { data: balance } = useBalance({ address, chainId: base.id });

  const isOnBase = chain?.id === base.id;

  const { writeAsync, isLoading: isPending } = useContractWrite({
    address: strategyAddress,
    abi: TOP_DAWG_PARTNER_ABI,
    functionName: "createMarkee",
  });

  const publicClient = usePublicClient({ chainId: base.id });

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Fetch leaderboard when expanded
  useEffect(() => {
    if (!leaderboardOpen || leaderboard.length > 0) return;
    setLeaderboardLoading(true);
    fetch(subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          topDawgPartnerStrategy(id: "${strategyAddress.toLowerCase()}") {
            markees(first: 10, orderBy: totalFundsAdded, orderDirection: desc) {
              message
              name
              totalFundsAdded
            }
          }
        }`,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        const entries = res.data?.topDawgPartnerStrategy?.markees ?? [];
        setLeaderboard(entries);
      })
      .catch((err) => console.error("[MarkeeModal] leaderboard fetch error:", err))
      .finally(() => setLeaderboardLoading(false));
  }, [leaderboardOpen, leaderboard.length, subgraphUrl, strategyAddress]);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
        <div className="flex items-center justify-between mb-5">
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

        {/* Current message display */}
        <div className="mb-5 rounded border border-neutral-content/20 bg-neutral-focus px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-neutral-content/50 mb-1">Current message</p>
              <p className="font-mono text-sm text-neutral-content break-words">
                {currentMessage}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="btn btn-ghost btn-xs btn-circle flex-shrink-0 mt-0.5"
              aria-label="Copy current message"
              title="Copy to clipboard"
            >
              {copied ? (
                <CheckIcon className="h-4 w-4 text-success" />
              ) : (
                <ClipboardDocumentIcon className="h-4 w-4 text-neutral-content/50" />
              )}
            </button>
          </div>

          {/* Expandable leaderboard */}
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
              {leaderboardLoading ? (
                <p className="text-xs text-neutral-content/40 font-mono">loading...</p>
              ) : leaderboard.length === 0 ? (
                <p className="text-xs text-neutral-content/40">No entries yet.</p>
              ) : (
                leaderboard.map((entry, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
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
                      {parseFloat(formatEther(BigInt(entry.totalFundsAdded))).toFixed(4)} ETH
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
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

        {/* Message input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-content mb-1.5">
            Your message{" "}
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
