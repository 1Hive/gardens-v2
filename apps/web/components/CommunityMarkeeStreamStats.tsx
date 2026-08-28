"use client";

import { useEffect, useState } from "react";
import { getWalletClient } from "@wagmi/core";
import {
  Address,
  formatEther,
  getAddress,
  isAddress,
  parseAbi,
  zeroAddress,
} from "viem";
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
  claimableMarkeeWei: bigint | null;
  feeBps: number;
  mintsMarkee: boolean;
  pendingWei: bigint;
  ratePerSecond: bigint;
  settledMarkeeBalance: bigint;
};

type StreamTotalsSnapshot = {
  gross: bigint;
  net: bigint;
  refunded: bigint;
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
const MARKEE_TOKEN_BY_CHAIN_ID: Record<number, Address> = {
  8453: "0xF6627cF19317C33B457f77452876e6e297c4942F",
};
const REVNET_NATIVE_TOKEN =
  "0x000000000000000000000000000000000000EEEe" as Address;
const markeeTokenBalanceABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
]);
const revNetTerminalPayABI = parseAbi([
  "function pay(uint256 projectId, address token, uint256 amount, address beneficiary, uint256 minReturnedTokens, string memo, bytes metadata) payable returns (uint256 beneficiaryTokenCount)",
]);

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
  const [refundPoolAddress, setRefundPoolAddress] = useState<Address | null>(
    null,
  );
  const [refundedTotals, setRefundedTotals] =
    useState<StreamTotalsSnapshot | null>(null);
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
  const {
    currentFlowRateBn: currentRefundRateBn,
    liveTotalStreamedBn: liveTotalRefundedBn,
  } = useSuperfluidStream({
    chainId,
    containerId: `markee-refund-${leaderboardAddress}-${markeeAddress}`,
    includeReceiverStreams: false,
    poolAddress: refundPoolAddress ?? undefined,
    receiver: isOpen && refundPoolAddress != null ? connectedAccount : "",
    superToken: isOpen ? ethxAddress : "",
  });

  useEffect(() => {
    if (!isOpen || publicClient == null) {
      setSettlement(null);
      setRefundPoolAddress(null);
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
          revNetTerminal,
          revNetProjectId,
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

        let ratePerSecond = 0n;
        if (!cancelled) {
          if (isAddress(poolResult) && poolResult !== zeroAddress) {
            setRefundPoolAddress(getAddress(poolResult));
          } else {
            setRefundPoolAddress(null);
          }
        }
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

        let claimableMarkeeWei: bigint | null = null;
        let settledMarkeeBalance = 0n;
        const markeeTokenAddress = MARKEE_TOKEN_BY_CHAIN_ID[chainId];
        if (mintsMarkee && markeeTokenAddress != null) {
          settledMarkeeBalance = await publicClient.readContract({
            abi: markeeTokenBalanceABI,
            address: markeeTokenAddress,
            args: [connectedAccount],
            functionName: "balanceOf",
          });

          const feeAmount = (pendingWei * BigInt(Number(feeBps))) / 10_000n;
          const buyerAmount = pendingWei - feeAmount;
          if (
            buyerAmount > 0n &&
            isAddress(revNetTerminal) &&
            revNetTerminal !== zeroAddress
          ) {
            try {
              const quote = await publicClient.simulateContract({
                abi: revNetTerminalPayABI,
                account: connectedAccount,
                address: getAddress(revNetTerminal),
                args: [
                  revNetProjectId,
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
              claimableMarkeeWei = quote.result;
            } catch (error) {
              logOnce(
                "warn",
                "[CommunityMarkee] Unable to quote claimable MARKEE from the RevNet terminal",
                error,
              );
            }
          } else if (buyerAmount === 0n) {
            claimableMarkeeWei = 0n;
          }
        }

        if (!cancelled) {
          setSettlement({
            claimableMarkeeWei,
            feeBps: Number(feeBps),
            mintsMarkee,
            pendingWei,
            ratePerSecond,
            settledMarkeeBalance,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setSettlement(null);
          setRefundPoolAddress(null);
        }
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
  const hasActiveStream = effectiveRatePerSecond > 0n;
  const currentEthxBalance = liveEthxBalance?.value ?? ethxBalance;
  const balanceEth = Number(formatEther(currentEthxBalance));
  const netRatePerSecond =
    isWinning && effectiveRatePerSecond > (currentRefundRateBn ?? 0n) ?
      effectiveRatePerSecond - (currentRefundRateBn ?? 0n)
    : 0n;
  const netRateEth = Number(formatEther(netRatePerSecond));
  const totalOutgoingRate =
    effectiveRatePerSecond + (currentUserOtherFlowRateBn ?? 0n);
  const totalOutgoingRateEth = Number(formatEther(totalOutgoingRate));
  const netTotalStreamedBn =
    liveTotalStreamedBn == null ? null
    : liveTotalStreamedBn > (liveTotalRefundedBn ?? 0n) ?
      liveTotalStreamedBn - (liveTotalRefundedBn ?? 0n)
    : 0n;
  useEffect(() => {
    setRefundedTotals(null);
  }, [isWinning, markeeAddress]);

  useEffect(() => {
    if (
      !isWinning &&
      refundedTotals == null &&
      liveTotalStreamedBn != null &&
      liveTotalRefundedBn != null
    ) {
      setRefundedTotals({
        gross: liveTotalStreamedBn,
        net: netTotalStreamedBn ?? 0n,
        refunded: liveTotalRefundedBn,
      });
    }
  }, [
    isWinning,
    liveTotalRefundedBn,
    liveTotalStreamedBn,
    netTotalStreamedBn,
    refundedTotals,
  ]);
  const displayedTotalStreamedBn =
    isWinning ? netTotalStreamedBn : refundedTotals?.net;
  const totalStreamedEth =
    displayedTotalStreamedBn == null ? null : (
      Number(formatEther(displayedTotalStreamedBn))
    );
  const displayedGrossStreamedBn =
    isWinning ? liveTotalStreamedBn : refundedTotals?.gross;
  const displayedRefundedBn =
    isWinning ? liveTotalRefundedBn : refundedTotals?.refunded;
  const totalStreamedTooltip =
    (
      displayedGrossStreamedBn == null ||
      displayedRefundedBn == null ||
      displayedTotalStreamedBn == null
    ) ?
      undefined
    : `Gross streamed: ${Number(formatEther(displayedGrossStreamedBn)).toFixed(10)} ETH · Refunded: ${Number(formatEther(displayedRefundedBn)).toFixed(10)} ETH · Net streamed: ${Number(formatEther(displayedTotalStreamedBn)).toFixed(10)} ETH`;
  const runwayDays =
    hasActiveStream && totalOutgoingRate > 0n ?
      Number(currentEthxBalance / totalOutgoingRate) / 86_400
    : null;
  const pendingEth =
    settlement == null ? null : Number(formatEther(settlement.pendingWei));
  const pendingRateEth =
    settlement == null ? 0 : Number(formatEther(settlement.ratePerSecond));
  const estimatedClaimableMarkee =
    pendingEth == null || settlement == null ?
      null
    : estimateMarkeeTokens(pendingEth, settlement.feeBps);
  const quotedClaimableMarkee =
    settlement?.claimableMarkeeWei == null ?
      null
    : Number(formatEther(settlement.claimableMarkeeWei));
  const claimableValue =
    pendingEth == null ? null
    : settlement?.mintsMarkee ?
      quotedClaimableMarkee ?? estimatedClaimableMarkee
    : pendingEth;
  const earnedRate =
    (
      settlement?.mintsMarkee &&
      settlement.claimableMarkeeWei != null &&
      settlement.pendingWei > 0n
    ) ?
      Number(
        formatEther(
          (settlement.claimableMarkeeWei * settlement.ratePerSecond) /
            settlement.pendingWei,
        ),
      )
    : settlement?.mintsMarkee ?
      estimateMarkeeTokens(pendingRateEth, settlement.feeBps)
    : pendingRateEth;
  const claimedMarkee =
    settlement?.mintsMarkee ?
      Number(formatEther(settlement.settledMarkeeBalance))
    : 0;
  const totalMarkeeEarned = (claimableValue ?? 0) + claimedMarkee;
  const earningsTooltip =
    settlement?.mintsMarkee ?
      `Claimable: ${(claimableValue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 7 })} MARKEE · In wallet: ${claimedMarkee.toLocaleString(undefined, { maximumFractionDigits: 7 })} MARKEE · Total: ${totalMarkeeEarned.toLocaleString(undefined, { maximumFractionDigits: 7 })} MARKEE`
    : undefined;

  return (
    <div className="mt-4 border-t border-neutral-content/15 pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-xs">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${
            !hasActiveStream ? "bg-danger-content"
            : isWinning ?
              "bg-primary-content shadow-[0_0_8px_rgb(var(--color-primary-content))]"
            : "bg-warning-content"
          }`}
        />
        <span
          className={
            !hasActiveStream ? "text-danger-content"
            : isWinning ?
              "text-primary-content"
            : "text-warning-content"
          }
        >
          {!hasActiveStream ?
            "Stopped"
          : isWinning ?
            "Active"
          : "Refunded"}
        </span>
        {hasActiveStream && isWinning && (
          <span
            role="img"
            aria-label="First place"
            className="text-base leading-none"
          >
            🥇
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Stat label="Total streamed">
          <span
            className={
              totalStreamedTooltip == null ? "" : (
                "tooltip tooltip-top cursor-help"
              )
            }
            data-tip={totalStreamedTooltip}
          >
            <LiveFlowingAmount
              value={totalStreamedEth}
              ratePerSecond={netRateEth}
              suffix="ETH"
              fractionDigits={10}
            />
          </span>
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
            className={
              runwayDays != null && runwayDays < 7 ?
                "text-danger-content"
              : "text-neutral-content"
            }
          />
        </Stat>
        <div className="flex min-w-0 flex-col">
          <p className="min-h-6 text-[10px] uppercase leading-3 tracking-wider text-neutral-soft-content">
            {settlement?.mintsMarkee === false ?
              "Claimable ETH"
            : "Claimable MARKEE"}
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs font-semibold leading-tight text-primary-content">
            <span
              className={
                earningsTooltip == null ? "" : "tooltip tooltip-top cursor-help"
              }
              data-tip={earningsTooltip}
            >
              <LiveFlowingAmount
                value={claimableValue}
                ratePerSecond={earnedRate}
                fractionDigits={7}
              />
            </span>
            <button
              type="button"
              className="shrink-0 px-1 text-[10px] font-medium text-primary-content transition-colors enabled:hover:text-primary-hover-content disabled:cursor-not-allowed disabled:opacity-40"
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
    </div>
  );
}
