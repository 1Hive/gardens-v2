"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ClipboardDocumentIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { formatEther, parseEther } from "viem";
import { base } from "viem/chains";
import {
  useAccount,
  useBalance,
  useContractRead,
  useContractWrite,
  useNetwork,
  usePublicClient,
  useSwitchNetwork,
} from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

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
  {
    name: "maxMessageLength",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "maxNameLength",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const DEFAULT_MAX_MESSAGE = 100;
const DEFAULT_MAX_NAME = 50;
const MIN_INCREMENT = parseEther("0.001");

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
  const { openConnectModal } = useConnectModal();

  const isOnBase = chain?.id === base.id;
  const isConnected = !!address;

  const { data: maxMessageLength } = useContractRead({
    address: strategyAddress,
    abi: TOP_DAWG_PARTNER_ABI,
    functionName: "maxMessageLength",
    chainId: base.id,
  });
  const { data: maxNameLength } = useContractRead({
    address: strategyAddress,
    abi: TOP_DAWG_PARTNER_ABI,
    functionName: "maxNameLength",
    chainId: base.id,
  });

  const maxMsg = maxMessageLength ? Number(maxMessageLength) : DEFAULT_MAX_MESSAGE;
  const maxName = maxNameLength ? Number(maxNameLength) : DEFAULT_MAX_NAME;

  const { writeAsync, isLoading: isPending } = useContractWrite({
    address: strategyAddress,
    abi: TOP_DAWG_PARTNER_ABI,
    functionName: "createMarkee",
  });

  const publicClient = usePublicClient({ chainId: base.id });

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

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

  // Take top spot = currentTopDawg + 0.001 ETH (or minimumPrice if no top dawg)
  const takeTopSpot =
    currentTopDawg > BigInt(0)
      ? currentTopDawg + MIN_INCREMENT
      : minimumPrice > BigInt(0)
        ? minimumPrice
        : MIN_INCREMENT;

  // Minimum to join = minimumPrice (or 0.001 if not set)
  const minToJoin = minimumPrice > BigInt(0) ? minimumPrice : MIN_INCREMENT;

  const takeTopSpotEth = parseFloat(formatEther(takeTopSpot)).toFixed(3);
  const minToJoinEth = parseFloat(formatEther(minToJoin)).toFixed(3);

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
    if (parsedAmount < minToJoin) {
      setInputError(`Minimum is ${minToJoinEth} ETH to join the leaderboard.`);
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
  const canSubmit = isConnected && isOnBase && !!message.trim() && !!ethAmount && !isLoading;

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
              Change the Markee Message
            </h3>
            <p className="text-xs text-neutral-content/60 mt-0.5">
              62% to Gardens Treasury · 38% to{" "}
              <a
                href="https://markee.xyz"
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

        {/* Current message + leaderboard */}
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
                      {parseFloat(formatEther(BigInt(entry.totalFundsAdded))).toFixed(3)} ETH
                    </span>
                  </div>
                ))
              )}
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

        {/* Wrong network banner */}
        {isConnected && !isOnBase && (
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

        {/* Your Message */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-content mb-1.5">
            Your Message{" "}
            <span className="text-xs text-neutral-content/40 font-normal">
              ({message.length}/{maxMsg})
            </span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full bg-neutral border-border-neutral text-neutral-content placeholder:text-neutral-content/30 resize-none font-mono text-sm"
            placeholder="this is a sign."
            value={message}
            maxLength={maxMsg}
            rows={3}
            onChange={(e) => {
              setMessage(e.target.value);
              setInputError(null);
            }}
          />
        </div>

        {/* Your Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-content mb-1.5">
            Your Name{" "}
            <span className="text-xs text-neutral-content/40 font-normal">
              (optional · {name.length}/{maxName})
            </span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full bg-neutral border-border-neutral text-neutral-content placeholder:text-neutral-content/30 text-sm"
            placeholder="anonymous"
            value={name}
            maxLength={maxName}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* ETH Amount — 3 columns */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-neutral-content mb-2">
            ETH Amount
            {balance && (
              <span className="text-xs text-neutral-content/40 font-normal ml-2">
                (balance: {parseFloat(formatEther(balance.value)).toFixed(3)} ETH)
              </span>
            )}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Take top spot */}
            <button
              type="button"
              onClick={() => { setEthAmount(takeTopSpotEth); setInputError(null); }}
              className="flex flex-col items-center justify-center rounded border border-neutral-content/20 bg-neutral-focus hover:border-primary-content/40 hover:bg-neutral-focus/80 transition-colors px-2 py-2.5 text-center cursor-pointer"
            >
              <span className="text-xs font-mono font-semibold text-neutral-content">
                {takeTopSpotEth} ETH
              </span>
              <span className="text-xs text-neutral-content/50 mt-0.5 leading-tight">
                Take top spot
              </span>
            </button>

            {/* Min to join */}
            <button
              type="button"
              onClick={() => { setEthAmount(minToJoinEth); setInputError(null); }}
              className="flex flex-col items-center justify-center rounded border border-neutral-content/20 bg-neutral-focus hover:border-primary-content/40 hover:bg-neutral-focus/80 transition-colors px-2 py-2.5 text-center cursor-pointer"
            >
              <span className="text-xs font-mono font-semibold text-neutral-content">
                {minToJoinEth} ETH
              </span>
              <span className="text-xs text-neutral-content/50 mt-0.5 leading-tight">
                Min to join
              </span>
            </button>

            {/* Manual entry */}
            <div className="relative">
              <input
                type="number"
                className="input input-bordered w-full h-full bg-neutral border-border-neutral text-neutral-content placeholder:text-neutral-content/30 font-mono text-sm text-center"
                placeholder="custom"
                value={ethAmount}
                min="0"
                step="0.001"
                onChange={(e) => {
                  setEthAmount(e.target.value);
                  setInputError(null);
                }}
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {inputError && (
          <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {inputError}
          </div>
        )}

        {/* Action — centered */}
        <div className="flex justify-center">
          {!isConnected ? (
            <button
              onClick={() => {
                // Close dialog first so RainbowKit modal isn't behind it
                dialogRef.current?.close();
                openConnectModal?.();
              }}
              className="btn btn-sm bg-primary text-primary-content hover:opacity-80 border-0 px-8"
            >
              Connect Wallet
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`btn btn-sm border-0 px-8 text-white transition-colors ${
                canSubmit
                  ? "bg-green-600 hover:bg-green-500"
                  : "bg-neutral-content/20 cursor-not-allowed"
              }`}
            >
              {isPending ?
                "Confirm in wallet..."
              : isConfirming ?
                "Confirming..."
              : "Buy Message"}
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-neutral-content/40">
          You&apos;ll receive MARKEE tokens for this purchase
        </p>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
