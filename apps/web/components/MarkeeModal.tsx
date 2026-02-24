"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
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
] as const;

// Confirmed from Basescan readContract
const DEFAULT_MAX_MESSAGE = 223;
const DEFAULT_MAX_NAME = 22;

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
  takeTopSpot: bigint;
  subgraphUrl: string;
};

export default function MarkeeModal({
  onClose,
  onSuccess,
  strategyAddress,
  currentTopDawg,
  currentMessage,
  minimumPrice,
  takeTopSpot,
  subgraphUrl,
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitching } = useSwitchNetwork();
  const { data: balance } = useBalance({ address, chainId: base.id });
  const { openConnectModal } = useConnectModal();

  const isOnBase = chain?.id === base.id;
  const isConnected = !!address;

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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  // Passed in from MarkeeSign (computed correctly there)
  const takeTopSpotEth = parseFloat(formatEther(takeTopSpot)).toFixed(3);
  const minToJoinEth = parseFloat(formatEther(minimumPrice)).toFixed(3);

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
    if (!ethAmount || isNaN(parseFloat(ethAmount)) || parseFloat(ethAmount) <= 0) {
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
        setInputError(`Minimum is ${minToJoinEth} ETH to join the leaderboard.`);
        valid = false;
      } else if (balance && parsedAmount > balance.value) {
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
    if (!writeAsync || !publicClient) {
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
  // Grey out buy button if connected but on wrong network
  const buyDisabled = isLoading || (isConnected && !isOnBase);

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

        {/* Current message + leaderboard */}
        <div className="mb-5 rounded border border-neutral-content/20 bg-neutral-focus px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-content/50 mb-1">Current message</p>
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
              {leaderboardLoading ? (
                <p className="text-xs text-neutral-content/40 font-mono">loading...</p>
              ) : leaderboard.length === 0 ? (
                <p className="text-xs text-neutral-content/40">No entries yet.</p>
              ) : (
                <>
                  {leaderboard.map((entry, i) => (
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
                  ))}
                  <div className="flex justify-between pt-2 border-t border-neutral-content/10">
                    <span className="text-xs text-neutral-content/50 font-medium">Total raised</span>
                    <span className="text-xs font-mono font-semibold text-neutral-content/70">
                      {parseFloat(formatEther(totalRaised)).toFixed(3)} ETH
                    </span>
                  </div>
                </>
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

        {/* Your Message */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-content mb-1.5">
            Your Message{" "}
            <span className="text-xs text-neutral-content/40 font-normal">
              ({message.length}/{DEFAULT_MAX_MESSAGE})
            </span>
          </label>
          <textarea
            className={`textarea textarea-bordered w-full bg-neutral text-neutral-content placeholder:text-neutral-content/30 resize-none font-mono text-sm transition-colors ${
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
            {isOnBase && balance && (
              <span className="text-xs text-neutral-content/40 font-normal ml-2">
                (balance: {parseFloat(formatEther(balance.value)).toFixed(3)} ETH)
              </span>
            )}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Take top spot — gold border highlight */}
            <button
              type="button"
              onClick={() => { setEthAmount(takeTopSpotEth); setEthError(false); setInputError(null); }}
              className={`flex flex-col items-center justify-center rounded bg-neutral-focus hover:bg-neutral-focus/80 transition-colors px-2 py-2.5 text-center cursor-pointer ${
                ethAmount === takeTopSpotEth
                  ? "border-2 border-yellow-400"
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

            {/* Min to join */}
            <button
              type="button"
              onClick={() => { setEthAmount(minToJoinEth); setEthError(false); setInputError(null); }}
              className={`flex flex-col items-center justify-center rounded border bg-neutral-focus hover:border-neutral-content/40 hover:bg-neutral-focus/80 transition-colors px-2 py-2.5 text-center cursor-pointer ${
                ethAmount === minToJoinEth && ethAmount !== takeTopSpotEth
                  ? "border-neutral-content/60"
                  : "border-neutral-content/20"
              }`}
            >
              <span className="text-xs font-mono font-semibold text-neutral-content">
                {minToJoinEth} ETH
              </span>
              <span className="text-xs text-neutral-content/50 mt-0.5 leading-tight">
                Min to join
              </span>
            </button>

            {/* Custom entry */}
            <input
              type="number"
              className={`input input-bordered w-full bg-neutral text-neutral-content placeholder:text-neutral-content/30 font-mono text-sm text-center transition-colors ${
                ethError ? "border-red-500" : "border-border-neutral"
              }`}
              placeholder={takeTopSpotEth}
              value={ethAmount}
              min="0"
              step="0.001"
              onChange={(e) => {
                setEthAmount(e.target.value);
                setEthError(false);
                setInputError(null);
              }}
            />
          </div>
          {ethError && (
            <p className="mt-1 text-xs text-red-400">{inputError}</p>
          )}
        </div>

        {/* Wrong network banner — below ETH selection */}
        {isConnected && !isOnBase && (
          <div className="mb-4 rounded border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-center justify-between">
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

        {/* General error */}
        {inputError && !messageError && !ethError && (
          <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {inputError}
          </div>
        )}

        {/* Action — centered */}
        <div className="flex justify-center mt-5">
          {!isConnected ? (
            <button
              onClick={() => {
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
              disabled={buyDisabled}
              className={`btn btn-sm border-0 px-8 text-white transition-colors ${
                buyDisabled
                  ? "bg-neutral-content/30 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-500"
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
          You&apos;ll receive MARKEE tokens and become a Markee Network owner
        </p>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
