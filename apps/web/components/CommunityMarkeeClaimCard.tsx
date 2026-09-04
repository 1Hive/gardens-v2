"use client";

import { useCallback, useEffect, useState } from "react";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { getWalletClient } from "@wagmi/core";
import {
  Address,
  decodeEventLog,
  formatEther,
  getAddress,
  isAddress,
  parseAbi,
  zeroAddress,
} from "viem";
import { useAccount, useNetwork, usePublicClient } from "wagmi";
import { Button } from "@/components/Button";
import { InfoBox } from "@/components/InfoBox";
import { Modal } from "@/components/Modal";
import { useAppSwitchNetwork } from "@/hooks/useAppSwitchNetwork";
import type { ComputedStatus } from "@/hooks/useContractWriteWithConfirmations";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { reportClientError } from "@/utils/clientErrorReporter";
import { logOnce } from "@/utils/log";
import { streamingLeaderboardRuntimeABI } from "@/utils/markeeStreaming";
import { isUserRejectedTransactionError } from "@/utils/transactionMessages";

type Props = {
  chainId: number;
  leaderboardAddress: Address;
};

type ClaimSnapshot = {
  buybackHookAddress: Address | null;
  expectedRoute: MarkeeSettlementRoute | null;
  pendingMarkee: bigint;
  pendingSettlement: bigint;
  projectId: bigint;
};

type MarkeeSettlementRoute = "revnet-mint" | "uniswap-buyback";

const REVNET_NATIVE_TOKEN =
  "0x000000000000000000000000000000000000EEEe" as Address;
const revnetTerminalABI = parseAbi([
  "function pay(uint256 projectId, address token, uint256 amount, address beneficiary, uint256 minReturnedTokens, string memo, bytes metadata) payable returns (uint256 beneficiaryTokenCount)",
  "function previewPayFor(uint256 projectId, address token, uint256 amount, address beneficiary, bytes metadata) view returns ((uint48 cycleNumber, uint48 id, uint48 basedOnId, uint48 start, uint32 duration, uint112 weight, uint32 weightCutPercent, address approvalHook, uint256 metadata) ruleset, uint256 beneficiaryTokenCount, uint256 reservedTokenCount, (address hook, bool noop, uint256 amount, bytes metadata)[] hookSpecifications)",
]);
const buybackHookEventsABI = parseAbi([
  "event Mint(uint256 indexed projectId, uint256 leftoverAmount, uint256 tokenCount, address caller)",
  "event Swap(uint256 indexed projectId, uint256 amountToSwapWith, bytes32 indexed poolId, uint256 amountReceived, address caller)",
]);

