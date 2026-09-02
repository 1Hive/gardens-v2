"use client";

import { useCallback, useEffect, useState } from "react";
import { BanknotesIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { getWalletClient } from "@wagmi/core";
import {
  Address,
  formatEther,
  getAddress,
  isAddress,
  parseAbi,
  zeroAddress,
} from "viem";
import { useAccount, useNetwork, usePublicClient } from "wagmi";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { useAppSwitchNetwork } from "@/hooks/useAppSwitchNetwork";
import { reportClientError } from "@/utils/clientErrorReporter";
import { logOnce } from "@/utils/log";
import {
  getMarkeeCashOutQuote,
  markeeTokenABI,
  MarkeeCashOutQuote,
  prepareMarkeeCashOut,
  REVNET_NATIVE_TOKEN,
  revnetTerminalCashOutABI,
  revnetTokensABI,
} from "@/utils/markeeCashOut";
import { streamingLeaderboardRuntimeABI } from "@/utils/markeeStreaming";
import { isUserRejectedTransactionError } from "@/utils/transactionMessages";

type Props = {
  chainId: number;
  leaderboardAddress: Address;
};

type ClaimSnapshot = {
  pendingMarkee: bigint;
  pendingSettlement: bigint;
  projectId: bigint;
  quote: MarkeeCashOutQuote | null;
  terminal: Address;
  tokenAddress: Address;
  tokenBalance: bigint;
};

const revnetTerminalPayABI = parseAbi([
  "function pay(uint256 projectId, address token, uint256 amount, address beneficiary, uint256 minReturnedTokens, string memo, bytes metadata) payable returns (uint256 beneficiaryTokenCount)",
]);

function formatAmount(value: bigint, maximumFractionDigits = 6) {
  return Number(formatEther(value)).toLocaleString(undefined, {
    maximumFractionDigits,
  });
}

export function CommunityMarkeeClaimCard({
  chainId,
  leaderboardAddress,
}: Props) {
  const { address: connectedAccount } = useAccount();
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useAppSwitchNetwork();
  const publicClient = usePublicClient({ chainId });
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<ClaimSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoverableMarkee, setRecoverableMarkee] = useState(0n);

  const recoveryKey =
    connectedAccount == null ? null : (
      `markee-claim:${chainId}:${leaderboardAddress.toLowerCase()}:${connectedAccount.toLowerCase()}`
    );

  useEffect(() => {
    if (recoveryKey == null) {
      setRecoverableMarkee(0n);
      return;
    }
    const stored = window.sessionStorage.getItem(recoveryKey);
    try {
      setRecoverableMarkee(stored == null ? 0n : BigInt(stored));
    } catch {
      window.sessionStorage.removeItem(recoveryKey);
      setRecoverableMarkee(0n);
    }
  }, [recoveryKey]);

  const load = useCallback(async () => {
    if (connectedAccount == null || publicClient == null) {
      setSnapshot(null);
      return null;
    }
    setIsLoading(true);
    try {
      const [
        pendingSettlement,
        feeBps,
        revnetEnabled,
        terminalResult,
        projectId,
      ] = await Promise.all([
        publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          args: [connectedAccount],
          functionName: "pendingSettlement",
        }),
        publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          functionName: "percentToPlatformFeeReceiver",
        }),
        publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          functionName: "revNetEnabled",
        }),
        publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          functionName: "revNetTerminal",
        }),
        publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          functionName: "revNetProjectId",
        }),
      ]);
      if (
        !revnetEnabled ||
        !isAddress(terminalResult) ||
        terminalResult === zeroAddress
      ) {
        setSnapshot(null);
        return null;
      }
      const terminal = getAddress(terminalResult);
      const tokensAddress = await publicClient.readContract({
        abi: revnetTerminalCashOutABI,
        address: terminal,
        functionName: "TOKENS",
      });
      const tokenResult = await publicClient.readContract({
        abi: revnetTokensABI,
        address: getAddress(tokensAddress),
        args: [projectId],
        functionName: "tokenOf",
      });
      if (!isAddress(tokenResult) || tokenResult === zeroAddress) {
        setSnapshot(null);
        return null;
      }
      const tokenAddress = getAddress(tokenResult);
      const tokenBalance = await publicClient.readContract({
        abi: markeeTokenABI,
        address: tokenAddress,
        args: [connectedAccount],
        functionName: "balanceOf",
      });
      const feeAmount = (pendingSettlement * feeBps) / 10_000n;
      const buyerAmount = pendingSettlement - feeAmount;
      let pendingMarkee = 0n;
      if (buyerAmount > 0n) {
        try {
          const simulation = await publicClient.simulateContract({
            abi: revnetTerminalPayABI,
            account: connectedAccount,
            address: terminal,
            args: [
              projectId,
              REVNET_NATIVE_TOKEN,
              buyerAmount,
              connectedAccount,
              0n,
              "",
              "0x",
            ],
            functionName: "pay",
            value: buyerAmount,
          });
          pendingMarkee = simulation.result;
        } catch (error) {
          logOnce(
            "warn",
            "[CommunityMarkee] Unable to quote pending MARKEE",
            error,
          );
        }
      }
      const totalMarkee =
        recoverableMarkee > 0n ? recoverableMarkee : pendingMarkee;
      const quote =
        totalMarkee > 0n ?
          await getMarkeeCashOutQuote({
            chainId,
            client: publicClient,
            holder: connectedAccount,
            projectId,
            terminal,
            tokenCount: totalMarkee,
          })
        : null;
      const next = {
        pendingMarkee,
        pendingSettlement,
        projectId,
        quote,
        terminal,
        tokenAddress,
        tokenBalance,
      };
      setSnapshot(next);
      setErrorMessage(null);
      return next;
    } catch (error) {
      logOnce(
        "warn",
        "[CommunityMarkee] Unable to load the MARKEE claim quote",
        error,
      );
      setSnapshot(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [
    chainId,
    connectedAccount,
    leaderboardAddress,
    publicClient,
    recoverableMarkee,
  ]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const handleClaim = async () => {
    if (
      connectedAccount == null ||
      publicClient == null ||
      snapshot == null ||
      isSubmitting
    ) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (chain?.id !== chainId) await switchNetworkAsync?.(chainId);
      const walletClient = await getWalletClient({ chainId });
      if (walletClient == null)
        throw new Error("Connect your wallet to claim.");

      let claimedTokenCount = recoverableMarkee;
      if (claimedTokenCount <= 0n) {
        if (snapshot.pendingSettlement <= 0n) {
          throw new Error("There is no MARKEE available to claim.");
        }
        const settleHash = await walletClient.writeContract({
          abi: streamingLeaderboardRuntimeABI,
          account: connectedAccount,
          address: leaderboardAddress,
          args: [[connectedAccount]],
          functionName: "settle",
        });
        const settleReceipt = await publicClient.waitForTransactionReceipt({
          hash: settleHash,
        });
        if (settleReceipt.status !== "success") {
          throw new Error("Your MARKEE earnings could not be settled.");
        }

        const tokenBalance = await publicClient.readContract({
          abi: markeeTokenABI,
          address: snapshot.tokenAddress,
          args: [connectedAccount],
          functionName: "balanceOf",
        });
        claimedTokenCount =
          tokenBalance > snapshot.tokenBalance ?
            tokenBalance - snapshot.tokenBalance
          : 0n;
        if (claimedTokenCount > 0n && recoveryKey != null) {
          window.sessionStorage.setItem(
            recoveryKey,
            claimedTokenCount.toString(),
          );
          setRecoverableMarkee(claimedTokenCount);
        }
      }
      if (claimedTokenCount <= 0n) {
        throw new Error("No new MARKEE was received from settlement.");
      }
      const quote = await prepareMarkeeCashOut({
        chainId,
        client: publicClient,
        holder: connectedAccount,
        projectId: snapshot.projectId,
        terminal: snapshot.terminal,
        tokenCount: claimedTokenCount,
      });
      const cashOutHash = await walletClient.writeContract({
        abi: revnetTerminalCashOutABI,
        account: connectedAccount,
        address: snapshot.terminal,
        args: [
          connectedAccount,
          snapshot.projectId,
          claimedTokenCount,
          REVNET_NATIVE_TOKEN,
          quote.terminalMinimum,
          connectedAccount,
          quote.metadata,
        ],
        functionName: "cashOutTokensOf",
      });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: cashOutHash,
      });
      if (receipt.status !== "success") {
        throw new Error("Your MARKEE claim transaction reverted.");
      }
      if (recoveryKey != null) window.sessionStorage.removeItem(recoveryKey);
      setRecoverableMarkee(0n);
      setIsSuccess(true);
      await load();
    } catch (cause) {
      if (isUserRejectedTransactionError(cause)) return;
      const error =
        cause instanceof Error ? cause : new Error("Unable to claim MARKEE.");
      setErrorMessage(
        error.message.includes("quote changed") ?
          "The best quote changed. Please try again."
        : "Unable to claim MARKEE right now. Please try again.",
      );
      const context = {
        type: "markee-cash-out-error",
        chainId,
        connectedAccount,
        leaderboardAddress,
        tags: {
          error_type: "markee-cash-out-error",
          chain_id: chainId,
        },
      };
      logOnce("error", "[CommunityMarkee] MARKEE claim failed", cause, context);
      reportClientError(cause, context);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalMarkee =
    recoverableMarkee > 0n ? recoverableMarkee : snapshot?.pendingMarkee ?? 0n;
  if (connectedAccount == null || (!isLoading && totalMarkee <= 0n))
    return null;

  return (
    <>
      <div className="mt-3 rounded-xl border border-neutral-content/15 bg-neutral/30 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-soft-content">
              Claim MARKEE
            </p>
            {isLoading && snapshot == null ?
              <div className="skeleton mt-2 h-6 w-28 rounded-md" />
            : <p className="mt-1 font-mono text-lg font-semibold text-neutral-content">
                {formatAmount(totalMarkee)} MARKEE
              </p>
            }
          </div>
          <Button
            btnStyle="outline"
            color="primary"
            disabled={snapshot == null || totalMarkee <= 0n}
            onClick={() => {
              setIsSuccess(false);
              setIsOpen(true);
            }}
          >
            Claim
          </Button>
        </div>
      </div>

      <Modal
        icon={<BanknotesIcon className="h-7 w-7 text-primary-content" />}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="small"
        testId="markee-token-claim"
        title="Claim MARKEE"
        footer={
          isSuccess ?
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          : <div className="flex w-full justify-end gap-3">
              <Button
                btnStyle="ghost"
                color="secondary"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={snapshot?.quote == null || totalMarkee <= 0n}
                isLoading={isSubmitting}
                onClick={handleClaim}
              >
                Claim to ETH
              </Button>
            </div>
        }
      >
        {isSuccess ?
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircleIcon className="h-14 w-14 text-primary-content" />
            <div>
              <h4 className="text-lg font-semibold text-neutral-content">
                MARKEE claimed
              </h4>
              <p className="mt-2 text-sm text-neutral-soft-content">
                The best available route sent ETH to your wallet.
              </p>
            </div>
          </div>
        : <div className="flex flex-col gap-4">
            {errorMessage != null && (
              <div className="rounded-xl border border-danger-content/30 bg-danger-soft/50 p-4 text-sm text-danger-content">
                {errorMessage}
              </div>
            )}
            <div className="rounded-xl border border-neutral-content/15 bg-neutral/30 p-4">
              <p className="text-xs uppercase tracking-wider text-neutral-soft-content">
                Available
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-neutral-content">
                {formatAmount(totalMarkee)} MARKEE
              </p>
              {recoverableMarkee <= 0n &&
                snapshot != null &&
                snapshot.pendingMarkee > 0n && (
                  <p className="mt-2 text-xs text-neutral-soft-content">
                    Includes {formatAmount(snapshot.pendingMarkee)} MARKEE that
                    will be settled first.
                  </p>
                )}
            </div>
            <div className="rounded-xl border border-neutral-content/15 bg-neutral/30 p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-neutral-soft-content">Best route</span>
                <span className="font-medium text-neutral-content">
                  {snapshot?.quote?.route === "uniswap" ?
                    "Uniswap"
                  : snapshot?.quote != null ?
                    "Revnet"
                  : "Loading…"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 border-t border-neutral-content/15 pt-3">
                <span className="text-neutral-soft-content">You receive</span>
                <span className="font-mono font-semibold text-primary-content">
                  {snapshot?.quote != null ?
                    `${formatAmount(snapshot.quote.expectedReturn)} ETH`
                  : "—"}
                </span>
              </div>
              {snapshot?.quote != null && (
                <p className="mt-3 text-xs text-neutral-soft-content">
                  Includes 1% slippage protection. The route is refreshed before
                  you sign.
                </p>
              )}
            </div>
          </div>
        }
      </Modal>
    </>
  );
}
