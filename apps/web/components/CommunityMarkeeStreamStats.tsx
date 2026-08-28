"use client";

import { useEffect, useState } from "react";
import { getWalletClient } from "@wagmi/core";
import { Address, formatEther, getAddress, isAddress, zeroAddress } from "viem";
import { useBalance, useNetwork, usePublicClient } from "wagmi";
import { LiveFlowingAmount } from "@/components/LiveFlowingAmount";
import { useAppSwitchNetwork } from "@/hooks/useAppSwitchNetwork";
import { ComputedStatus } from "@/hooks/useContractWriteWithConfirmations";
import { useSuperfluidStream } from "@/hooks/useSuperfluidStream";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { reportClientError } from "@/utils/clientErrorReporter";
import { logOnce } from "@/utils/log";
import {
  CFA_V1_FORWARDER_ADDRESS,
  cfaV1ForwarderABI,
  markeeSuperfluidPoolABI,
  streamingLeaderboardRuntimeABI,
} from "@/utils/markeeStreaming";
import { isUserRejectedTransactionError } from "@/utils/transactionMessages";

type SettlementSnapshot = {
  feeBps: number;
  mintsMarkee: boolean;
  pendingWei: bigint;
  ratePerSecond: bigint;
};

type Props = {
  activeRatePerSecond: bigint;
  chainId: number;
  connectedAccount: Address;
  ethxAddress: Address;
  ethxBalance: bigint;
  isOpen: boolean;
  isWinning: boolean;
  leaderboardAddress: Address;
  markeeAddress: Address;
};

const SEASON_MS = 91.31 * 24 * 60 * 60 * 1000;
const SCHEDULE_START_MS = Date.parse("2025-12-21T00:00:00Z");
const REVNET_BUYER_TOKEN_SHARE = 0.62;

function getCurrentGrossMarkeeRate(now = Date.now()) {
  const phaseIndex = Math.min(
    17,
    Math.max(0, Math.floor((now - SCHEDULE_START_MS) / SEASON_MS)),
  );
  const stages = [
    { cut: 0.5, seasons: 4 },
    { cut: 0.2, seasons: 8 },
    { cut: 0.1, seasons: 6 },
  ];
  let rate = 100_000;
  let remaining = phaseIndex;

  for (const stage of stages) {
    const elapsed = Math.min(remaining, stage.seasons);
    rate *= (1 - stage.cut) ** elapsed;
    remaining -= elapsed;
    if (remaining <= 0) break;
  }

  return Math.round(rate);
}

function estimateMarkeeTokens(ethAmount: number, feeBps: number) {
  const netEth = ethAmount * (1 - feeBps / 10_000);
  return netEth * getCurrentGrossMarkeeRate() * REVNET_BUYER_TOKEN_SHARE;
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <p className="min-h-6 text-[10px] uppercase leading-3 tracking-wider text-neutral-soft-content">
        {label}
      </p>
      <div className="mt-1 break-words text-xs font-semibold leading-tight text-neutral-content">
        {children}
      </div>
    </div>
  );
}