const formatSettlementRoute = (route: MarkeeSettlementRoute) =>
  route === "uniswap-buyback" ? "Uniswap buyback" : "Revnet mint";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actualRoute, setActualRoute] = useState<MarkeeSettlementRoute | null>(
    null,
  );
  const [transactionHash, setTransactionHash] = useState<
    `0x${string}` | undefined
  >();
  const [transactionError, setTransactionError] = useState<Error | null>(null);
  const [transactionStatus, setTransactionStatus] =
    useState<ComputedStatus>(undefined);

  useTransactionNotification({
    chainId,
    contractName:
      actualRoute == null ? "Claim MARKEE" : (
        `Claim MARKEE via ${formatSettlementRoute(actualRoute)}`
      ),
    enabled: transactionStatus != null,
    fallbackErrorMessage: "Unable to claim MARKEE.",
    safeAddress: connectedAccount,
    targetAddress: leaderboardAddress,
    transactionData:
      transactionHash == null ? undefined : { hash: transactionHash },
    transactionError,
    transactionHash,
    transactionStatus,
    watchTransaction: true,
  });

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
      const feeAmount = (pendingSettlement * feeBps) / 10_000n;
      const buyerAmount = pendingSettlement - feeAmount;
      let pendingMarkee = 0n;
      let expectedRoute: MarkeeSettlementRoute | null = null;
      let buybackHookAddress: Address | null = null;
      if (buyerAmount > 0n) {
        try {
          const simulation = await publicClient.simulateContract({
            abi: revnetTerminalABI,
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
        try {
          const [, , , hookSpecifications] = await publicClient.readContract({
            abi: revnetTerminalABI,
            account: connectedAccount,
            address: terminal,
            args: [
              projectId,
              REVNET_NATIVE_TOKEN,
              buyerAmount,
              connectedAccount,
              "0x",
            ],
            functionName: "previewPayFor",
          });
          const swapSpecification = hookSpecifications.find(
            ({ amount, noop }) => !noop && amount > 0n,
          );
          const noopSpecification = hookSpecifications.find(({ noop }) => noop);
          const hookResult = swapSpecification?.hook ?? noopSpecification?.hook;
          buybackHookAddress =
            hookResult != null && isAddress(hookResult) ?
              getAddress(hookResult)
            : null;
          expectedRoute =
            swapSpecification == null ? "revnet-mint" : "uniswap-buyback";
        } catch (error) {
          logOnce(
            "warn",
            "[CommunityMarkee] Unable to preview the Revnet settlement route",
            error,
          );
        }
      }
      const next = {
        buybackHookAddress,
        expectedRoute,
        pendingMarkee,
        pendingSettlement,
        projectId,
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
  }, [chainId, connectedAccount, leaderboardAddress, publicClient]);

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
    setActualRoute(null);
    setTransactionError(null);
    setTransactionHash(undefined);
    setTransactionStatus(undefined);
    let settleHash: `0x${string}` | undefined;
    try {
      if (chain?.id !== chainId) await switchNetworkAsync?.(chainId);
      const walletClient = await getWalletClient({ chainId });
      if (walletClient == null)
        throw new Error("Connect your wallet to claim.");

      if (snapshot.pendingSettlement <= 0n) {
        throw new Error("There is no MARKEE available to claim.");
      }
      settleHash = await walletClient.writeContract({
        abi: streamingLeaderboardRuntimeABI,
        account: connectedAccount,
        address: leaderboardAddress,
        args: [[connectedAccount]],
        functionName: "settle",
      });
      setTransactionHash(settleHash);
      setTransactionStatus("loading");
      setIsOpen(false);
      const settleReceipt = await publicClient.waitForTransactionReceipt({
        hash: settleHash,
      });
      if (settleReceipt.status !== "success") {
        throw new Error("Your MARKEE earnings could not be settled.");
      }

      const usedUniswap = settleReceipt.logs.some((log) => {
        if (
          snapshot.buybackHookAddress != null &&
          log.address.toLowerCase() !==
            snapshot.buybackHookAddress.toLowerCase()
        ) {
          return false;
        }
        try {
          const event = decodeEventLog({
            abi: buybackHookEventsABI,
            data: log.data,
            topics: log.topics,
          });
          return (
            event.eventName === "Swap" &&
            event.args.projectId === snapshot.projectId
          );
        } catch {
          return false;
        }
      });
      setActualRoute(usedUniswap ? "uniswap-buyback" : "revnet-mint");
      setTransactionStatus("success");
      await load();
    } catch (cause) {
      if (isUserRejectedTransactionError(cause)) {
        setTransactionStatus(undefined);
        return;
      }
      const error =
        cause instanceof Error ? cause : new Error("Unable to claim MARKEE.");
      if (settleHash == null) {
        setErrorMessage("Unable to claim MARKEE right now. Please try again.");
      } else {
        setTransactionError(error);
        setTransactionStatus("error");
      }
      const context = {
        type: "markee-settlement-error",
        chainId,
        connectedAccount,
        leaderboardAddress,
        tags: {
          error_type: "markee-settlement-error",
          chain_id: chainId,
        },
      };
      logOnce("error", "[CommunityMarkee] MARKEE claim failed", error, context);
      reportClientError(error, context);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalMarkee = snapshot?.pendingMarkee ?? 0n;
  if (connectedAccount == null || (!isOpen && !isLoading && totalMarkee <= 0n))
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
              setErrorMessage(null);
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
        title="🪧 Claim MARKEE"
        footer={
          <div className="flex w-full justify-end gap-3">
            <Button
              btnStyle="ghost"
              color="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                snapshot == null ||
                snapshot.pendingSettlement <= 0n ||
                totalMarkee <= 0n
              }
              isLoading={isSubmitting}
              onClick={handleClaim}
            >
              Claim
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {errorMessage != null && (
            <InfoBox infoBoxType="error" content={errorMessage} />
          )}
          <div className="rounded-xl border border-neutral-content/15 bg-neutral/30 p-4">
            <p className="text-xs uppercase tracking-wider text-neutral-soft-content">
              Available
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-neutral-content">
              {formatAmount(totalMarkee)} MARKEE
            </p>
            {snapshot != null && snapshot.pendingSettlement > 0n && (
              <p className="mt-2 text-xs text-neutral-soft-content">
                Estimated from {formatAmount(snapshot.pendingSettlement)} ETH
                accumulated by your stream.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-neutral-content/15 bg-neutral/30 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-neutral-soft-content">Expected route</span>
              <span className="font-medium text-neutral-content">
                {snapshot?.expectedRoute != null ?
                  formatSettlementRoute(snapshot.expectedRoute)
                : "Unavailable"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-neutral-content/15 pt-3">
              <span className="text-neutral-soft-content">MARKEE received</span>
              <span className="font-mono font-semibold text-primary-content">
                {formatAmount(totalMarkee)} MARKEE
              </span>
            </div>
            <p className="mt-3 text-xs text-neutral-soft-content">
              The Revnet buyback hook currently expects this route. Market
              conditions may change before execution; the confirmed route is
              read from the settlement receipt.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