export function CommunityMarkeeStreamStats({
  activeRatePerSecond,
  chainId,
  connectedAccount,
  ethxAddress,
  ethxBalance,
  isOpen,
  isWinning,
  leaderboardAddress,
  markeeAddress,
}: Props) {
  const publicClient = usePublicClient({ chainId });
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useAppSwitchNetwork();
  const { data: liveEthxBalance } = useBalance({
    address: connectedAccount,
    chainId,
    enabled: isOpen,
    token: ethxAddress,
    watch: true,
  });
  const [settlement, setSettlement] = useState<SettlementSnapshot | null>(null);
  const [settlementRefreshKey, setSettlementRefreshKey] = useState(0);
  const [settlementTransactionHash, setSettlementTransactionHash] = useState<
    `0x${string}` | undefined
  >();
  const [settlementTransactionError, setSettlementTransactionError] =
    useState<Error | null>(null);
  const [settlementTransactionStatus, setSettlementTransactionStatus] =
    useState<ComputedStatus>(undefined);
  const isSettling =
    settlementTransactionStatus === "waiting" ||
    settlementTransactionStatus === "loading";

  useTransactionNotification({
    chainId,
    contractName: "Claim Markee earnings",
    enabled: settlementTransactionStatus != null,
    fallbackErrorMessage: "Unable to claim your Markee earnings.",
    safeAddress: connectedAccount,
    targetAddress: leaderboardAddress,
    transactionData:
      settlementTransactionHash != null ?
        { hash: settlementTransactionHash }
      : undefined,
    transactionError: settlementTransactionError,
    transactionHash: settlementTransactionHash,
    transactionStatus: settlementTransactionStatus,
    watchTransaction: true,
  });
  const {
    currentUserFlowRateBn,
    currentUserOtherFlowRateBn,
    liveTotalStreamedBn,
  } = useSuperfluidStream({
    chainId,
    containerId: `markee-stream-${leaderboardAddress}`,
    includePoolMembers: false,
    receiver: isOpen ? leaderboardAddress : "",
    sender: connectedAccount,
    superToken: isOpen ? ethxAddress : "",
  });

  useEffect(() => {
    if (!isOpen || publicClient == null) {
      setSettlement(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const [
          pendingWei,
          aggregateRate,
          poolResult,
          beneficiaryResult,
          feeBps,
          mintsMarkee,
          topRate,
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
            args: [markeeAddress],
            functionName: "aggregateRate",
          }),
          publicClient.readContract({
            abi: streamingLeaderboardRuntimeABI,
            address: leaderboardAddress,
            args: [markeeAddress],
            functionName: "poolOf",
          }),
          publicClient.readContract({
            abi: streamingLeaderboardRuntimeABI,
            address: leaderboardAddress,
            functionName: "beneficiaryAddress",
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
            functionName: "topRate",
          }),
        ]);

        let ratePerSecond = 0n;
        if (
          isWinning &&
          aggregateRate > 0n &&
          isAddress(poolResult) &&
          poolResult !== zeroAddress &&
          isAddress(beneficiaryResult)
        ) {
          const [beneficiaryRate, units] = await Promise.all([
            publicClient.readContract({
              abi: cfaV1ForwarderABI,
              address: CFA_V1_FORWARDER_ADDRESS,
              args: [
                ethxAddress,
                leaderboardAddress,
                getAddress(beneficiaryResult),
              ],
              functionName: "getFlowrate",
            }),
            publicClient.readContract({
              abi: markeeSuperfluidPoolABI,
              address: getAddress(poolResult),
              args: [connectedAccount],
              functionName: "getUnits",
            }),
          ]);
          const retainedRate =
            beneficiaryRate >= 0n && topRate > beneficiaryRate ?
              topRate - beneficiaryRate
            : 0n;
          ratePerSecond =
            units > 0n ? (retainedRate * units) / aggregateRate : 0n;
        }

        if (!cancelled) {
          setSettlement({
            feeBps: Number(feeBps),
            mintsMarkee,
            pendingWei,
            ratePerSecond,
          });
        }
      } catch (error) {
        if (!cancelled) setSettlement(null);
        logOnce(
          "warn",
          "[CommunityMarkee] Unable to load live stream earnings",
          error,
        );
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    chainId,
    connectedAccount,
    ethxAddress,
    isOpen,
    isWinning,
    leaderboardAddress,
    markeeAddress,
    publicClient,
    settlementRefreshKey,
  ]);

  const claimEarnings = async () => {
    if (
      publicClient == null ||
      settlement == null ||
      settlement.pendingWei <= 0n ||
      isSettling
    ) {
      return;
    }

    setSettlementTransactionError(null);
    setSettlementTransactionHash(undefined);
    try {
      setSettlementTransactionStatus("waiting");
      if (chain?.id !== chainId) await switchNetworkAsync?.(chainId);
      const walletClient = await getWalletClient({ chainId });
      if (walletClient == null) {
        throw new Error("Connect your wallet to claim your earnings.");
      }

      const hash = await walletClient.writeContract({
        abi: streamingLeaderboardRuntimeABI,
        account: connectedAccount,
        address: leaderboardAddress,
        args: [[connectedAccount]],
        functionName: "settle",
      });
      setSettlementTransactionHash(hash);
      setSettlementTransactionStatus("loading");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("The earnings claim transaction reverted.");
      }

      setSettlementTransactionStatus("success");
      setSettlementRefreshKey((current) => current + 1);
    } catch (cause) {
      if (isUserRejectedTransactionError(cause)) {
        setSettlementTransactionStatus(undefined);
        return;
      }
      const error =
        cause instanceof Error ? cause : new Error("The claim failed.");
      setSettlementTransactionError(error);
      setSettlementTransactionStatus("error");
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
      logOnce(
        "error",
        "[CommunityMarkee] Markee settlement failed",
        cause,
        context,
      );
      reportClientError(cause, context);
    }
  };

  const effectiveRatePerSecond =
    activeRatePerSecond > 0n ? activeRatePerSecond : (
      currentUserFlowRateBn ?? 0n
    );
  const currentEthxBalance = liveEthxBalance?.value ?? ethxBalance;
  const balanceEth = Number(formatEther(currentEthxBalance));
  const activeRateEth = Number(formatEther(effectiveRatePerSecond));
  const totalOutgoingRate =
    effectiveRatePerSecond + (currentUserOtherFlowRateBn ?? 0n);
  const totalOutgoingRateEth = Number(formatEther(totalOutgoingRate));
  const totalStreamedEth =
    liveTotalStreamedBn == null ? null : (
      Number(formatEther(liveTotalStreamedBn))
    );
  const runwayDays =
    totalOutgoingRate > 0n ?
      Number(currentEthxBalance / totalOutgoingRate) / 86_400
    : null;
  const pendingEth =
    settlement == null ? null : Number(formatEther(settlement.pendingWei));
  const pendingRateEth =
    settlement == null ? 0 : Number(formatEther(settlement.ratePerSecond));
  const earnedValue =
    pendingEth == null ? null
    : settlement?.mintsMarkee ?
      estimateMarkeeTokens(pendingEth, settlement.feeBps)
    : pendingEth;
  const earnedRate =
    settlement?.mintsMarkee ?
      estimateMarkeeTokens(pendingRateEth, settlement.feeBps)
    : pendingRateEth;

  if (effectiveRatePerSecond <= 0n) return null;

  return (
    <div className="mt-4 border-t border-neutral-content/15 pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-xs">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${isWinning ? "bg-primary-content shadow-[0_0_8px_rgb(var(--color-primary-content))]" : "bg-warning-content"}`}
        />
        <span
          className={
            isWinning ? "text-primary-content" : "text-warning-content"
          }
        >
          {isWinning ? "Active" : "Refunded"}
        </span>
        {isWinning && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-warning-content px-1 text-[10px] text-warning-content">
            1
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat label="Total streamed">
          <LiveFlowingAmount
            value={totalStreamedEth}
            ratePerSecond={activeRateEth}
            suffix="ETH"
            fractionDigits={10}
          />
        </Stat>
        <Stat label="ETHx balance">
          <LiveFlowingAmount
            value={balanceEth}
            ratePerSecond={-totalOutgoingRateEth}
            suffix="ETHx"
            fractionDigits={5}
          />
        </Stat>
        <Stat label="Funds remaining">
          <LiveFlowingAmount
            value={runwayDays}
            ratePerSecond={runwayDays == null ? 0 : -1 / 86_400}
            suffix="days"
            fractionDigits={1}
          />
        </Stat>
        <div className="flex min-w-0 flex-col">
          <p className="min-h-6 text-[10px] uppercase leading-3 tracking-wider text-neutral-soft-content">
            {settlement?.mintsMarkee === false ? "ETH earned" : "MARKEE earned"}
          </p>
          <div className="mt-1 break-words text-xs font-semibold leading-tight text-primary-content">
            <LiveFlowingAmount
              value={earnedValue}
              ratePerSecond={earnedRate}
              fractionDigits={7}
            />
          </div>
          <button
            type="button"
            className="mt-2 w-fit rounded-md border border-primary-content/50 px-2 py-1 text-[10px] font-medium text-primary-content transition-colors enabled:hover:bg-primary-content/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              settlement == null || settlement.pendingWei <= 0n || isSettling
            }
            onClick={claimEarnings}
            title={
              settlement != null && settlement.pendingWei <= 0n ?
                "No earnings available to claim yet."
              : "Claim your accumulated Markee earnings"
            }
          >
            {isSettling ? "Claiming…" : "Claim"}
          </button>
        </div>
      </div>
    </div>
  );
}
