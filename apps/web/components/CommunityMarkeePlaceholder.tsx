"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowTrendingUpIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { getNetwork, getWalletClient } from "@wagmi/core";
import { toast } from "react-toastify";
import {
  decodeEventLog,
  formatEther,
  getAddress,
  isAddress,
  parseEther,
  zeroAddress,
} from "viem";
import {
  Address,
  useAccount,
  useBalance,
  useNetwork,
  usePublicClient,
  useSwitchNetwork,
  useWalletClient,
} from "wagmi";
import { Button } from "@/components/Button";
import { CommunityMarkeeDepositManagerModal } from "@/components/CommunityMarkeeDepositManagerModal";
import { CommunityMarkeePaymentReview } from "@/components/CommunityMarkeePaymentReview";
import { CommunityMarkeeStreamStats } from "@/components/CommunityMarkeeStreamStats";
import { CommunityStreamingMarkeeModal } from "@/components/CommunityStreamingMarkeeModal";
import { InfoBox } from "@/components/InfoBox";
import { InfoWrapper } from "@/components/InfoWrapper";
import { Modal } from "@/components/Modal";
import {
  TransactionModal,
  TransactionProps,
} from "@/components/TransactionModal";
import { chainConfigMap, getExplorerUrl } from "@/configs/chains";
import { ComputedStatus } from "@/hooks/useContractWriteWithConfirmations";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import {
  CommunityMarkeeResponse,
  fetchMarkeeJson,
  MarkeeClaimBridgeStatusResponse,
  MarkeeClaimQuoteResponse,
} from "@/services/markee";
import { reportClientError } from "@/utils/clientErrorReporter";
import { formatAddress } from "@/utils/formatAddress";
import { logOnce } from "@/utils/log";
import { recordMarkeeView } from "@/utils/markee";
import {
  buildMarkeeOpenStreamOperations,
  CFA_AGREEMENT_ID,
  CFA_V1_FORWARDER_ADDRESS,
  cfaV1ForwarderABI,
  ethxApproveABI,
  formatMarkeeEthxBalance,
  formatMarkeeRunwayShort,
  GDA_AGREEMENT_ID,
  getMarkeeAutoFunding,
  getMarkeeEthxAddress,
  getMarkeeRequiredNativeBalance,
  getMarkeeStreamAmounts,
  getMarkeeStreamFunding,
  getMarkeeWithdrawableDeposit,
  MARKEE_SECONDS_IN_MONTH,
  roundUpMarkeeMonthlyMinimum,
  markeeOwnerABI,
  streamingLeaderboardRuntimeABI,
  superfluidHostABI,
  waitForMarkeeRegistration,
} from "@/utils/markeeStreaming";
import {
  Eip712TypedData,
  signTypedDataWithProvider,
} from "@/utils/signTypedDataWithProvider";
import { isUserRejectedTransactionError } from "@/utils/transactionMessages";

type Props = {
  canOptIn: boolean;
  chainId?: number;
  community: Address;
  councilSafe?: Address;
};

type AuthorizationStatus =
  | "idle"
  | "requesting"
  | "signing"
  | "verifying"
  | "authorized";

const CLAIM_QUOTE_CHANGED_MESSAGE =
  "The claim quote changed. Refreshing the latest quote…";

type ChallengeResponse = {
  nonce: string;
  typedData: Eip712TypedData;
};

type VerifyResponse = {
  authorized: boolean;
  bridgeName?: string | null;
  bridged?: boolean;
  estimatedRouteDurationSeconds?: number;
  markeeChainId?: number;
  router?: Address;
  transactionHash?: `0x${string}`;
  transactionUrl?: string;
};

type PendingMarkeeClaim = {
  bridgeName: string;
  createdAt: number;
  estimatedRouteDurationSeconds: number | null;
  fromChainId: number;
  toChainId: number;
  transactionHash: `0x${string}`;
  transactionUrl: string | null;
  version: 1;
};

const getPendingMarkeeClaimStorageKey = (chainId: number, community: Address) =>
  `gardens:markee:pending-claim:${chainId}:${community.toLowerCase()}`;

const clearPendingMarkeeClaim = (chainId: number, community: Address) => {
  try {
    window.localStorage.removeItem(
      getPendingMarkeeClaimStorageKey(chainId, community),
    );
  } catch (error) {
    logOnce(
      "warn",
      "[CommunityMarkee] Unable to clear the pending claim locally",
      error,
    );
  }
};

const readPendingMarkeeClaim = (
  chainId: number | undefined,
  community: Address,
): PendingMarkeeClaim | null => {
  if (chainId == null || typeof window === "undefined") return null;

  const storageKey = getPendingMarkeeClaimStorageKey(chainId, community);
  try {
    const value = JSON.parse(
      window.localStorage.getItem(storageKey) ?? "null",
    ) as Partial<PendingMarkeeClaim> | null;
    if (
      value?.version !== 1 ||
      value.bridgeName !== "Squid" ||
      typeof value.createdAt !== "number" ||
      typeof value.fromChainId !== "number" ||
      typeof value.toChainId !== "number" ||
      value.toChainId !== chainId ||
      typeof value.transactionHash !== "string" ||
      !/^0x[0-9a-fA-F]{64}$/u.test(value.transactionHash)
    ) {
      clearPendingMarkeeClaim(chainId, community);
      return null;
    }

    return {
      bridgeName: value.bridgeName,
      createdAt: value.createdAt,
      estimatedRouteDurationSeconds:
        typeof value.estimatedRouteDurationSeconds === "number" ?
          value.estimatedRouteDurationSeconds
        : null,
      fromChainId: value.fromChainId,
      toChainId: value.toChainId,
      transactionHash: value.transactionHash as `0x${string}`,
      transactionUrl:
        typeof value.transactionUrl === "string" ? value.transactionUrl : null,
      version: 1,
    };
  } catch {
    clearPendingMarkeeClaim(chainId, community);
    return null;
  }
};

const writePendingMarkeeClaim = (
  chainId: number,
  community: Address,
  claim: PendingMarkeeClaim,
) => {
  try {
    window.localStorage.setItem(
      getPendingMarkeeClaimStorageKey(chainId, community),
      JSON.stringify(claim),
    );
    return true;
  } catch (error) {
    logOnce(
      "warn",
      "[CommunityMarkee] Unable to save the pending claim locally",
      error,
    );
    return false;
  }
};

const formatBridgeDuration = (seconds: number) => {
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} sec`;
  if (seconds < 3_600) return `~${Math.ceil(seconds / 60)} min`;
  return `~${Math.ceil(seconds / 3_600)} hr`;
};

type MarkeeTransactionNotification = {
  contractName: string;
  error?: Error;
  status: ComputedStatus;
  targetAddress?: Address;
  toastId: string;
  transactionHash?: `0x${string}`;
};

async function postAuthorization<T>(body: Record<string, unknown>) {
  const response = await fetch("/api/markee/authorize", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const result = (await response.json()) as T & { error?: unknown };

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string" ?
        result.error
      : "Unable to authorize Markee integration.",
    );
  }

  return result;
}

async function postClaimAuthorization<T>(body: Record<string, unknown>) {
  const response = await fetch("/api/markee/claim/authorize", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const result = (await response.json()) as T & { error?: unknown };

  if (!response.ok) {
    throw new Error(
      typeof result.error === "string" ?
        result.error
      : "Unable to authorize the community revenue claim.",
    );
  }

  return result;
}

function PlaceholderSign({
  hint,
  isEmpty,
  isPlaceholder,
  message,
  totalViews,
}: {
  hint: string;
  isEmpty: boolean;
  isPlaceholder: boolean;
  message: string;
  totalViews: number | null;
}) {
  return (
    <div className="group relative w-full pb-3">
      <div
        className={`relative rounded-xl bg-neutral/50 px-6 py-8 transition-all duration-200 group-hover:border-primary-content/50 ${isEmpty ? "opacity-50 group-hover:opacity-70" : "opacity-100"} ${isPlaceholder ? "border-2 border-dashed border-neutral-content/30" : "border border-neutral-content/15"}`}
      >
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[40%] text-lg leading-none"
        >
          🪧
        </span>
        {totalViews !== null && (
          <span className="absolute right-3 top-2 flex items-center gap-1 font-mono text-xs text-neutral-content/40 transition-colors duration-200 group-hover:text-primary-content/50">
            <EyeIcon className="h-3 w-3" />
            {totalViews.toLocaleString()}
          </span>
        )}
        <p className="w-full text-center font-mono text-lg leading-snug text-neutral-content transition-colors duration-200 group-hover:text-primary-content">
          {message}
        </p>
      </div>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-primary-content/40 bg-neutral px-3 py-0.5 font-mono text-xs text-primary-content/70 opacity-100 transition-all duration-200 sm:opacity-0 sm:group-hover:opacity-100">
        {hint}
      </span>
    </div>
  );
}

function sanitizeAmount(value: string) {
  const cleaned = value.replace(/[^0-9.]/gu, "");
  const decimalIndex = cleaned.indexOf(".");
  return decimalIndex === -1 ? cleaned : (
      `${cleaned.slice(0, decimalIndex + 1)}${cleaned.slice(decimalIndex + 1).replaceAll(".", "")}`
    );
}

function getTransactionError(error: unknown, fallback: string) {
  return new Error(getTransactionErrorMessage(error, fallback));
}

function getTransactionErrorMessage(error: unknown, fallback: string) {
  let cause: unknown = error;
  let isContractRevert = false;
  for (let depth = 0; depth < 6 && cause != null; depth += 1) {
    const contractError = cause as {
      cause?: unknown;
      data?: { errorName?: unknown };
      message?: unknown;
      name?: unknown;
      shortMessage?: unknown;
      signature?: unknown;
    };
    if (
      contractError.signature === "0x6663ccf3" ||
      contractError.data?.errorName === "UnknownMarkee"
    ) {
      return "Your Markee is still being confirmed. Please try again in a moment.";
    }
    if (
      contractError.signature === "0x2f4cb941" ||
      contractError.data?.errorName === "SF_TOKEN_MOVE_INSUFFICIENT_BALANCE"
    ) {
      return "Your ETHx balance is too low to start this stream. Reduce the amount or add funds and try again.";
    }
    const contractErrorMessage = [
      contractError.message,
      contractError.shortMessage,
    ]
      .filter((value): value is string => typeof value === "string")
      .join(" ");
    if (
      contractError.name === "ContractFunctionExecutionError" ||
      /(?:contract function|execution) .*revert|reverted with/iu.test(
        contractErrorMessage,
      )
    ) {
      isContractRevert = true;
    }
    cause = contractError.cause;
  }

  if (isContractRevert) return fallback;

  const shortMessage = (error as { shortMessage?: unknown })?.shortMessage;
  return (
    typeof shortMessage === "string" ? shortMessage
    : error instanceof Error ? error.message
    : fallback
  );
}

function formatEthAmount(value: string | bigint) {
  const amount = BigInt(value);
  const formatted = formatEther(BigInt(value));
  const [whole, fraction = ""] = formatted.split(".");
  const visibleFraction = fraction
    .slice(0, 6)
    .replace(/0+$/u, "")
    .padEnd(2, "0");

  if (amount > 0n && whole === "0" && visibleFraction === "00") {
    return "<0.000001";
  }

  return `${whole}.${visibleFraction}`;
}

function formatEthAmountRounded(value: string | bigint, decimals: number) {
  const amount = BigInt(value);
  const divisor = 10n ** BigInt(18 - decimals);
  const roundedAmount = (amount + divisor / 2n) / divisor;
  const decimalScale = 10n ** BigInt(decimals);
  const whole = roundedAmount / decimalScale;
  const fraction = (roundedAmount % decimalScale)
    .toString()
    .padStart(decimals, "0");

  return `${whole}.${fraction}`;
}

function formatEthInput(value: bigint) {
  const [whole, fraction = ""] = formatEther(value).split(".");
  const visibleFraction = fraction.slice(0, 12).replace(/0+$/u, "");
  return visibleFraction.length > 0 ? `${whole}.${visibleFraction}` : whole;
}

function formatEthAmountRoundedUp(value: bigint, decimals: number) {
  const divisor = 10n ** BigInt(18 - decimals);
  const roundedUpAmount = (value + divisor - 1n) / divisor;
  const decimalScale = 10n ** BigInt(decimals);
  const whole = roundedUpAmount / decimalScale;
  const fraction = (roundedUpAmount % decimalScale)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/u, "");

  return fraction.length > 0 ? `${whole}.${fraction}` : whole.toString();
}

function formatEthFundingInput(value: bigint) {
  const twelveDecimalWeiStep = 10n ** 6n;
  const roundedUpValue =
    value > 0n ?
      ((value + twelveDecimalWeiStep - 1n) / twelveDecimalWeiStep) *
      twelveDecimalWeiStep
    : 0n;

  return formatEthInput(roundedUpValue);
}

function CommunityMarkeePreviewModal({
  canIntegrate,
  isOpen,
  message,
  markeeChainId,
  leaderboardAddress,
  maxMessageLength,
  maxNameLength,
  minimumMonthlyRateWei,
  onClose,
  onIntegrate,
  onMessageUpdated,
  onStreamUpdated,
  topMarkeeAddress,
  topMarkeeName,
  topMarkeeOwner,
  topRatePerSecondWei,
}: {
  canIntegrate: boolean;
  isOpen: boolean;
  leaderboardAddress?: Address;
  markeeChainId?: number;
  maxMessageLength?: string;
  maxNameLength?: string;
  message: string;
  minimumMonthlyRateWei?: string;
  onClose: () => void;
  onIntegrate: () => void;
  onMessageUpdated: (message: string) => void;
  onStreamUpdated: () => void;
  topMarkeeAddress?: Address;
  topMarkeeName?: string;
  topMarkeeOwner?: Address;
  topRatePerSecondWei?: string;
}) {
  const minimumMonthlyRateAmount = BigInt(
    minimumMonthlyRateWei ?? "10000000000000000",
  );
  const effectiveMinimumMonthlyRateAmount = roundUpMarkeeMonthlyMinimum(
    minimumMonthlyRateAmount,
  );
  const effectiveMinimumMonthlyRate = formatEthFundingInput(
    effectiveMinimumMonthlyRateAmount,
  );
  const effectiveMinimumMonthlyRateInputAmount = parseEther(
    effectiveMinimumMonthlyRate,
  );
  const topMonthlyRateAmount =
    BigInt(topRatePerSecondWei ?? "0") * MARKEE_SECONDS_IN_MONTH;
  const hasTopStream = topMonthlyRateAmount > 0n;
  const challengeMonthlyRateAmount =
    hasTopStream ?
      [
        topMonthlyRateAmount + parseEther("0.01"),
        effectiveMinimumMonthlyRateAmount,
      ].reduce((highest, amount) => (amount > highest ? amount : highest))
    : effectiveMinimumMonthlyRateAmount;
  const challengeMonthlyRate = formatEthFundingInput(
    challengeMonthlyRateAmount,
  );
  const [monthlyRate, setMonthlyRate] = useState(challengeMonthlyRate);
  const [isMonthlyRateFocused, setIsMonthlyRateFocused] = useState(false);
  const [isDepositManagerOpen, setIsDepositManagerOpen] = useState(false);
  const [isReviewingPayment, setIsReviewingPayment] = useState(false);
  const [streamPositionRefreshKey, setStreamPositionRefreshKey] = useState(0);
  const [streamValidationError, setStreamValidationError] = useState<
    string | null
  >(null);
  const [newMarkeeMessage, setNewMarkeeMessage] = useState("");
  const [newMarkeeName, setNewMarkeeName] = useState("");
  const [connectedMarkeeAddress, setConnectedMarkeeAddress] =
    useState<Address | null>(null);
  const [connectedMarkeeMessage, setConnectedMarkeeMessage] = useState<
    string | null
  >(null);
  const [connectedMarkeeName, setConnectedMarkeeName] = useState<string | null>(
    null,
  );
  const [isConnectedMarkeeLoading, setIsConnectedMarkeeLoading] =
    useState(false);
  const [isPreviewComplete, setIsPreviewComplete] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStoppingStream, setIsStoppingStream] = useState(false);
  const [isWithdrawingStreamDeposit, setIsWithdrawingStreamDeposit] =
    useState(false);
  const [activeStreamMarkee, setActiveStreamMarkee] = useState<Address | null>(
    null,
  );
  const [activeStreamRate, setActiveStreamRate] = useState(0n);
  const [ethxWalletBalance, setEthxWalletBalance] = useState(0n);
  const [ethxWalletDeficit, setEthxWalletDeficit] = useState(0n);
  const [ethxAddress, setEthxAddress] = useState<Address | null>(null);
  const [existingStreamDeposit, setExistingStreamDeposit] = useState(0n);
  const [isStreamPositionLoading, setIsStreamPositionLoading] = useState(false);
  const [estimatedStreamGasCost, setEstimatedStreamGasCost] = useState<
    bigint | null
  >(null);
  const [isStreamGasEstimateLoading, setIsStreamGasEstimateLoading] =
    useState(false);
  const [transactionNotification, setTransactionNotification] =
    useState<MarkeeTransactionNotification | null>(null);
  const transactionNotificationAttempt = useRef(0);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [showCreateTransaction, setShowCreateTransaction] = useState(false);
  const [showMessageTransaction, setShowMessageTransaction] = useState(false);
  const [showNameTransaction, setShowNameTransaction] = useState(false);
  const [createTransaction, setCreateTransaction] = useState<TransactionProps>({
    contractName: "Create Markee",
    message: "Create your message on this leaderboard.",
    status: "idle",
  });
  const [messageTransaction, setMessageTransaction] =
    useState<TransactionProps>({
      contractName: "Update Markee message",
      message: "Save your message on this leaderboard.",
      status: "idle",
    });
  const [nameTransaction, setNameTransaction] = useState<TransactionProps>({
    contractName: "Update Markee name",
    message: "Save your name on this leaderboard.",
    status: "idle",
  });
  const [streamTransaction, setStreamTransaction] = useState<TransactionProps>({
    contractName: "Start stream",
    message: "Fund and open the stream to this Markee.",
    status: "idle",
  });
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [editedMessage, setEditedMessage] = useState(message);
  const [editedName, setEditedName] = useState(topMarkeeName ?? "");
  const { address: connectedAccount } = useAccount();
  const { chain: connectedChain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const publicClient = usePublicClient({ chainId: markeeChainId });
  const { data: walletClient } = useWalletClient({ chainId: markeeChainId });
  useTransactionNotification({
    chainId: markeeChainId,
    contractName: transactionNotification?.contractName,
    enabled: transactionNotification != null && !isTransactionModalOpen,
    fallbackErrorMessage: "The Markee transaction failed.",
    safeAddress: connectedAccount,
    targetAddress: transactionNotification?.targetAddress,
    toastId: transactionNotification?.toastId,
    transactionData:
      transactionNotification?.transactionHash != null ?
        { hash: transactionNotification.transactionHash }
      : undefined,
    transactionError: transactionNotification?.error,
    transactionHash: transactionNotification?.transactionHash,
    transactionStatus: transactionNotification?.status,
    watchTransaction: true,
  });
  const isLive = leaderboardAddress != null && markeeChainId != null;
  const resolvedEthxAddress =
    ethxAddress ?? getMarkeeEthxAddress(markeeChainId) ?? null;
  const isTopMarkeeOwner =
    connectedAccount != null &&
    topMarkeeOwner != null &&
    connectedAccount.toLowerCase() === topMarkeeOwner.toLowerCase();
  const ownedMarkeeAddress =
    isTopMarkeeOwner ? topMarkeeAddress : connectedMarkeeAddress;
  const isOwnedMarkeeWinning =
    isTopMarkeeOwner ||
    (ownedMarkeeAddress != null &&
      topMarkeeAddress != null &&
      ownedMarkeeAddress.toLowerCase() === topMarkeeAddress.toLowerCase());
  const ownedMarkeeMessage =
    isTopMarkeeOwner ? message : connectedMarkeeMessage;
  const ownedMarkeeName =
    isTopMarkeeOwner ? topMarkeeName ?? "" : connectedMarkeeName ?? "";
  const displayedMarkeeMessage = ownedMarkeeMessage ?? message;
  const shouldCreateMarkee =
    !isTopMarkeeOwner && connectedMarkeeAddress == null;
  const ownedMarkeeHasEmptyMessage =
    ownedMarkeeAddress != null && ownedMarkeeMessage?.trim().length === 0;
  const shouldShowOwnedMarkeeEditor =
    isEditingMessage || ownedMarkeeHasEmptyMessage;
  const hasActiveStream = activeStreamRate > 0n;
  const doubleWinningMonthlyRateAmount =
    (hasActiveStream ?
      activeStreamRate * MARKEE_SECONDS_IN_MONTH
    : topMonthlyRateAmount) * 2n;
  const doubleWinningMonthlyRate = formatEthFundingInput(
    doubleWinningMonthlyRateAmount,
  );
  const withdrawableStreamDeposit = getMarkeeWithdrawableDeposit(
    existingStreamDeposit,
    activeStreamRate,
  );
  const messageByteLength = new TextEncoder().encode(editedMessage).length;
  const newMarkeeMessageByteLength = new TextEncoder().encode(
    newMarkeeMessage,
  ).length;
  const nameByteLength = new TextEncoder().encode(editedName).length;
  const newMarkeeNameByteLength = new TextEncoder().encode(
    newMarkeeName,
  ).length;
  const messageByteLimit = Number(maxMessageLength ?? "0") || 280;
  const nameByteLimit = Number(maxNameLength ?? "0") || 22;
  const hasPendingMessageUpdate =
    ownedMarkeeAddress != null &&
    ownedMarkeeMessage != null &&
    editedMessage !== ownedMarkeeMessage;
  const hasPendingNameUpdate =
    ownedMarkeeAddress != null && editedName !== ownedMarkeeName;
  const { data: walletBalance, isLoading: isWalletBalanceLoading } = useBalance(
    {
      address: connectedAccount,
      chainId: markeeChainId,
      enabled: isLive && connectedAccount != null,
      watch: true,
    },
  );
  const derivedMonthlyRateAmount = useMemo(() => {
    try {
      return parseEther(monthlyRate);
    } catch {
      return 0n;
    }
  }, [monthlyRate]);
  const ethxAvailableBalance = ethxWalletBalance - ethxWalletDeficit;
  const estimatedGasReserve = estimatedStreamGasCost ?? parseEther("0.0002");
  const streamAmounts = useMemo(() => {
    const baseAmounts = getMarkeeStreamAmounts(
      derivedMonthlyRateAmount,
      10n ** 18n,
      minimumMonthlyRateAmount,
    );
    const autoFunding = getMarkeeAutoFunding({
      ethxAvailableBalance,
      existingDeposit: existingStreamDeposit,
      nativeBalance: walletBalance?.value ?? 0n,
      ratePerSecond: baseAmounts.ratePerSecond,
    });
    return {
      ...baseAmounts,
      depositTopUp: autoFunding.depositTopUp,
      insufficientEth: autoFunding.insufficientEth,
      prefund: autoFunding.prefund,
      runwaySeconds: autoFunding.runwaySeconds,
      value: autoFunding.wrapValue,
    };
  }, [
    derivedMonthlyRateAmount,
    ethxAvailableBalance,
    existingStreamDeposit,
    walletBalance?.value,
  ]);
  const streamAmount = formatEthFundingInput(streamAmounts.value);
  const isStreamGasEstimatePending =
    ownedMarkeeAddress != null && estimatedStreamGasCost == null;
  const previewNativeBalanceRequired =
    streamAmounts.value + estimatedGasReserve;
  const hasInsufficientWalletBalance =
    isLive &&
    connectedAccount != null &&
    !isWalletBalanceLoading &&
    !isStreamPositionLoading &&
    walletBalance != null &&
    walletBalance.value < previewNativeBalanceRequired;
  const insufficientBalanceMessage =
    hasInsufficientWalletBalance ?
      `Your wallet needs ${formatEthAmount(previewNativeBalanceRequired)} native ETH, including an estimated ${formatEthAmount(estimatedGasReserve)} ETH gas buffer. You currently have ${formatEthAmount(walletBalance?.value ?? 0n)} native ETH. ETHx can fund the stream but cannot pay network gas.${ethxWalletDeficit > 0n ? ` Your Superfluid account also has a ${formatEthAmount(ethxWalletDeficit)} ETHx deficit from existing streams.` : ""}`
    : null;
  const isBelowMinimum =
    derivedMonthlyRateAmount > 0n &&
    derivedMonthlyRateAmount < minimumMonthlyRateAmount;
  const streamFormError = streamValidationError;
  const autoFundingError =
    streamAmounts.insufficientEth ?
      "Your ETH and ETHx balances cannot cover the required streaming buffer. Add funds in Deposit Manager."
    : null;
  const canStartPreview =
    derivedMonthlyRateAmount >= minimumMonthlyRateAmount &&
    streamAmounts.ratePerSecond > 0n &&
    !streamAmounts.insufficientEth &&
    streamAmounts.prefund > streamAmounts.buffer &&
    (!shouldCreateMarkee ||
      (newMarkeeMessage.trim().length > 0 &&
        newMarkeeMessageByteLength <= messageByteLimit &&
        newMarkeeNameByteLength <= nameByteLimit)) &&
    (shouldCreateMarkee ||
      !shouldShowOwnedMarkeeEditor ||
      (editedMessage.trim().length > 0 &&
        messageByteLength <= messageByteLimit &&
        nameByteLength <= nameByteLimit));
  const isMarkeeMessageMissing =
    (shouldCreateMarkee && newMarkeeMessage.trim().length === 0) ||
    (!shouldCreateMarkee &&
      shouldShowOwnedMarkeeEditor &&
      editedMessage.trim().length === 0);
  const paymentReviewMessage =
    shouldCreateMarkee ? newMarkeeMessage.trim()
    : shouldShowOwnedMarkeeEditor ? editedMessage.trim()
    : displayedMarkeeMessage;
  const paymentReviewWillWin =
    !hasTopStream || derivedMonthlyRateAmount >= challengeMonthlyRateAmount;
  const additionalMonthlyRateToWin =
    challengeMonthlyRateAmount > derivedMonthlyRateAmount ?
      challengeMonthlyRateAmount - derivedMonthlyRateAmount
    : 0n;
  const newMarkeeMessageInput = (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-soft-content">
          Your message
        </span>
        <textarea
          className="textarea textarea-bordered min-h-24 w-full resize-none border-primary-content bg-primary-soft-dark font-mono shadow-[0_0_24px_rgb(var(--color-primary-content)/0.08)] outline-none focus:border-primary-content"
          value={newMarkeeMessage}
          onChange={(event) => setNewMarkeeMessage(event.target.value)}
          placeholder="Write the message you want to lead with"
          aria-label="New Markee message"
        />
        <span
          className={`text-xs ${newMarkeeMessageByteLength > messageByteLimit ? "text-danger-content" : "text-neutral-soft-content"}`}
        >
          {newMarkeeMessageByteLength}/{messageByteLimit}
        </span>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-soft-content">
          Your name{" "}
          <span className="normal-case text-neutral-content/40">
            (optional)
          </span>
        </span>
        <input
          className="input input-bordered input-info w-full bg-primary-soft-dark outline-none"
          value={newMarkeeName}
          onChange={(event) => setNewMarkeeName(event.target.value)}
          placeholder="Your name"
          aria-label="Your name"
        />
        <span
          className={`text-xs ${newMarkeeNameByteLength > nameByteLimit ? "text-danger-content" : "text-neutral-soft-content"}`}
        >
          {newMarkeeNameByteLength}/{nameByteLimit}
        </span>
      </label>
    </div>
  );

  useEffect(() => {
    if (isOpen) {
      setMonthlyRate(challengeMonthlyRate);
      setIsReviewingPayment(false);
      setStreamValidationError(null);
      setNewMarkeeMessage("");
      setNewMarkeeName("");
    }
  }, [challengeMonthlyRate, isOpen]);

  useEffect(() => {
    setStreamValidationError(null);
  }, [ethxWalletBalance, ethxWalletDeficit, monthlyRate, walletBalance?.value]);

  useEffect(() => {
    if (isOpen) {
      setEditedMessage(ownedMarkeeMessage ?? message);
      setEditedName(ownedMarkeeName);
    }
  }, [isOpen, message, ownedMarkeeMessage, ownedMarkeeName]);

  useEffect(() => {
    if (
      !isOpen ||
      !isLive ||
      connectedAccount == null ||
      leaderboardAddress == null ||
      publicClient == null
    ) {
      setActiveStreamMarkee(null);
      setActiveStreamRate(0n);
      setEthxWalletBalance(0n);
      setEthxWalletDeficit(0n);
      setEthxAddress(null);
      setExistingStreamDeposit(0n);
      setIsStreamPositionLoading(false);
      return;
    }

    let cancelled = false;
    setIsStreamPositionLoading(true);
    setEthxWalletBalance(0n);
    setEthxWalletDeficit(0n);
    setEthxAddress(null);
    setExistingStreamDeposit(0n);

    void (async () => {
      const ethxResult = await publicClient.readContract({
        abi: streamingLeaderboardRuntimeABI,
        address: leaderboardAddress,
        functionName: "ETHX",
      });
      if (!isAddress(ethxResult)) {
        throw new Error("The Markee stream token is unavailable.");
      }
      const ethx = getAddress(ethxResult);
      if (!cancelled) setEthxAddress(ethx);
      const [activeMarkeeResult, flowRate, realtimeBalance, streamDeposit] =
        await Promise.all([
          publicClient.readContract({
            abi: streamingLeaderboardRuntimeABI,
            address: leaderboardAddress,
            args: [connectedAccount],
            functionName: "backerMarkee",
          }),
          publicClient.readContract({
            abi: cfaV1ForwarderABI,
            address: CFA_V1_FORWARDER_ADDRESS,
            args: [ethx, connectedAccount, leaderboardAddress],
            functionName: "getFlowrate",
          }),
          publicClient.readContract({
            abi: ethxApproveABI,
            address: ethx,
            args: [connectedAccount],
            functionName: "realtimeBalanceOfNow",
          }),
          publicClient.readContract({
            abi: streamingLeaderboardRuntimeABI,
            address: leaderboardAddress,
            args: [connectedAccount],
            functionName: "backerDeposit",
          }),
        ]);
      if (cancelled) return;

      const liveRate = flowRate > 0n ? flowRate : 0n;
      const availableBalance = realtimeBalance[0];
      setEthxAddress(ethx);
      setActiveStreamRate(liveRate);
      setEthxWalletBalance(availableBalance > 0n ? availableBalance : 0n);
      setEthxWalletDeficit(availableBalance < 0n ? -availableBalance : 0n);
      setExistingStreamDeposit(streamDeposit);
      setActiveStreamMarkee(
        (
          liveRate > 0n &&
            isAddress(activeMarkeeResult) &&
            activeMarkeeResult !== zeroAddress
        ) ?
          getAddress(activeMarkeeResult)
        : null,
      );
      if (liveRate > 0n) {
        setMonthlyRate(formatEthInput(liveRate * MARKEE_SECONDS_IN_MONTH));
      }
    })()
      .catch((error: unknown) => {
        logOnce(
          "warn",
          "[CommunityMarkee] Unable to load the connected wallet's stream",
          error,
        );
      })
      .finally(() => {
        if (!cancelled) setIsStreamPositionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    connectedAccount,
    isLive,
    isOpen,
    leaderboardAddress,
    publicClient,
    streamPositionRefreshKey,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      !isLive ||
      connectedAccount == null ||
      leaderboardAddress == null ||
      publicClient == null
    ) {
      setConnectedMarkeeAddress(null);
      setConnectedMarkeeMessage(null);
      setConnectedMarkeeName(null);
      setIsConnectedMarkeeLoading(false);
      return;
    }
    if (isTopMarkeeOwner) {
      setConnectedMarkeeAddress(null);
      setConnectedMarkeeMessage(null);
      setConnectedMarkeeName(null);
      setIsConnectedMarkeeLoading(false);
      return;
    }

    let cancelled = false;
    setConnectedMarkeeAddress(null);
    setConnectedMarkeeMessage(null);
    setConnectedMarkeeName(null);
    setIsConnectedMarkeeLoading(true);

    void (async () => {
      const selectConnectedMarkee = async (markeeAddress: Address) => {
        const [markeeMessage, markeeName] = await Promise.all([
          publicClient.readContract({
            abi: markeeOwnerABI,
            address: markeeAddress,
            functionName: "message",
          }),
          publicClient.readContract({
            abi: markeeOwnerABI,
            address: markeeAddress,
            functionName: "name",
          }),
        ]);
        if (!cancelled) {
          setConnectedMarkeeAddress(markeeAddress);
          setConnectedMarkeeMessage(markeeMessage);
          setConnectedMarkeeName(markeeName);
        }
      };

      const activeMarkee = await publicClient.readContract({
        abi: streamingLeaderboardRuntimeABI,
        address: leaderboardAddress,
        args: [connectedAccount],
        functionName: "backerMarkee",
      });
      if (isAddress(activeMarkee) && activeMarkee !== zeroAddress) {
        const activeMarkeeAddress = getAddress(activeMarkee);
        const activeMarkeeOwner = await publicClient.readContract({
          abi: markeeOwnerABI,
          address: activeMarkeeAddress,
          functionName: "owner",
        });
        if (
          isAddress(activeMarkeeOwner) &&
          activeMarkeeOwner.toLowerCase() === connectedAccount.toLowerCase()
        ) {
          await selectConnectedMarkee(activeMarkeeAddress);
          return;
        }
      }

      const count = await publicClient.readContract({
        abi: streamingLeaderboardRuntimeABI,
        address: leaderboardAddress,
        functionName: "markeeCount",
      });
      let cursor = count;
      const pageSize = 50n;

      while (!cancelled && cursor > 0n) {
        const size = cursor < pageSize ? cursor : pageSize;
        const offset = cursor - size;
        const markees = await publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          args: [offset, size],
          functionName: "getMarkees",
        });
        const owners = await publicClient.multicall({
          allowFailure: true,
          contracts: markees.map((markeeAddress) => ({
            abi: markeeOwnerABI,
            address: markeeAddress,
            functionName: "owner" as const,
          })),
        });

        for (let index = markees.length - 1; index >= 0; index -= 1) {
          const ownerResult = owners[index];
          if (
            ownerResult?.status === "success" &&
            isAddress(ownerResult.result) &&
            ownerResult.result.toLowerCase() === connectedAccount.toLowerCase()
          ) {
            await selectConnectedMarkee(getAddress(markees[index]));
            return;
          }
        }

        cursor = offset;
      }
    })()
      .catch((error: unknown) => {
        logOnce(
          "warn",
          "[CommunityMarkee] Unable to resolve the connected wallet's Markee",
          error,
        );
      })
      .finally(() => {
        if (!cancelled) setIsConnectedMarkeeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    connectedAccount,
    isLive,
    isOpen,
    isTopMarkeeOwner,
    leaderboardAddress,
    publicClient,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      !isLive ||
      connectedAccount == null ||
      leaderboardAddress == null ||
      ownedMarkeeAddress == null ||
      publicClient == null ||
      isConnectedMarkeeLoading ||
      isStreamPositionLoading ||
      streamAmounts.ratePerSecond <= 0n ||
      streamAmounts.prefund <= streamAmounts.buffer
    ) {
      setEstimatedStreamGasCost(null);
      setIsStreamGasEstimateLoading(false);
      return;
    }

    let cancelled = false;
    setEstimatedStreamGasCost(null);
    setIsStreamGasEstimateLoading(true);

    const timeout = window.setTimeout(() => {
      void (async () => {
        const [ethxResult, hostResult, poolResult] = await Promise.all([
          publicClient.readContract({
            abi: streamingLeaderboardRuntimeABI,
            address: leaderboardAddress,
            functionName: "ETHX",
          }),
          publicClient.readContract({
            abi: streamingLeaderboardRuntimeABI,
            address: leaderboardAddress,
            functionName: "HOST",
          }),
          publicClient.readContract({
            abi: streamingLeaderboardRuntimeABI,
            address: leaderboardAddress,
            args: [ownedMarkeeAddress],
            functionName: "poolOf",
          }),
        ]);
        if (
          !isAddress(ethxResult) ||
          !isAddress(hostResult) ||
          !isAddress(poolResult) ||
          poolResult === zeroAddress
        ) {
          throw new Error("The Markee stream configuration is unavailable.");
        }

        const ethx = getAddress(ethxResult);
        const host = getAddress(hostResult);
        const [
          cfaResult,
          gdaResult,
          realtimeBalance,
          allowance,
          existingMarkeeResult,
          existingDeposit,
          existingFlowRate,
        ] = await Promise.all([
          publicClient.readContract({
            abi: superfluidHostABI,
            address: host,
            args: [CFA_AGREEMENT_ID],
            functionName: "getAgreementClass",
          }),
          publicClient.readContract({
            abi: superfluidHostABI,
            address: host,
            args: [GDA_AGREEMENT_ID],
            functionName: "getAgreementClass",
          }),
          publicClient.readContract({
            abi: ethxApproveABI,
            address: ethx,
            args: [connectedAccount],
            functionName: "realtimeBalanceOfNow",
          }),
          publicClient.readContract({
            abi: ethxApproveABI,
            address: ethx,
            args: [connectedAccount, leaderboardAddress],
            functionName: "allowance",
          }),
          publicClient.readContract({
            abi: streamingLeaderboardRuntimeABI,
            address: leaderboardAddress,
            args: [connectedAccount],
            functionName: "backerMarkee",
          }),
          publicClient.readContract({
            abi: streamingLeaderboardRuntimeABI,
            address: leaderboardAddress,
            args: [connectedAccount],
            functionName: "backerDeposit",
          }),
          publicClient.readContract({
            abi: cfaV1ForwarderABI,
            address: CFA_V1_FORWARDER_ADDRESS,
            args: [ethx, connectedAccount, leaderboardAddress],
            functionName: "getFlowrate",
          }),
        ]);
        if (!isAddress(cfaResult) || !isAddress(gdaResult)) {
          throw new Error("The Superfluid agreements are unavailable.");
        }

        const depositTopUp =
          streamAmounts.buffer > existingDeposit ?
            streamAmounts.buffer - existingDeposit
          : 0n;
        const { requiresApproval, wrapValue } = getMarkeeStreamFunding({
          ethxAllowance: allowance,
          ethxAvailableBalance: realtimeBalance[0],
          requiredBuffer: depositTopUp,
          totalRequired: depositTopUp + streamAmounts.prefund,
        });
        const existingMarkee =
          (
            isAddress(existingMarkeeResult) &&
            existingMarkeeResult !== zeroAddress
          ) ?
            getAddress(existingMarkeeResult)
          : undefined;
        const operations = buildMarkeeOpenStreamOperations({
          approvalAmount: requiresApproval ? depositTopUp : 0n,
          backer: connectedAccount,
          board: leaderboardAddress,
          buffer: depositTopUp,
          cfaAgreement: getAddress(cfaResult),
          ethx,
          existingMarkee,
          existingRatePerSecond:
            existingFlowRate > 0n ? existingFlowRate : undefined,
          gdaAgreement: getAddress(gdaResult),
          markee: ownedMarkeeAddress,
          pool: getAddress(poolResult),
          ratePerSecond: streamAmounts.ratePerSecond,
          wrapValue,
        });
        const [gasEstimate, gasPrice] = await Promise.all([
          publicClient.estimateContractGas({
            abi: superfluidHostABI,
            account: connectedAccount,
            address: host,
            args: [operations],
            functionName: "batchCall",
            value: wrapValue,
          }),
          publicClient.getGasPrice(),
        ]);
        const { estimatedGasCost } = getMarkeeRequiredNativeBalance({
          gasEstimate,
          gasPrice,
          wrapValue,
        });
        if (!cancelled) setEstimatedStreamGasCost(estimatedGasCost);
      })()
        .catch((error: unknown) => {
          logOnce(
            "warn",
            "[CommunityMarkee] Unable to estimate the stream transaction fee",
            error,
          );
        })
        .finally(() => {
          if (!cancelled) setIsStreamGasEstimateLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    connectedAccount,
    isConnectedMarkeeLoading,
    isLive,
    isOpen,
    isStreamPositionLoading,
    leaderboardAddress,
    ownedMarkeeAddress,
    publicClient,
    streamAmounts,
  ]);

  const handleClose = () => {
    setIsPreviewComplete(false);
    setIsStreaming(false);
    setIsEditingMessage(false);
    setIsReviewingPayment(false);
    onClose();
  };

  const beginTransactionNotification = (
    contractName: string,
    targetAddress?: Address,
  ) => {
    transactionNotificationAttempt.current += 1;
    const toastId = `markee-${transactionNotificationAttempt.current}`;
    setTransactionNotification({
      contractName,
      status: "waiting",
      targetAddress,
      toastId,
    });
    return toastId;
  };

  const updateTransactionNotification = (
    toastId: string,
    update: Partial<MarkeeTransactionNotification>,
  ) => {
    setTransactionNotification((current) =>
      current?.toastId === toastId ? { ...current, ...update } : current,
    );
  };

  const showStreamError = (error: unknown, fallback: string) => {
    const toastMessage = getTransactionErrorMessage(error, fallback);

    toast.error(toastMessage, { toastId: "markee-stream-error" });

    return toastMessage;
  };

  const restoreOriginalChain = async (originalChainId: number | undefined) => {
    if (
      originalChainId == null ||
      originalChainId === markeeChainId ||
      switchNetworkAsync == null ||
      getNetwork().chain?.id === originalChainId
    ) {
      return;
    }

    try {
      await switchNetworkAsync(originalChainId);
    } catch (error) {
      logOnce(
        "warn",
        "[CommunityMarkee] Unable to restore the original wallet chain",
        error,
      );
      toast.warn(
        "Transaction submitted, but your wallet could not switch back to the original network.",
        { toastId: "markee-network-restore-warning" },
      );
    }
  };

  const handleStartStream = async () => {
    if (!isLive) {
      setIsPreviewComplete(true);
      return;
    }
    if (connectedAccount == null) {
      showStreamError(null, "Connect a wallet to start streaming.");
      return;
    }
    const originalChainId = connectedChain?.id;
    let actionWalletClient = walletClient;
    if (connectedChain?.id !== markeeChainId) {
      if (switchNetworkAsync == null) {
        showStreamError(
          null,
          "Switch your wallet to Ethereum Sepolia to continue.",
        );
        return;
      }
      try {
        await switchNetworkAsync(markeeChainId);
        actionWalletClient = await getWalletClient({ chainId: markeeChainId });
      } catch (error) {
        showStreamError(error, "Unable to switch to Ethereum Sepolia.");
        return;
      }
    }
    if (publicClient == null || actionWalletClient == null) {
      showStreamError(null, "The Sepolia wallet client is not ready yet.");
      return;
    }
    if (shouldCreateMarkee && newMarkeeMessage.trim().length === 0) {
      showStreamError(null, "Add a message for your Markee.");
      return;
    }
    if (shouldCreateMarkee && newMarkeeMessageByteLength > messageByteLimit) {
      showStreamError(
        null,
        `Keep your Markee message within ${messageByteLimit} bytes.`,
      );
      return;
    }
    if (
      !shouldCreateMarkee &&
      shouldShowOwnedMarkeeEditor &&
      editedMessage.trim().length === 0
    ) {
      showStreamError(null, "Add a message for your Markee.");
      return;
    }
    if (!shouldCreateMarkee && messageByteLength > messageByteLimit) {
      showStreamError(
        null,
        `Keep your Markee message within ${messageByteLimit} bytes.`,
      );
      return;
    }
    if (!shouldCreateMarkee && nameByteLength > nameByteLimit) {
      showStreamError(null, `Keep your name within ${nameByteLimit} bytes.`);
      return;
    }

    setIsStreaming(true);
    setCreateTransaction({
      contractName: "Create Markee",
      message: "Create your message on this leaderboard.",
      status: "idle",
    });
    setMessageTransaction({
      contractName: "Update Markee message",
      message: "Save your message on this leaderboard.",
      status: "idle",
    });
    setNameTransaction({
      contractName: "Update Markee name",
      message: "Save your name on this leaderboard.",
      status: "idle",
    });
    setStreamTransaction({
      contractName: "Start stream",
      message: "Fund and open the stream to your Markee.",
      status: "idle",
    });
    setShowCreateTransaction(false);
    setShowMessageTransaction(false);
    setShowNameTransaction(false);
    setIsTransactionModalOpen(false);
    toast.dismiss("markee-stream-error");
    let activeStep:
      | "create"
      | "preflight"
      | "stream"
      | "update-message"
      | "update-name" = "preflight";
    let showsTransactionModal = false;
    let targetMarkeeAddress = ownedMarkeeAddress;
    let targetPoolAddress: Address | undefined;
    let createTransactionHash: `0x${string}` | undefined;
    let messageTransactionHash: `0x${string}` | undefined;
    let nameTransactionHash: `0x${string}` | undefined;
    let streamTransactionHash: `0x${string}` | undefined;
    let notificationToastId: string | undefined;
    try {
      const amounts = streamAmounts;
      if (amounts.ratePerSecond <= 0n || amounts.prefund <= amounts.buffer) {
        throw new Error("Fund the stream for longer than its required buffer.");
      }

      const [ethxResult, hostResult] = await Promise.all([
        publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          functionName: "ETHX",
        }),
        publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          functionName: "HOST",
        }),
      ]);
      if (!isAddress(ethxResult) || !isAddress(hostResult)) {
        throw new Error("The Markee stream configuration is invalid.");
      }
      const ethx = getAddress(ethxResult);
      const host = getAddress(hostResult);
      const [
        cfaResult,
        gdaResult,
        ethxRealtimeBalance,
        ethxAllowance,
        existingMarkeeResult,
        existingDeposit,
        existingFlowRate,
      ] = await Promise.all([
        publicClient.readContract({
          abi: superfluidHostABI,
          address: host,
          args: [CFA_AGREEMENT_ID],
          functionName: "getAgreementClass",
        }),
        publicClient.readContract({
          abi: superfluidHostABI,
          address: host,
          args: [GDA_AGREEMENT_ID],
          functionName: "getAgreementClass",
        }),
        publicClient.readContract({
          abi: ethxApproveABI,
          address: ethx,
          args: [connectedAccount],
          functionName: "realtimeBalanceOfNow",
        }),
        publicClient.readContract({
          abi: ethxApproveABI,
          address: ethx,
          args: [connectedAccount, leaderboardAddress],
          functionName: "allowance",
        }),
        publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          args: [connectedAccount],
          functionName: "backerMarkee",
        }),
        publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          args: [connectedAccount],
          functionName: "backerDeposit",
        }),
        publicClient.readContract({
          abi: cfaV1ForwarderABI,
          address: CFA_V1_FORWARDER_ADDRESS,
          args: [ethx, connectedAccount, leaderboardAddress],
          functionName: "getFlowrate",
        }),
      ]);
      if (!isAddress(cfaResult) || !isAddress(gdaResult)) {
        throw new Error("The Superfluid agreements are unavailable.");
      }

      const depositTopUp =
        amounts.buffer > existingDeposit ?
          amounts.buffer - existingDeposit
        : 0n;
      const { requiresApproval, wrapValue } = getMarkeeStreamFunding({
        ethxAllowance,
        ethxAvailableBalance: ethxRealtimeBalance[0],
        requiredBuffer: depositTopUp,
        totalRequired: depositTopUp + amounts.prefund,
      });
      const nativeBalance = await publicClient.getBalance({
        address: connectedAccount,
      });
      if (nativeBalance < wrapValue) {
        setStreamValidationError(
          `Your wallet needs at least ${formatEthAmount(wrapValue)} ETH plus gas to fund this stream.`,
        );
        return;
      }
      const existingMarkeeAddress =
        (
          isAddress(existingMarkeeResult) &&
          existingMarkeeResult !== zeroAddress
        ) ?
          getAddress(existingMarkeeResult)
        : undefined;
      const plannedTransactionCount =
        Number(shouldCreateMarkee) +
        Number(!shouldCreateMarkee && hasPendingMessageUpdate) +
        Number(!shouldCreateMarkee && hasPendingNameUpdate) +
        1;
      showsTransactionModal = plannedTransactionCount > 1;
      setShowCreateTransaction(shouldCreateMarkee);
      setShowMessageTransaction(!shouldCreateMarkee && hasPendingMessageUpdate);
      setShowNameTransaction(!shouldCreateMarkee && hasPendingNameUpdate);
      if (showsTransactionModal) {
        setIsTransactionModalOpen(true);
        onClose();
      } else if (
        shouldCreateMarkee ||
        hasPendingMessageUpdate ||
        hasPendingNameUpdate
      ) {
        onClose();
      }

      if (shouldCreateMarkee) {
        activeStep = "create";
        setCreateTransaction({
          contractName: "Create Markee",
          message: "Confirm Markee creation in your wallet.",
          status: "waiting",
        });
        notificationToastId = beginTransactionNotification(
          "Create Markee",
          leaderboardAddress,
        );
        createTransactionHash = await actionWalletClient.writeContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          args: [newMarkeeMessage.trim(), newMarkeeName.trim()],
          functionName: "createMarkee",
        });
        updateTransactionNotification(notificationToastId, {
          status: "loading",
          transactionHash: createTransactionHash,
        });
        setCreateTransaction({
          contractName: "Create Markee",
          message: "Waiting for your Markee to be confirmed…",
          status: "loading",
        });
        const createReceipt = await publicClient.waitForTransactionReceipt({
          hash: createTransactionHash,
        });
        if (createReceipt.status !== "success") {
          throw new Error("The Markee creation transaction reverted.");
        }

        let registeredMarkeeAddress: Address | undefined;
        let registeredPoolAddress: Address | undefined;
        for (const log of createReceipt.logs) {
          if (log.address.toLowerCase() !== leaderboardAddress.toLowerCase()) {
            continue;
          }
          try {
            const decoded = decodeEventLog({
              abi: streamingLeaderboardRuntimeABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "MarkeeCreated") {
              targetMarkeeAddress = getAddress(decoded.args.markeeAddress);
            }
            if (decoded.eventName === "MarkeeRegistered") {
              registeredMarkeeAddress = getAddress(decoded.args.markeeAddress);
              registeredPoolAddress = getAddress(decoded.args.pool);
            }
          } catch {
            // Other leaderboard events in the receipt are unrelated.
          }
        }
        if (
          targetMarkeeAddress == null ||
          targetMarkeeAddress === zeroAddress ||
          targetMarkeeAddress === topMarkeeAddress
        ) {
          throw new Error("Unable to find the newly created Markee.");
        }
        const markeeIsRegistered = await waitForMarkeeRegistration({
          isRegistered: async () =>
            Boolean(
              await publicClient.readContract({
                abi: streamingLeaderboardRuntimeABI,
                address: leaderboardAddress,
                args: [targetMarkeeAddress as Address],
                functionName: "isMarkeeOnLeaderboard",
              }),
            ),
        });
        if (!markeeIsRegistered) {
          throw new Error(
            "Your Markee is still being confirmed. Please try again in a moment.",
          );
        }
        setCreateTransaction({
          contractName: "Create Markee",
          message: "Markee created.",
          status: "success",
        });
        updateTransactionNotification(notificationToastId, {
          status: "success",
        });
        activeStep = "stream";
        if (
          registeredMarkeeAddress?.toLowerCase() ===
          targetMarkeeAddress.toLowerCase()
        ) {
          targetPoolAddress = registeredPoolAddress;
        }
        setConnectedMarkeeAddress(targetMarkeeAddress);
        setConnectedMarkeeMessage(newMarkeeMessage.trim());
        setConnectedMarkeeName(newMarkeeName.trim());
      } else {
        if (hasPendingMessageUpdate && targetMarkeeAddress != null) {
          activeStep = "update-message";
          setMessageTransaction({
            contractName: "Update Markee message",
            message: "Confirm your message in your wallet.",
            status: "waiting",
          });
          notificationToastId = beginTransactionNotification(
            "Update Markee message",
            leaderboardAddress,
          );
          messageTransactionHash = await actionWalletClient.writeContract({
            abi: streamingLeaderboardRuntimeABI,
            address: leaderboardAddress,
            args: [targetMarkeeAddress, editedMessage.trim()],
            functionName: "updateMessage",
          });
          updateTransactionNotification(notificationToastId, {
            status: "loading",
            transactionHash: messageTransactionHash,
          });
          setMessageTransaction({
            contractName: "Update Markee message",
            message: "Waiting for your message to be confirmed…",
            status: "loading",
          });
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: messageTransactionHash,
          });
          if (receipt.status !== "success") {
            throw new Error("The message update transaction reverted.");
          }
          setConnectedMarkeeMessage(editedMessage.trim());
          if (isTopMarkeeOwner) onMessageUpdated(editedMessage.trim());
          setMessageTransaction({
            contractName: "Update Markee message",
            message: "Message updated.",
            status: "success",
          });
          updateTransactionNotification(notificationToastId, {
            status: "success",
          });
        }

        if (hasPendingNameUpdate && targetMarkeeAddress != null) {
          activeStep = "update-name";
          setNameTransaction({
            contractName: "Update Markee name",
            message: "Confirm your name in your wallet.",
            status: "waiting",
          });
          notificationToastId = beginTransactionNotification(
            "Update Markee name",
            leaderboardAddress,
          );
          nameTransactionHash = await actionWalletClient.writeContract({
            abi: streamingLeaderboardRuntimeABI,
            address: leaderboardAddress,
            args: [targetMarkeeAddress, editedName.trim()],
            functionName: "updateName",
          });
          updateTransactionNotification(notificationToastId, {
            status: "loading",
            transactionHash: nameTransactionHash,
          });
          setNameTransaction({
            contractName: "Update Markee name",
            message: "Waiting for your name to be confirmed…",
            status: "loading",
          });
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: nameTransactionHash,
          });
          if (receipt.status !== "success") {
            throw new Error("The name update transaction reverted.");
          }
          setConnectedMarkeeName(editedName.trim());
          setNameTransaction({
            contractName: "Update Markee name",
            message: "Name updated.",
            status: "success",
          });
          updateTransactionNotification(notificationToastId, {
            status: "success",
          });
        }
      }

      if (targetMarkeeAddress == null) {
        throw new Error("The target Markee is unavailable.");
      }
      if (targetPoolAddress == null) {
        const poolResult = await publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          args: [targetMarkeeAddress],
          functionName: "poolOf",
        });
        if (!isAddress(poolResult) || poolResult === zeroAddress) {
          throw new Error("The Markee refund pool is unavailable.");
        }
        targetPoolAddress = getAddress(poolResult);
      }
      const pool = targetPoolAddress;

      activeStep = "stream";
      setStreamTransaction({
        contractName: existingFlowRate > 0n ? "Replace stream" : "Start stream",
        message:
          existingFlowRate > 0n ?
            "Confirm the stream replacement in your wallet."
          : "Confirm the stream transaction in your wallet.",
        status: "waiting",
      });
      const operations = buildMarkeeOpenStreamOperations({
        approvalAmount: requiresApproval ? depositTopUp : 0n,
        backer: connectedAccount,
        board: leaderboardAddress,
        buffer: depositTopUp,
        cfaAgreement: getAddress(cfaResult),
        ethx,
        existingMarkee: existingMarkeeAddress,
        existingRatePerSecond:
          existingFlowRate > 0n ? existingFlowRate : undefined,
        gdaAgreement: getAddress(gdaResult),
        markee: targetMarkeeAddress,
        pool,
        ratePerSecond: amounts.ratePerSecond,
        wrapValue,
      });
      const [gasEstimate, gasPrice] = await Promise.all([
        publicClient.estimateContractGas({
          abi: superfluidHostABI,
          account: connectedAccount,
          address: host,
          args: [operations],
          functionName: "batchCall",
          value: wrapValue,
        }),
        publicClient.getGasPrice(),
      ]);
      const { bufferedGas, estimatedGasCost, requiredBalance } =
        getMarkeeRequiredNativeBalance({
          gasEstimate,
          gasPrice,
          wrapValue,
        });
      if (nativeBalance < requiredBalance) {
        setStreamValidationError(
          `Your wallet needs ${formatEthAmount(requiredBalance)} ETH, including an estimated ${formatEthAmount(estimatedGasCost)} ETH gas buffer. You currently have ${formatEthAmount(nativeBalance)} ETH.`,
        );
        if (
          createTransactionHash != null ||
          messageTransactionHash != null ||
          nameTransactionHash != null
        ) {
          await restoreOriginalChain(originalChainId);
        }
        return;
      }
      if (!showsTransactionModal) onClose();
      notificationToastId = beginTransactionNotification(
        existingFlowRate > 0n ? "Replace Markee stream" : "Start Markee stream",
        host,
      );
      streamTransactionHash = await actionWalletClient.writeContract({
        abi: superfluidHostABI,
        address: host,
        args: [operations],
        functionName: "batchCall",
        gas: bufferedGas,
        value: wrapValue,
      });
      updateTransactionNotification(notificationToastId, {
        status: "loading",
        transactionHash: streamTransactionHash,
      });
      await restoreOriginalChain(originalChainId);
      setStreamTransaction({
        contractName: existingFlowRate > 0n ? "Replace stream" : "Start stream",
        message:
          existingFlowRate > 0n ?
            "Waiting for the stream replacement to be confirmed…"
          : "Waiting for the stream to be confirmed…",
        status: "loading",
      });
      const streamReceipt = await publicClient.waitForTransactionReceipt({
        hash: streamTransactionHash,
      });
      if (streamReceipt.status !== "success") {
        throw new Error("The stream transaction reverted.");
      }

      setStreamTransaction({
        contractName: existingFlowRate > 0n ? "Replace stream" : "Start stream",
        message: existingFlowRate > 0n ? "Stream replaced." : "Stream started.",
        status: "success",
      });
      updateTransactionNotification(notificationToastId, {
        status: "success",
      });
      setActiveStreamMarkee(targetMarkeeAddress);
      setActiveStreamRate(amounts.ratePerSecond);
      setIsEditingMessage(false);
      onStreamUpdated();
    } catch (error) {
      if (notificationToastId != null) {
        updateTransactionNotification(notificationToastId, {
          error: getTransactionError(error, "The Markee transaction failed."),
          status: "error",
        });
      }
      if (!isUserRejectedTransactionError(error)) {
        const errorContext = {
          type: "markee-transaction-error",
          step: activeStep,
          chainId: markeeChainId,
          connectedAccount,
          leaderboardAddress,
          targetMarkeeAddress,
          createTransactionHash,
          messageTransactionHash,
          nameTransactionHash,
          streamTransactionHash,
          streamAmount,
          monthlyRate,
          autoFundingRunwaySeconds: streamAmounts.runwaySeconds.toString(),
          autoWrapValue: streamAmounts.value.toString(),
          tags: {
            error_type: "markee-transaction-error",
            transaction_step: activeStep,
            chain_id: markeeChainId,
          },
        };
        logOnce(
          "error",
          "[CommunityMarkee] Markee transaction failed",
          error,
          errorContext,
        );
        reportClientError(error, errorContext);
      }

      const errorMessage = getTransactionErrorMessage(
        error,
        "Unable to start the stream.",
      );
      if (notificationToastId == null) {
        showStreamError(error, "Unable to start the stream.");
      }
      if (showsTransactionModal && activeStep === "create") {
        setCreateTransaction({
          contractName: "Create Markee",
          message: errorMessage,
          status: "error",
        });
      }
      if (showsTransactionModal && activeStep === "update-message") {
        setMessageTransaction({
          contractName: "Update Markee message",
          message: errorMessage,
          status: "error",
        });
      }
      if (showsTransactionModal && activeStep === "update-name") {
        setNameTransaction({
          contractName: "Update Markee name",
          message: errorMessage,
          status: "error",
        });
      }
      if (showsTransactionModal && activeStep === "stream") {
        setStreamTransaction({
          contractName: "Start stream",
          message: errorMessage,
          status: "error",
        });
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStopStream = async () => {
    if (
      !isLive ||
      !hasActiveStream ||
      connectedAccount == null ||
      leaderboardAddress == null ||
      markeeChainId == null
    ) {
      return;
    }
    const originalChainId = connectedChain?.id;
    let actionWalletClient = walletClient;
    if (connectedChain?.id !== markeeChainId) {
      if (switchNetworkAsync == null) {
        showStreamError(
          null,
          "Switch your wallet to Ethereum Sepolia to stop streaming.",
        );
        return;
      }
      try {
        await switchNetworkAsync(markeeChainId);
        actionWalletClient = await getWalletClient({ chainId: markeeChainId });
      } catch (error) {
        showStreamError(error, "Unable to switch to Ethereum Sepolia.");
        return;
      }
    }
    if (publicClient == null || actionWalletClient == null) {
      showStreamError(null, "The Sepolia wallet client is not ready yet.");
      return;
    }

    setIsStoppingStream(true);
    toast.dismiss("markee-stream-error");
    let stopTransactionHash: `0x${string}` | undefined;
    let notificationToastId: string | undefined;
    try {
      const ethxResult = await publicClient.readContract({
        abi: streamingLeaderboardRuntimeABI,
        address: leaderboardAddress,
        functionName: "ETHX",
      });
      if (!isAddress(ethxResult)) {
        throw new Error("The Markee stream token is unavailable.");
      }

      notificationToastId = beginTransactionNotification(
        "Stop Markee stream",
        CFA_V1_FORWARDER_ADDRESS,
      );
      stopTransactionHash = await actionWalletClient.writeContract({
        abi: cfaV1ForwarderABI,
        address: CFA_V1_FORWARDER_ADDRESS,
        args: [getAddress(ethxResult), leaderboardAddress, 0n],
        functionName: "setFlowrate",
      });
      updateTransactionNotification(notificationToastId, {
        status: "loading",
        transactionHash: stopTransactionHash,
      });
      await restoreOriginalChain(originalChainId);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: stopTransactionHash,
      });
      if (receipt.status !== "success") {
        throw new Error("The stop-stream transaction reverted.");
      }

      setActiveStreamMarkee(null);
      setActiveStreamRate(0n);
      setExistingStreamDeposit(
        await publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          args: [connectedAccount],
          functionName: "backerDeposit",
        }),
      );
      onStreamUpdated();
      updateTransactionNotification(notificationToastId, {
        status: "success",
      });
    } catch (error) {
      if (notificationToastId != null) {
        updateTransactionNotification(notificationToastId, {
          error: getTransactionError(
            error,
            "Unable to stop the Markee stream.",
          ),
          status: "error",
        });
      }
      if (!isUserRejectedTransactionError(error)) {
        const errorContext = {
          type: "markee-transaction-error",
          step: "stop-stream",
          chainId: markeeChainId,
          connectedAccount,
          leaderboardAddress,
          targetMarkeeAddress: activeStreamMarkee,
          stopTransactionHash,
          tags: {
            error_type: "markee-transaction-error",
            transaction_step: "stop-stream",
            chain_id: markeeChainId,
          },
        };
        logOnce(
          "error",
          "[CommunityMarkee] Markee stream stop failed",
          error,
          errorContext,
        );
        reportClientError(error, errorContext);
      }
      if (notificationToastId == null) {
        showStreamError(error, "Unable to stop the Markee stream.");
      }
    } finally {
      setIsStoppingStream(false);
    }
  };

  const handleWithdrawStreamDeposit = async () => {
    if (
      !isLive ||
      connectedAccount == null ||
      leaderboardAddress == null ||
      markeeChainId == null ||
      withdrawableStreamDeposit <= 0n
    ) {
      return;
    }

    const originalChainId = connectedChain?.id;
    let actionWalletClient = walletClient;
    if (connectedChain?.id !== markeeChainId) {
      if (switchNetworkAsync == null) {
        showStreamError(
          null,
          "Switch to the Markee network to withdraw your deposit.",
        );
        return;
      }
      try {
        await switchNetworkAsync(markeeChainId);
        actionWalletClient = await getWalletClient({ chainId: markeeChainId });
      } catch (error) {
        showStreamError(error, "Unable to switch to the Markee network.");
        return;
      }
    }
    if (publicClient == null || actionWalletClient == null) {
      showStreamError(null, "The Markee wallet client is not ready yet.");
      return;
    }

    setIsWithdrawingStreamDeposit(true);
    toast.dismiss("markee-stream-error");
    let transactionHash: `0x${string}` | undefined;
    let notificationToastId: string | undefined;
    try {
      notificationToastId = beginTransactionNotification(
        "Withdraw Markee stream deposit",
        leaderboardAddress,
      );
      transactionHash = await actionWalletClient.writeContract({
        abi: streamingLeaderboardRuntimeABI,
        address: leaderboardAddress,
        functionName: "withdrawDeposit",
      });
      updateTransactionNotification(notificationToastId, {
        status: "loading",
        transactionHash,
      });
      await restoreOriginalChain(originalChainId);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
      });
      if (receipt.status !== "success") {
        throw new Error("The deposit-withdrawal transaction reverted.");
      }

      const [updatedDeposit, updatedRealtimeBalance] = await Promise.all([
        publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          args: [connectedAccount],
          functionName: "backerDeposit",
        }),
        ethxAddress == null ?
          Promise.resolve([
            ethxWalletBalance - ethxWalletDeficit,
            0n,
            0n,
            0n,
          ] as const)
        : publicClient.readContract({
            abi: ethxApproveABI,
            address: ethxAddress,
            args: [connectedAccount],
            functionName: "realtimeBalanceOfNow",
          }),
      ]);
      const updatedAvailableBalance = updatedRealtimeBalance[0];
      setExistingStreamDeposit(updatedDeposit);
      setEthxWalletBalance(
        updatedAvailableBalance > 0n ? updatedAvailableBalance : 0n,
      );
      setEthxWalletDeficit(
        updatedAvailableBalance < 0n ? -updatedAvailableBalance : 0n,
      );
      onStreamUpdated();
      updateTransactionNotification(notificationToastId, {
        status: "success",
      });
    } catch (error) {
      if (notificationToastId != null) {
        updateTransactionNotification(notificationToastId, {
          error: getTransactionError(
            error,
            "Unable to withdraw the Markee stream deposit.",
          ),
          status: "error",
        });
      }
      if (!isUserRejectedTransactionError(error)) {
        const errorContext = {
          type: "markee-transaction-error",
          step: "withdraw-stream-deposit",
          chainId: markeeChainId,
          connectedAccount,
          leaderboardAddress,
          targetMarkeeAddress: activeStreamMarkee,
          transactionHash,
          tags: {
            error_type: "markee-transaction-error",
            transaction_step: "withdraw-stream-deposit",
            chain_id: markeeChainId,
          },
        };
        logOnce(
          "error",
          "[CommunityMarkee] Markee stream deposit withdrawal failed",
          error,
          errorContext,
        );
        reportClientError(error, errorContext);
      }
      if (notificationToastId == null) {
        showStreamError(error, "Unable to withdraw the Markee stream deposit.");
      }
    } finally {
      setIsWithdrawingStreamDeposit(false);
    }
  };

  return (
    <>
      <CommunityStreamingMarkeeModal
        chainId={markeeChainId}
        currentMessage={message}
        currentName={topMarkeeName}
        currentRatePerSecondWei={topRatePerSecondWei}
        leaderboardAddress={leaderboardAddress}
        isOpen={isOpen}
        onClose={handleClose}
        title={
          isReviewingPayment ? "Review payment"
          : shouldCreateMarkee ?
            "Create your Markee"
          : hasActiveStream ?
            "Manage your Markee stream"
          : "Stream to your Markee"
        }
        topMarkeeAddress={topMarkeeAddress}
        footer={
          isPreviewComplete ?
            <Button
              btnStyle="filled"
              color="primary"
              className="w-full sm:w-auto"
              onClick={handleClose}
            >
              Done
            </Button>
          : isReviewingPayment ?
            <div className="flex w-full gap-3 sm:justify-end">
              <Button
                btnStyle="outline"
                color="secondary"
                className="w-full sm:w-auto"
                disabled={isStreaming}
                onClick={() => setIsReviewingPayment(false)}
              >
                Back
              </Button>
              <Button
                btnStyle="filled"
                color="primary"
                className="w-full sm:w-auto"
                disabled={
                  isStreaming ||
                  !canStartPreview ||
                  hasInsufficientWalletBalance ||
                  streamFormError != null ||
                  autoFundingError != null
                }
                isLoading={isStreaming}
                onClick={handleStartStream}
                tooltip={
                  streamFormError ??
                  autoFundingError ??
                  insufficientBalanceMessage ??
                  undefined
                }
                tooltipSide="tooltip-top-left"
              >
                Confirm payment
              </Button>
            </div>
          : <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                {canIntegrate && (
                  <Button
                    btnStyle="ghost"
                    color="secondary"
                    className="w-full sm:w-auto"
                    onClick={onIntegrate}
                  >
                    Integrate Markee
                  </Button>
                )}
                {hasActiveStream && (
                  <Button
                    btnStyle="outline"
                    color="danger"
                    className="w-full sm:w-auto"
                    disabled={
                      isStreaming ||
                      isStoppingStream ||
                      isWithdrawingStreamDeposit
                    }
                    isLoading={isStoppingStream}
                    onClick={handleStopStream}
                  >
                    Stop streaming
                  </Button>
                )}
              </div>
              <Button
                btnStyle="filled"
                color="primary"
                className="w-full sm:ml-auto sm:w-auto"
                disabled={
                  !canStartPreview ||
                  isStreaming ||
                  isStoppingStream ||
                  isWithdrawingStreamDeposit ||
                  isConnectedMarkeeLoading ||
                  isStreamPositionLoading ||
                  isStreamGasEstimateLoading ||
                  isStreamGasEstimatePending ||
                  hasInsufficientWalletBalance ||
                  streamFormError != null ||
                  autoFundingError != null ||
                  (isLive && connectedAccount == null)
                }
                isLoading={isStreaming}
                onClick={() => setIsReviewingPayment(true)}
                testId="markee-stream-preview-submit"
                tooltip={
                  isMarkeeMessageMissing ? "Add a message for your Markee."
                  : isStreamGasEstimatePending ?
                    "Estimating the network fee…"
                  : streamFormError ??
                    autoFundingError ??
                    insufficientBalanceMessage ??
                    undefined

                }
                tooltipClassName="flex justify-end text-left"
                tooltipSide="tooltip-top-left"
              >
                {(
                  isConnectedMarkeeLoading ||
                  isStreamPositionLoading ||
                  isStreamGasEstimatePending
                ) ?
                  "Checking your stream…"
                : isLive && connectedAccount == null ?
                  "Connect wallet"
                : "Review payment info"}
              </Button>
            </div>

        }
      >
        {isPreviewComplete ?
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <CheckCircleIcon className="h-16 w-16 text-primary-content" />
            <div>
              <h4 className="text-lg text-neutral-content">
                {shouldCreateMarkee ?
                  "Your Markee is ready"
                : "Your stream is ready"}
              </h4>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-soft-content">
                {isLive ?
                  !isTopMarkeeOwner ?
                    "Your Markee and Sepolia stream are active."
                  : "Your Sepolia stream is active."
                : "This is a temporary interaction preview. No transaction was sent."
                }
              </p>
            </div>
          </div>
        : isReviewingPayment ?
          <CommunityMarkeePaymentReview
            additionalToWin={
              additionalMonthlyRateToWin > 0n ?
                formatEthAmountRounded(additionalMonthlyRateToWin, 6)
              : undefined
            }
            depositAmount={
              streamAmounts.value > 0n ?
                formatEthAmountRounded(streamAmounts.value, 6)
              : undefined
            }
            message={paymentReviewMessage}
            monthlyRate={formatEthAmountRounded(derivedMonthlyRateAmount, 6)}
            runway={formatMarkeeRunwayShort(streamAmounts.runwaySeconds)}
            willWin={paymentReviewWillWin}
          />
        : <div className="flex flex-col gap-5">
            {shouldCreateMarkee ?
              newMarkeeMessageInput
            : ownedMarkeeAddress != null && (
                <div className="relative rounded-xl border border-neutral-content/15 bg-neutral/40 p-4">
                  {shouldShowOwnedMarkeeEditor ?
                    <div className="flex flex-col gap-3">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-neutral-soft-content">
                          Markee message
                        </span>
                        <textarea
                          className="textarea textarea-bordered min-h-24 w-full resize-none border-primary-content bg-primary-soft-dark font-mono shadow-[0_0_24px_rgb(var(--color-primary-content)/0.08)] outline-none focus:border-primary-content"
                          value={editedMessage}
                          onChange={(event) =>
                            setEditedMessage(event.target.value)
                          }
                          aria-label="Markee message"
                        />
                      </label>
                      <span
                        className={`text-xs ${messageByteLength > messageByteLimit ? "text-danger-content" : "text-neutral-soft-content"}`}
                      >
                        {messageByteLength}/{messageByteLimit}
                      </span>
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-neutral-soft-content">
                          Your name{" "}
                          <span className="normal-case text-neutral-content/40">
                            (optional)
                          </span>
                        </span>
                        <input
                          className="input input-bordered input-info w-full bg-primary-soft-dark outline-none"
                          value={editedName}
                          onChange={(event) =>
                            setEditedName(event.target.value)
                          }
                          placeholder="Your name"
                          aria-label="Your name"
                        />
                      </label>
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`text-xs ${nameByteLength > nameByteLimit ? "text-danger-content" : "text-neutral-soft-content"}`}
                        >
                          {nameByteLength}/{nameByteLimit}
                        </span>
                        {!ownedMarkeeHasEmptyMessage && (
                          <Button
                            btnStyle="ghost"
                            color="secondary"
                            onClick={() => {
                              setEditedMessage(displayedMarkeeMessage);
                              setEditedName(ownedMarkeeName);
                              setIsEditingMessage(false);
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  : <div>
                      <button
                        type="button"
                        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary-content transition-colors hover:bg-primary-content/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-content"
                        aria-label="Edit Markee message"
                        title="Edit message"
                        onClick={() => setIsEditingMessage(true)}
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <p className="text-xs uppercase tracking-wider text-neutral-soft-content">
                        Your Markee
                      </p>
                      <p className="mt-2 break-words font-mono text-lg text-neutral-content">
                        {displayedMarkeeMessage}
                      </p>
                      {ownedMarkeeName && (
                        <p className="mt-1 text-sm text-neutral-soft-content">
                          {ownedMarkeeName}
                        </p>
                      )}
                      {isLive &&
                        isOpen &&
                        connectedAccount != null &&
                        leaderboardAddress != null &&
                        markeeChainId != null &&
                        resolvedEthxAddress != null &&
                        ownedMarkeeAddress != null && (
                          <CommunityMarkeeStreamStats
                            activeRatePerSecond={activeStreamRate}
                            chainId={markeeChainId}
                            connectedAccount={connectedAccount}
                            ethxAddress={resolvedEthxAddress}
                            ethxBalance={ethxAvailableBalance}
                            isOpen={isOpen}
                            isWinning={isOwnedMarkeeWinning}
                            leaderboardAddress={leaderboardAddress}
                            markeeAddress={ownedMarkeeAddress}
                          />
                        )}
                    </div>
                  }
                </div>
              )
            }

            {isLive &&
              connectedAccount != null &&
              withdrawableStreamDeposit > 0n && (
                <div className="flex flex-col gap-3 rounded-xl border border-neutral-content/15 bg-neutral/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-soft-content">
                        Refundable deposit
                      </p>
                      <p
                        className="mt-1 truncate font-mono text-sm text-neutral-content"
                        title={`${formatEther(withdrawableStreamDeposit)} ETHx`}
                      >
                        {formatEthAmountRounded(withdrawableStreamDeposit, 6)}{" "}
                        ETHx
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-primary min-h-0 px-4 text-xs"
                      disabled={isWithdrawingStreamDeposit}
                      onClick={handleWithdrawStreamDeposit}
                    >
                      {isWithdrawingStreamDeposit ?
                        "Withdrawing…"
                      : "Withdraw deposit"}
                    </button>
                  </div>
                </div>
              )}

            <div className="flex flex-col gap-3 rounded-xl border border-primary-content bg-neutral/60 p-4">
              <div className="flex items-center justify-between gap-3 text-xs text-neutral-soft-content">
                <span className="font-medium uppercase tracking-wider">
                  Monthly rate
                </span>
                {isLive && (
                  <span>
                    Balance:{" "}
                    <span
                      className={`font-mono font-semibold ${hasInsufficientWalletBalance || streamFormError != null || autoFundingError != null ? "tooltip tooltip-top-left cursor-help" : "text-neutral-content"}`}
                      data-tip={
                        streamFormError ??
                        autoFundingError ??
                        insufficientBalanceMessage ??
                        undefined
                      }
                      tabIndex={
                        (
                          hasInsufficientWalletBalance ||
                          streamFormError != null ||
                          autoFundingError != null
                        ) ?
                          0
                        : undefined
                      }
                    >
                      {connectedAccount == null ?
                        "Connect wallet"
                      : isWalletBalanceLoading || isStreamPositionLoading ?
                        "Loading…"
                      : walletBalance ?
                        <span
                          title={`${formatEthAmount(walletBalance.value)} native ETH + ${formatEther(ethxAvailableBalance)} ETHx available`}
                        >
                          <span
                            className={
                              (
                                hasInsufficientWalletBalance ||
                                streamFormError != null ||
                                autoFundingError != null
                              ) ?
                                "text-danger-content"
                              : undefined
                            }
                          >
                            {ethxAvailableBalance > 0n ?
                              `${formatMarkeeEthxBalance(ethxAvailableBalance)} ETHx`
                            : `${formatEthAmount(walletBalance.value)} ETH`}
                          </span>{" "}
                        </span>
                      : "Unavailable"}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="tooltip tooltip-top-left min-w-0 flex-1 text-left"
                  data-tip={`${formatEther(derivedMonthlyRateAmount)} ETH / mo`}
                >
                  <input
                    inputMode="decimal"
                    className="w-full min-w-0 bg-transparent font-mono text-2xl font-semibold text-neutral-content outline-none"
                    value={
                      isMonthlyRateFocused ? monthlyRate : (
                        formatEthAmountRounded(derivedMonthlyRateAmount, 6)
                      )
                    }
                    onFocus={() => setIsMonthlyRateFocused(true)}
                    onBlur={() => setIsMonthlyRateFocused(false)}
                    onChange={(event) =>
                      setMonthlyRate(sanitizeAmount(event.target.value))
                    }
                    aria-label="Monthly streaming rate"
                  />
                </div>
                <span className="shrink-0 font-mono text-sm text-neutral-soft-content">
                  ETHx / mo
                </span>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={`h-8 rounded-lg border px-4 text-xs font-medium tracking-wide transition-colors ${derivedMonthlyRateAmount === effectiveMinimumMonthlyRateInputAmount ? "border-primary-content bg-primary-content/15 text-primary-content" : "border-neutral-content/30 text-neutral-soft-content hover:border-primary-content/60 hover:text-primary-content"}`}
                  onClick={() => setMonthlyRate(effectiveMinimumMonthlyRate)}
                >
                  MIN
                </button>
                {hasTopStream && (
                  <button
                    type="button"
                    className={`h-8 rounded-lg border border-primary-content bg-primary-content px-4 text-xs font-semibold tracking-wide text-neutral-inverted-content shadow-sm transition-all hover:bg-primary-hover-content ${derivedMonthlyRateAmount === (isOwnedMarkeeWinning ? doubleWinningMonthlyRateAmount : challengeMonthlyRateAmount) ? "ring-2 ring-primary-content/30 ring-offset-2 ring-offset-neutral" : ""}`}
                    onClick={() =>
                      setMonthlyRate(
                        isOwnedMarkeeWinning ?
                          doubleWinningMonthlyRate
                        : challengeMonthlyRate,
                      )
                    }
                  >
                    {isOwnedMarkeeWinning ? "2x" : "WIN"}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-neutral-soft-content">
                <span
                  className="tooltip tooltip-top cursor-help text-left"
                  data-tip={
                    hasTopStream ?
                      `${isOwnedMarkeeWinning ? doubleWinningMonthlyRate : challengeMonthlyRate} ETH/mo`
                    : `${effectiveMinimumMonthlyRate} ETH/mo`
                  }
                >
                  {hasTopStream ?
                    isOwnedMarkeeWinning ?
                      `2x streams ${formatEthAmountRounded(doubleWinningMonthlyRateAmount, 6)} ETH/mo`
                    : `WIN streams ${formatEthAmountRounded(challengeMonthlyRateAmount, 6)} ETH/mo`

                  : `Minimum ${formatEthAmountRounded(effectiveMinimumMonthlyRateInputAmount, 6)} ETH/mo`
                  }
                </span>
                <span>You can stop anytime</span>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-neutral-content/15 pt-3 font-mono text-xs text-neutral-soft-content">
                <button
                  type="button"
                  className="font-semibold text-primary-content transition-colors hover:text-primary-hover-content"
                  disabled={ethxAddress == null || connectedAccount == null}
                  onClick={() => setIsDepositManagerOpen(true)}
                >
                  Deposit Manager →
                </button>
                {streamAmounts.value > 0n ?
                  <span
                    className="tooltip tooltip-top-left cursor-help text-right text-sm font-semibold text-neutral-content"
                    data-tip={`This transaction deposits ${formatEther(streamAmounts.value)} ETH as ETHx, giving the stream approximately ${formatMarkeeRunwayShort(streamAmounts.runwaySeconds)} of runway.`}
                  >
                    {formatEthAmountRounded(streamAmounts.value, 6)} ETH deposit
                  </span>
                : <span
                    className="tooltip tooltip-top-left cursor-help text-right text-sm font-semibold text-neutral-content"
                    data-tip={`This ETHx balance gives the stream approximately ${formatMarkeeRunwayShort(streamAmounts.runwaySeconds)} of runway. Use Deposit Manager to add more.`}
                  >
                    {formatMarkeeRunwayShort(streamAmounts.runwaySeconds)}
                  </span>
                }
              </div>

              {isBelowMinimum && (
                <span className="text-xs text-danger-content">
                  The minimum rate is {effectiveMinimumMonthlyRate} ETH per
                  month.
                </span>
              )}
            </div>
          </div>
        }
      </CommunityStreamingMarkeeModal>
      {markeeChainId != null && ethxAddress != null && (
        <CommunityMarkeeDepositManagerModal
          activeRatePerSecond={activeStreamRate}
          chainId={markeeChainId}
          ethxAddress={ethxAddress}
          ethxBalance={ethxAvailableBalance}
          isOpen={isDepositManagerOpen}
          onBalancesChanged={() =>
            setStreamPositionRefreshKey((current) => current + 1)
          }
          onClose={() => setIsDepositManagerOpen(false)}
        />
      )}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        label={
          showCreateTransaction ? "Create and stream"
          : showMessageTransaction || showNameTransaction ?
            hasActiveStream ?
              "Save and replace stream"
            : "Save and stream"
          : hasActiveStream ?
            "Replace stream"
          : "Start stream"
        }
        onClose={() => {
          setIsTransactionModalOpen(false);
          setTransactionNotification(null);
        }}
        showTransactionCount
        testId="markee-stream-transactions"
        transactions={[
          ...(showCreateTransaction ? [createTransaction] : []),
          ...(showMessageTransaction ? [messageTransaction] : []),
          ...(showNameTransaction ? [nameTransaction] : []),
          streamTransaction,
        ]}
      />
    </>
  );
}

function CommunityRevenueClaimModal({
  availableRevenueWei,
  chainId,
  community,
  councilSafe,
  isOpen,
  markeeChainId,
  onClose,
  onClaimSuccess,
  onPendingClaimChange,
}: {
  availableRevenueWei?: string;
  chainId?: number;
  community: Address;
  councilSafe?: Address;
  isOpen: boolean;
  markeeChainId?: number;
  onClose: () => void;
  onClaimSuccess: () => Promise<unknown>;
  onPendingClaimChange: (isPending: boolean) => void;
}) {
  const [isClaimComplete, setIsClaimComplete] = useState(false);
  const [claimTransactionUrl, setClaimTransactionUrl] = useState<string | null>(
    null,
  );
  const [claimBridgeName, setClaimBridgeName] = useState<string | null>(null);
  const [claimTransactionHash, setClaimTransactionHash] = useState<
    `0x${string}` | null
  >(null);
  const [bridgeStatus, setBridgeStatus] =
    useState<MarkeeClaimBridgeStatusResponse | null>(null);
  const [bridgeStatusError, setBridgeStatusError] = useState(false);
  const [estimatedRouteDurationSeconds, setEstimatedRouteDurationSeconds] =
    useState<number | null>(null);
  const [claimSourceChainId, setClaimSourceChainId] = useState<number | null>(
    null,
  );
  const [claimStatus, setClaimStatus] = useState<AuthorizationStatus>("idle");
  const [quote, setQuote] = useState<MarkeeClaimQuoteResponse | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [isQuoteTimedOut, setIsQuoteTimedOut] = useState(false);
  const [isRecipientCopied, setIsRecipientCopied] = useState(false);
  const { address: connectedAccount, connector } = useAccount();
  const { chain: connectedChain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const claimAmountWei = quote ? BigInt(quote.claimAmount) : 0n;
  const displayedClaimAmountWei =
    quote != null ? claimAmountWei
    : availableRevenueWei != null && /^\d+$/u.test(availableRevenueWei) ?
      BigInt(availableRevenueWei)
    : null;
  const bridgeFeeAmountWei = quote ? BigInt(quote.estimatedFeeAmount) : 0n;
  const networkFeeAmountWei =
    quote ? BigInt(quote.estimatedNetworkFeeAmount) : 0n;
  const effectiveMarkeeChainId =
    claimSourceChainId ?? quote?.markeeChainId ?? markeeChainId;
  const isBridgedClaim =
    quote?.bridged ??
    (chainId != null &&
      effectiveMarkeeChainId != null &&
      chainId !== effectiveMarkeeChainId);
  const claimRecipient = quote?.recipient ?? councilSafe;
  const communityChainName =
    chainId != null ?
      chainConfigMap[chainId]?.name ?? `chain ${chainId}`
    : "the community chain";
  const estimatedFeeAmountWei = isBridgedClaim ? bridgeFeeAmountWei : 0n;
  const totalFeeAmountWei = estimatedFeeAmountWei + networkFeeAmountWei;
  const amountReceivedWei =
    quote != null ? BigInt(quote.expectedAmountOut) : 0n;
  const transactionFeePercentage =
    claimAmountWei > 0n ?
      (Number(totalFeeAmountWei) / Number(claimAmountWei)) * 100
    : 0;
  const transactionFeePercentageLabel =
    transactionFeePercentage > 100 ? ">100%"
    : Number.isFinite(transactionFeePercentage) ?
      `${transactionFeePercentage.toFixed(2)}%`
    : ">100%";
  const hasClaimableRevenue = claimAmountWei > 0n;
  const areClaimFeesAboveRevenue =
    quote != null && totalFeeAmountWei >= claimAmountWei;
  const isFeeAboveTenPercent =
    claimAmountWei > 0n ?
      totalFeeAmountWei * 10n > claimAmountWei
    : totalFeeAmountWei > 0n;
  const isFeeAtLeastFivePercent =
    claimAmountWei > 0n && totalFeeAmountWei * 20n >= claimAmountWei;
  const feeTextClass =
    isFeeAboveTenPercent ? "text-danger-content"
    : isFeeAtLeastFivePercent ? "text-warning-content"
    : "text-primary-content";
  const isAuthorizingClaim =
    claimStatus === "requesting" ||
    claimStatus === "signing" ||
    claimStatus === "verifying";
  const isQuotePending = quote == null && !isQuoteTimedOut;

  useEffect(() => {
    if (!isOpen) return;

    const pendingClaim = readPendingMarkeeClaim(chainId, community);
    if (pendingClaim == null) return;

    setClaimBridgeName(pendingClaim.bridgeName);
    setClaimTransactionHash(pendingClaim.transactionHash);
    setClaimTransactionUrl(pendingClaim.transactionUrl);
    setClaimSourceChainId(pendingClaim.fromChainId);
    setEstimatedRouteDurationSeconds(
      pendingClaim.estimatedRouteDurationSeconds,
    );
    setBridgeStatus(null);
    setBridgeStatusError(false);
    setClaimError(null);
    setClaimStatus("authorized");
    setIsClaimComplete(true);
  }, [chainId, community, isOpen]);

  const refreshClaimQuote = useCallback(
    async (signal: AbortSignal, showLoading: boolean) => {
      if (chainId == null) return;

      const params = new URLSearchParams({
        chainId: chainId.toString(),
        community,
      });

      if (showLoading) setIsQuoteLoading(true);
      try {
        const refreshedQuote = await fetchMarkeeJson<MarkeeClaimQuoteResponse>(
          `/api/markee/claim/quote?${params.toString()}`,
          signal,
        );
        setQuote(refreshedQuote);
        setIsQuoteTimedOut(false);
        setClaimError((currentError) =>
          currentError === CLAIM_QUOTE_CHANGED_MESSAGE ? null : currentError,
        );
        return refreshedQuote;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        logOnce(
          "warn",
          "[CommunityMarkee] Unable to load the claim quote",
          error,
        );
      } finally {
        if (showLoading && !signal.aborted) setIsQuoteLoading(false);
      }
    },
    [chainId, community],
  );

  useEffect(() => {
    if (!isOpen || isClaimComplete || quote != null) return;

    setIsQuoteTimedOut(false);
    const quoteTimeout = window.setTimeout(
      () => setIsQuoteTimedOut(true),
      60_000,
    );

    return () => window.clearTimeout(quoteTimeout);
  }, [isClaimComplete, isOpen, quote]);

  useEffect(() => {
    if (!isOpen || chainId == null || isClaimComplete || isAuthorizingClaim) {
      return;
    }

    const controller = new AbortController();
    let refreshTimeout: ReturnType<typeof setTimeout> | undefined;

    const refresh = async (showLoading: boolean) => {
      const refreshedQuote = await refreshClaimQuote(
        controller.signal,
        showLoading,
      );
      if (!controller.signal.aborted) {
        const refreshDelay =
          refreshedQuote != null ?
            Math.max(refreshedQuote.expiresAt * 1_000 - Date.now(), 1_000)
          : 5_000;
        refreshTimeout = setTimeout(() => void refresh(false), refreshDelay);
      }
    };

    void refresh(true);

    return () => {
      controller.abort();
      if (refreshTimeout != null) clearTimeout(refreshTimeout);
    };
  }, [chainId, isAuthorizingClaim, isClaimComplete, isOpen, refreshClaimQuote]);

  useEffect(() => {
    if (
      !isOpen ||
      !isClaimComplete ||
      claimBridgeName !== "Squid" ||
      claimTransactionHash == null ||
      effectiveMarkeeChainId == null ||
      chainId == null
    ) {
      return;
    }

    const controller = new AbortController();
    let refreshTimeout: ReturnType<typeof setTimeout> | undefined;
    const terminalStatuses = new Set<MarkeeClaimBridgeStatusResponse["status"]>(
      ["success", "needs_gas", "partial_success", "refund"],
    );

    const refreshStatus = async () => {
      let shouldRefresh = true;
      try {
        const params = new URLSearchParams({
          fromChainId: effectiveMarkeeChainId.toString(),
          toChainId: chainId.toString(),
          transactionHash: claimTransactionHash,
        });
        const nextStatus =
          await fetchMarkeeJson<MarkeeClaimBridgeStatusResponse>(
            `/api/markee/claim/status?${params.toString()}`,
            controller.signal,
          );
        setBridgeStatus(nextStatus);
        setBridgeStatusError(false);
        if (nextStatus.axelarTransactionUrl != null) {
          setClaimTransactionUrl(nextStatus.axelarTransactionUrl);
        }
        if (nextStatus.status === "success") {
          clearPendingMarkeeClaim(chainId, community);
          onPendingClaimChange(false);
        }
        shouldRefresh = !terminalStatuses.has(nextStatus.status);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        logOnce(
          "warn",
          "[CommunityMarkee] Unable to refresh the Squid bridge status",
          error,
        );
        setBridgeStatusError(true);
      }

      if (!controller.signal.aborted && shouldRefresh) {
        refreshTimeout = setTimeout(() => void refreshStatus(), 5_000);
      }
    };

    void refreshStatus();

    return () => {
      controller.abort();
      if (refreshTimeout != null) clearTimeout(refreshTimeout);
    };
  }, [
    chainId,
    claimBridgeName,
    claimTransactionHash,
    community,
    effectiveMarkeeChainId,
    isClaimComplete,
    isOpen,
    onPendingClaimChange,
  ]);

  const handleClose = () => {
    setIsClaimComplete(false);
    setClaimBridgeName(null);
    setClaimTransactionHash(null);
    setClaimTransactionUrl(null);
    setBridgeStatus(null);
    setBridgeStatusError(false);
    setEstimatedRouteDurationSeconds(null);
    setClaimSourceChainId(null);
    setQuote(null);
    setClaimError(null);
    setIsQuoteTimedOut(false);
    setIsRecipientCopied(false);
    setClaimStatus("idle");
    onClose();
  };

  const handleClaimAuthorization = async () => {
    if (
      connectedAccount == null ||
      connector == null ||
      chainId == null ||
      councilSafe == null ||
      quote == null ||
      !hasClaimableRevenue ||
      areClaimFeesAboveRevenue
    ) {
      return;
    }

    const originalChainId = connectedChain?.id;
    setClaimStatus("requesting");
    setClaimBridgeName(null);
    setClaimTransactionHash(null);
    setClaimTransactionUrl(null);
    setBridgeStatus(null);
    setBridgeStatusError(false);
    setEstimatedRouteDurationSeconds(null);
    setClaimSourceChainId(null);
    setClaimError(null);

    try {
      if (connectedChain?.id !== chainId) {
        if (switchNetworkAsync == null) {
          throw new Error(
            `Switch your wallet to ${communityChainName} to continue.`,
          );
        }
        await switchNetworkAsync(chainId);
      }

      const challenge = await postClaimAuthorization<ChallengeResponse>({
        account: connectedAccount,
        action: "challenge",
        chainId,
        community,
      });
      if (challenge.nonce.length === 0) {
        throw new Error(
          "The claim authorization API returned an invalid challenge.",
        );
      }
      const challengeClaimAmountValue = challenge.typedData.message.claimAmount;
      const challengeGasCost = challenge.typedData.message.gasCost;
      const challengeRecipient = challenge.typedData.message.recipient;
      if (
        typeof challengeClaimAmountValue !== "string" ||
        typeof challengeGasCost !== "string" ||
        typeof challengeRecipient !== "string"
      ) {
        throw new Error(
          "The claim authorization API returned invalid claim details.",
        );
      }
      const challengeClaimAmount = BigInt(challengeClaimAmountValue);
      const quotedClaimAmount = BigInt(quote.claimAmount);
      const isSameChainClaim = quote.markeeChainId === chainId;
      const claimAmountIsInvalid =
        isSameChainClaim ?
          challengeClaimAmount < quotedClaimAmount
        : challengeClaimAmount !== quotedClaimAmount;
      if (
        claimAmountIsInvalid ||
        challengeGasCost !== quote.estimatedNetworkFeeAmount ||
        challenge.typedData.message.maxFeeAmount !== quote.estimatedFeeAmount ||
        challenge.typedData.message.markeeChainId !==
          quote.markeeChainId.toString() ||
        challengeRecipient.toLowerCase() !== quote.recipient.toLowerCase()
      ) {
        throw new Error(CLAIM_QUOTE_CHANGED_MESSAGE);
      }
      if (isSameChainClaim && challengeClaimAmount > quotedClaimAmount) {
        setQuote((currentQuote) =>
          currentQuote == null ? currentQuote : (
            {
              ...currentQuote,
              claimAmount: challengeClaimAmount.toString(),
              expectedAmountOut: (
                challengeClaimAmount - BigInt(challengeGasCost)
              ).toString(),
            }
          ),
        );
      }

      setClaimStatus("signing");
      const signature = await signTypedDataWithProvider({
        account: connectedAccount,
        connector,
        typedData: challenge.typedData,
      });
      if (
        originalChainId != null &&
        originalChainId !== chainId &&
        switchNetworkAsync != null
      ) {
        try {
          await switchNetworkAsync(originalChainId);
        } catch (error) {
          logOnce(
            "warn",
            "[CommunityMarkee] Unable to restore the original wallet chain after claim authorization",
            error,
          );
          toast.warn(
            "Authorization signed, but your wallet could not switch back to the original network.",
            { toastId: "markee-network-restore-warning" },
          );
        }
      }

      setClaimStatus("verifying");
      const verification = await postClaimAuthorization<VerifyResponse>({
        action: "verify",
        nonce: challenge.nonce,
        signature,
      });
      if (!verification.authorized) {
        throw new Error("The claim authorization was not accepted.");
      }

      setClaimTransactionUrl(verification.transactionUrl ?? null);
      setClaimTransactionHash(verification.transactionHash ?? null);
      setClaimBridgeName(verification.bridgeName ?? null);
      setClaimSourceChainId(quote.markeeChainId);
      setEstimatedRouteDurationSeconds(
        verification.estimatedRouteDurationSeconds ??
          quote.estimatedRouteDurationSeconds ??
          null,
      );
      if (
        verification.bridgeName === "Squid" &&
        verification.transactionHash != null &&
        quote.bridged
      ) {
        const wasPendingClaimSaved = writePendingMarkeeClaim(
          chainId,
          community,
          {
            bridgeName: "Squid",
            createdAt: Date.now(),
            estimatedRouteDurationSeconds:
              verification.estimatedRouteDurationSeconds ??
              quote.estimatedRouteDurationSeconds ??
              null,
            fromChainId: quote.markeeChainId,
            toChainId: chainId,
            transactionHash: verification.transactionHash,
            transactionUrl: verification.transactionUrl ?? null,
            version: 1,
          },
        );
        onPendingClaimChange(wasPendingClaimSaved);
      }
      setClaimStatus("authorized");
      setIsClaimComplete(true);
      void onClaimSuccess().catch((error: unknown) => {
        logOnce(
          "warn",
          "[CommunityMarkee] Unable to refresh community revenue after claim",
          error,
        );
      });
    } catch (error) {
      setClaimStatus("idle");
      if (!isUserRejectedTransactionError(error)) {
        logOnce("error", "[CommunityMarkee] Claim authorization failed", error);
        setClaimError(
          getTransactionErrorMessage(
            error,
            "The community revenue claim could not be completed.",
          ),
        );
      }
    }
  };

  const isTrackedSquidClaim =
    isClaimComplete &&
    claimBridgeName === "Squid" &&
    claimTransactionHash != null;
  const squidDeliveryStatus = bridgeStatus?.status ?? "ongoing";
  const squidDeliveryIsComplete = squidDeliveryStatus === "success";
  const squidDeliveryNeedsAttention =
    squidDeliveryStatus === "needs_gas" ||
    squidDeliveryStatus === "partial_success" ||
    squidDeliveryStatus === "refund";
  const squidStatusTitle =
    squidDeliveryStatus === "success" ? "Revenue delivered"
    : squidDeliveryStatus === "needs_gas" ? "Bridge needs gas"
    : squidDeliveryStatus === "partial_success" ? "Bridge partially completed"
    : squidDeliveryStatus === "refund" ? "Bridge refunded"
    : "Bridge in progress";
  const squidStatusDescription =
    squidDeliveryStatus === "success" ?
      "Squid delivered the community revenue to the council Safe."
    : squidDeliveryStatus === "needs_gas" ?
      "Destination execution needs more gas. Open the Squid transaction for the available recovery action."
    : squidDeliveryStatus === "partial_success" ?
      "The bridge reached the destination chain, but its final action did not complete. Open the Squid transaction for details."
    : squidDeliveryStatus === "refund" ?
      "Squid refunded the bridge transaction on the source chain."
    : squidDeliveryStatus === "not_found" ?
      "The source transaction is confirmed. Waiting for Squid to index the bridge."
    : "The source transaction is confirmed. Squid is delivering the revenue to the council Safe.";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="small"
      title="Claim community revenue"
      icon={<BanknotesIcon className="h-7 w-7 text-primary-content" />}
      testId="markee-community-claim"
      footer={
        isClaimComplete ?
          <Button
            btnStyle="filled"
            color="primary"
            className="w-full sm:w-auto"
            onClick={handleClose}
          >
            Close
          </Button>
        : <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              btnStyle="ghost"
              color="secondary"
              className="w-full sm:w-auto"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              btnStyle="filled"
              color="primary"
              className="w-full sm:w-auto"
              disabled={
                councilSafe == null ||
                connectedAccount == null ||
                connector == null ||
                chainId == null ||
                quote == null ||
                isQuoteLoading ||
                !hasClaimableRevenue ||
                areClaimFeesAboveRevenue
              }
              isLoading={isAuthorizingClaim}
              onClick={handleClaimAuthorization}
              testId="markee-community-claim-submit"
              tooltip={
                !hasClaimableRevenue && quote != null ?
                  "There is no community revenue available to claim."
                : areClaimFeesAboveRevenue ?
                  "Claim costs exceed the available community revenue."
                : undefined
              }
              tooltipClassName="flex justify-end text-left"
              tooltipSide="tooltip-top-left"
            >
              Claim to council Safe
            </Button>
          </div>
      }
    >
      {isClaimComplete ?
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          {isTrackedSquidClaim && !squidDeliveryIsComplete ?
            squidDeliveryNeedsAttention ?
              <ExclamationTriangleIcon className="h-16 w-16 text-warning-content" />
            : <span className="loading loading-spinner loading-lg text-primary-content" />

          : <CheckCircleIcon className="h-16 w-16 text-primary-content" />}
          <div>
            <h4 className="text-lg text-neutral-content">
              {isTrackedSquidClaim ? squidStatusTitle : "Revenue claimed"}
            </h4>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-soft-content">
              {isTrackedSquidClaim ?
                squidStatusDescription
              : quote?.bridged ?
                `The claim transaction was confirmed. ${claimBridgeName ?? "The bridge"} is delivering the revenue to the council Safe.`
              : "The community revenue was sent to the council Safe."}
            </p>
            {isTrackedSquidClaim &&
              estimatedRouteDurationSeconds != null &&
              !squidDeliveryIsComplete && (
                <p className="mt-2 text-xs text-neutral-soft-content">
                  Estimated route time:{" "}
                  {formatBridgeDuration(estimatedRouteDurationSeconds)}
                  {bridgeStatus?.elapsedTimeSeconds != null ?
                    ` · ${formatBridgeDuration(bridgeStatus.elapsedTimeSeconds)} elapsed`
                  : ""}
                </p>
              )}
            {isTrackedSquidClaim && bridgeStatusError && (
              <p className="mt-2 max-w-sm text-xs text-warning-content">
                Live status is temporarily unavailable. Retrying automatically…
              </p>
            )}
            {claimTransactionUrl && (
              <a
                href={claimTransactionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-content underline underline-offset-4"
              >
                {claimBridgeName != null ?
                  `View ${claimBridgeName} transaction`
                : "View transaction"}
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </a>
            )}
            {isTrackedSquidClaim &&
              bridgeStatus?.destinationTransactionUrl != null && (
                <a
                  href={bridgeStatus.destinationTransactionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-1.5 text-sm font-medium text-primary-content underline underline-offset-4"
                >
                  View destination transaction
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              )}
          </div>
        </div>
      : <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-content/15 bg-neutral/30 px-4 py-3 text-sm">
            <span className="text-neutral-soft-content">Recipient</span>
            {claimRecipient != null ?
              <span className="flex items-center gap-2 text-neutral-content">
                <span className="inline-flex items-baseline gap-2">
                  <span>Council Safe</span>
                  <span className="font-mono text-xs">
                    {formatAddress(claimRecipient)}
                  </span>
                </span>
                <button
                  type="button"
                  className="tooltip rounded-md p-1 text-neutral-soft-content transition-colors hover:bg-neutral/20 hover:text-neutral-content"
                  data-tip={isRecipientCopied ? "Copied" : "Copy address"}
                  aria-label={
                    isRecipientCopied ?
                      "Council Safe address copied"
                    : "Copy council Safe address"
                  }
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(claimRecipient);
                      setIsRecipientCopied(true);
                      window.setTimeout(
                        () => setIsRecipientCopied(false),
                        1500,
                      );
                    } catch (error) {
                      logOnce(
                        "warn",
                        "[CommunityMarkee] Unable to copy the council Safe address",
                        error,
                      );
                    }
                  }}
                  data-testid="markee-community-claim-copy-recipient"
                >
                  {isRecipientCopied ?
                    <CheckIcon className="h-4 w-4" />
                  : <ClipboardDocumentIcon className="h-4 w-4" />}
                </button>
              </span>
            : <span className="text-neutral-soft-content">Unavailable</span>}
          </div>

          {claimError && (
            <div role="alert">
              <InfoBox
                infoBoxType="error"
                className="rounded-xl px-4 py-3"
                title="Claim unsuccessful"
                content={claimError}
              />
            </div>
          )}

          <div
            className="rounded-xl border border-neutral-content/15 bg-neutral/30 p-5 text-center"
            aria-busy={isQuotePending}
          >
            <p className="text-xs uppercase tracking-wider text-neutral-soft-content">
              Available community revenue
            </p>
            <div className="mt-2 flex min-h-9 items-center justify-center font-mono text-3xl font-semibold text-neutral-content">
              {displayedClaimAmountWei != null ?
                `${formatEthAmount(displayedClaimAmountWei)} ${quote?.symbol ?? "ETH"}`
              : isQuotePending ?
                <div
                  aria-hidden="true"
                  className="skeleton h-9 w-36 rounded-md [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#353535]"
                />
              : "Unavailable"}
            </div>
          </div>

          {displayedClaimAmountWei !== 0n && (
            <div
              className="flex flex-col gap-3 rounded-xl border border-neutral-content/15 bg-neutral/30 p-4 font-mono text-xs"
              aria-busy={isQuotePending}
            >
              <div className="flex items-center justify-between gap-4 text-neutral-soft-content">
                <div className="-mx-1">
                  <InfoWrapper
                    tooltip={
                      quote != null && isBridgedClaim ?
                        `Transaction gas: ${formatEthAmount(networkFeeAmountWei)} ${quote.symbol} · Bridge fee: ${formatEthAmount(estimatedFeeAmountWei)} ${quote.symbol}`
                      : quote != null ?
                        `Transaction gas: ${formatEthAmount(networkFeeAmountWei)} ${quote.symbol}`
                      : isBridgedClaim ?
                        "Includes the source-chain transaction gas and the estimated bridge fee."
                      : "Includes the source-chain transaction gas."
                    }
                    size="sm"
                    className="tooltip-top"
                  >
                    <span>
                      {isBridgedClaim ?
                        "Transaction gas + Bridge fee"
                      : "Transaction gas"}
                    </span>
                  </InfoWrapper>
                </div>
                <span className={quote != null ? feeTextClass : undefined}>
                  {quote != null ?
                    `${formatEthAmount(totalFeeAmountWei)} ${quote.symbol} (${transactionFeePercentageLabel})`
                  : isQuotePending ?
                    <span
                      aria-hidden="true"
                      className="skeleton block h-4 w-28 rounded-md [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#353535]"
                    />
                  : <span className="text-danger-content">No quote found</span>}
                </span>
              </div>
              <div className="border-t border-neutral-content/15" />
              <div className="flex items-center justify-between gap-4 text-neutral-soft-content">
                <span>Council Safe receives</span>
                <span className="text-sm font-semibold text-primary-content">
                  {quote ?
                    `${formatEthAmount(amountReceivedWei)} ${quote.destinationSymbol}`
                  : isQuotePending ?
                    <span
                      aria-hidden="true"
                      className="skeleton block h-5 w-24 rounded-md [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#353535]"
                    />
                  : "—"}
                </span>
              </div>
            </div>
          )}

          {isQuotePending && (
            <span className="sr-only" role="status">
              Loading claim quote
            </span>
          )}
        </div>
      }
    </Modal>
  );
}

export function CommunityMarkeePlaceholder({
  canOptIn,
  chainId,
  community,
  councilSafe,
}: Props) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [hasPendingClaim, setHasPendingClaim] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isOptInTransactionModalOpen, setIsOptInTransactionModalOpen] =
    useState(false);
  const [isCouncilSafeCopied, setIsCouncilSafeCopied] = useState(false);
  const [markee, setMarkee] = useState<CommunityMarkeeResponse | null>(null);
  const [totalViews, setTotalViews] = useState<number | null>(null);
  const [authorizationStatus, setAuthorizationStatus] =
    useState<AuthorizationStatus>("idle");
  const [optInTransactionNotification, setOptInTransactionNotification] =
    useState<MarkeeTransactionNotification | null>(null);
  const optInTransactionAttempt = useRef(0);
  const { address: connectedAccount, connector } = useAccount();
  const { chain: connectedChain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const isConnectedCouncilSafe =
    councilSafe != null &&
    connectedAccount != null &&
    councilSafe.toLowerCase() === connectedAccount.toLowerCase();
  const isAuthorizing =
    authorizationStatus === "requesting" ||
    authorizationStatus === "signing" ||
    authorizationStatus === "verifying";
  const hasActiveMarkee = markee?.integration.status === "active";
  const displayedMessage =
    hasActiveMarkee ?
      markee.leaderboard.message || "No message yet"
    : "This is a sign";
  const isConnectedTopMarkeeOwner =
    connectedAccount != null &&
    markee?.leaderboard.topMarkeeOwner != null &&
    connectedAccount.toLowerCase() ===
      markee.leaderboard.topMarkeeOwner.toLowerCase();
  const topMarkeeChallengeRate =
    markee != null ?
      BigInt(markee.leaderboard.topRate) * MARKEE_SECONDS_IN_MONTH +
      parseEther("0.01")
    : 0n;
  const signHint =
    !hasActiveMarkee ? "Integrate markee to this community"
    : connectedAccount != null && !isConnectedTopMarkeeOwner ?
      `Stream ${formatEthAmountRoundedUp(topMarkeeChallengeRate, 3)} ETH/mo to change`
    : "Stream to this sign";

  useEffect(() => {
    setHasPendingClaim(readPendingMarkeeClaim(chainId, community) != null);
  }, [chainId, community]);

  useTransactionNotification({
    chainId: markee?.markeeChainId ?? chainId,
    contractName: optInTransactionNotification?.contractName,
    enabled: optInTransactionNotification != null,
    fallbackErrorMessage: "Unable to create the community Markee leaderboard.",
    safeAddress: connectedAccount,
    targetAddress: optInTransactionNotification?.targetAddress,
    toastId: optInTransactionNotification?.toastId,
    transactionData:
      optInTransactionNotification?.transactionHash != null ?
        { hash: optInTransactionNotification.transactionHash }
      : undefined,
    transactionError: optInTransactionNotification?.error,
    transactionHash: optInTransactionNotification?.transactionHash,
    transactionStatus: optInTransactionNotification?.status,
    watchTransaction: true,
  });

  const refreshMarkee = useCallback(
    async (signal?: AbortSignal) => {
      if (chainId == null) return;
      const params = new URLSearchParams({
        chainId: chainId.toString(),
        community,
      });
      const result = await fetchMarkeeJson<CommunityMarkeeResponse>(
        `/api/markee/community?${params.toString()}`,
        signal,
      );
      setMarkee(result);
      return result;
    },
    [chainId, community],
  );

  const refreshMarkeeUntilActive = useCallback(async () => {
    const maxAttempts = 6;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const refreshedMarkee = await refreshMarkee();
        if (refreshedMarkee?.integration.status === "active") return;
      } catch (error) {
        lastError = error;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }

    if (lastError != null) {
      throw getTransactionError(
        lastError,
        "Unable to refresh the new Markee community integration.",
      );
    }
  }, [refreshMarkee]);

  useEffect(() => {
    if (chainId == null) return;

    const controller = new AbortController();
    let refreshTimeout: ReturnType<typeof setTimeout> | undefined;

    const refresh = async () => {
      try {
        await refreshMarkee(controller.signal);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Unable to load Markee community status", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          refreshTimeout = setTimeout(refresh, 5_000);
        }
      }
    };

    void refresh();

    return () => {
      controller.abort();
      if (refreshTimeout != null) clearTimeout(refreshTimeout);
    };
  }, [chainId, refreshMarkee]);

  useEffect(() => {
    const topMarkeeAddress = markee?.leaderboard.topMarkeeAddress;
    const message = markee?.leaderboard.message.trim();

    if (!hasActiveMarkee || topMarkeeAddress == null || !message) {
      setTotalViews(null);
      return;
    }

    let cancelled = false;
    void recordMarkeeView(topMarkeeAddress, message)
      .then(({ totalViews: nextTotalViews }) => {
        if (!cancelled) setTotalViews(nextTotalViews);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    hasActiveMarkee,
    markee?.leaderboard.message,
    markee?.leaderboard.topMarkeeAddress,
  ]);

  if (markee == null || (!hasActiveMarkee && !canOptIn)) return null;

  const handleAuthorize = async () => {
    if (
      !isConnectedCouncilSafe ||
      connectedAccount == null ||
      connector == null ||
      chainId == null
    ) {
      return;
    }

    const originalChainId = connectedChain?.id;
    setAuthorizationStatus("requesting");
    optInTransactionAttempt.current += 1;
    const toastId = `markee-opt-in-${optInTransactionAttempt.current}`;
    let activeStep: "challenge" | "execute" | "sign" = "challenge";
    let transactionHash: `0x${string}` | undefined;
    let router: Address | undefined;
    setOptInTransactionNotification({
      contractName: "Create Markee leaderboard",
      status: "waiting",
      toastId,
    });

    try {
      if (connectedChain?.id !== chainId) {
        if (switchNetworkAsync == null) {
          throw new Error(
            `Switch your wallet to ${chainConfigMap[chainId]?.name ?? `chain ${chainId}`} to continue.`,
          );
        }
        await switchNetworkAsync(chainId);
      }

      const challenge = await postAuthorization<ChallengeResponse>({
        account: connectedAccount,
        action: "challenge",
        chainId,
        community,
      });
      if (challenge.nonce.length === 0) {
        throw new Error("The authorization API returned an invalid challenge.");
      }

      setAuthorizationStatus("signing");
      activeStep = "sign";
      const signature = await signTypedDataWithProvider({
        account: connectedAccount,
        connector,
        typedData: challenge.typedData,
      });
      if (
        originalChainId != null &&
        originalChainId !== chainId &&
        switchNetworkAsync != null
      ) {
        try {
          await switchNetworkAsync(originalChainId);
        } catch (error) {
          logOnce(
            "warn",
            "[CommunityMarkee] Unable to restore the original wallet chain after Markee authorization",
            error,
          );
          toast.warn(
            "Authorization signed, but your wallet could not switch back to the original network.",
            { toastId: "markee-network-restore-warning" },
          );
        }
      }

      setAuthorizationStatus("verifying");
      activeStep = "execute";
      setIsOpen(false);
      setIsOptInTransactionModalOpen(true);
      setOptInTransactionNotification((current) =>
        current?.toastId === toastId ?
          { ...current, status: "loading" }
        : current,
      );
      const verification = await postAuthorization<VerifyResponse>({
        action: "verify",
        nonce: challenge.nonce,
        signature,
      });
      if (!verification.authorized) {
        throw new Error("The council Safe authorization was not accepted.");
      }
      if (verification.transactionHash == null) {
        throw new Error(
          "The Markee creation API did not return a transaction hash.",
        );
      }

      transactionHash = verification.transactionHash;
      router = verification.router;
      setOptInTransactionNotification((current) =>
        current?.toastId === toastId ?
          {
            ...current,
            status: "success",
            targetAddress: router,
            transactionHash,
          }
        : current,
      );
      setAuthorizationStatus("authorized");
      void refreshMarkeeUntilActive().catch((error: unknown) => {
        console.error(
          "Unable to refresh the new Markee community integration",
          error,
        );
      });
    } catch (error) {
      setAuthorizationStatus("idle");
      setOptInTransactionNotification((current) =>
        current?.toastId === toastId ?
          {
            ...current,
            error: getTransactionError(
              error,
              "Unable to create the community Markee leaderboard.",
            ),
            status: "error",
            targetAddress: router,
            transactionHash,
          }
        : current,
      );
      if (!isUserRejectedTransactionError(error)) {
        const errorContext = {
          type: "markee-opt-in-transaction-error",
          step: activeStep,
          chainId: markee.markeeChainId,
          community,
          connectedAccount,
          councilSafe,
          router,
          transactionHash,
          tags: {
            error_type: "markee-opt-in-transaction-error",
            transaction_step: activeStep,
            chain_id: markee.markeeChainId,
          },
        };
        logOnce(
          "error",
          "[CommunityMarkee] Markee opt-in transaction failed",
          error,
          errorContext,
        );
        reportClientError(error, errorContext);
      }
    }
  };

  const optInTransactionStatus = optInTransactionNotification?.status ?? "idle";
  const optInTransactionHash = optInTransactionNotification?.transactionHash;
  const optInTransactionExplorerUrl =
    optInTransactionHash != null && (markee?.markeeChainId ?? chainId) != null ?
      `${getExplorerUrl(markee?.markeeChainId ?? chainId).replace(/\/$/u, "")}/tx/${optInTransactionHash}`
    : null;
  const optInTransaction: TransactionProps = {
    auxiliaryLink:
      optInTransactionExplorerUrl != null ?
        {
          href: optInTransactionExplorerUrl,
          label: "View on block explorer",
        }
      : undefined,
    contractName: "Create community vault and leaderboard",
    message:
      optInTransactionStatus === "success" ?
        "The community vault and Markee leaderboard were created."
      : optInTransactionStatus === "error" ?
        optInTransactionNotification?.error?.message ??
        "Unable to create the community Markee leaderboard."
      : "Creating the community vault and Markee leaderboard.",
    status: optInTransactionStatus,
  };

  return (
    <>
      <section aria-label="Markee leaderboard">
        <button
          type="button"
          className="w-full cursor-pointer rounded-xl text-left focus:outline-none"
          aria-label={
            hasActiveMarkee ? "Open this Markee" : (
              "Integrate Markee for this community"
            )
          }
          onClick={() => {
            if (hasActiveMarkee) setIsPreviewOpen(true);
            else setIsOpen(true);
          }}
        >
          <PlaceholderSign
            hint={signHint}
            isEmpty={
              hasActiveMarkee && markee.leaderboard.message.trim().length === 0
            }
            isPlaceholder={!hasActiveMarkee}
            message={displayedMessage}
            totalViews={totalViews}
          />
        </button>

        {canOptIn && hasActiveMarkee && (
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-neutral-content/15 bg-neutral/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-soft-content">
                  🪧 Markee Revenue
                </p>
                {hasPendingClaim ?
                  <div
                    className="mt-2 flex items-center gap-2 text-sm text-primary-content"
                    role="status"
                  >
                    <span className="loading loading-spinner loading-sm" />
                    <span>Bridge in progress</span>
                  </div>
                : <p
                    className="tooltip tooltip-top mt-1 cursor-help font-mono text-lg font-semibold text-neutral-content"
                    data-tip={`${formatEther(BigInt(markee.revenue.claimableAmount))} ${markee.revenue.symbol}`}
                    tabIndex={0}
                  >
                    {formatEthAmountRounded(markee.revenue.claimableAmount, 3)}{" "}
                    {markee.revenue.symbol}
                  </p>
                }
              </div>
              <Button
                btnStyle="outline"
                color="primary"
                className="w-full sm:w-auto"
                onClick={() => setIsClaimOpen(true)}
                testId="markee-community-claim-open"
              >
                {hasPendingClaim ? "Open" : "Claim"}
              </Button>
            </div>
          </div>
        )}
      </section>

      <CommunityMarkeePreviewModal
        canIntegrate={canOptIn && !hasActiveMarkee}
        isOpen={isPreviewOpen}
        leaderboardAddress={markee?.integration.leaderboardAddress ?? undefined}
        markeeChainId={markee?.markeeChainId}
        maxMessageLength={markee?.leaderboard.maxMessageLength}
        maxNameLength={markee?.leaderboard.maxNameLength}
        message={displayedMessage}
        minimumMonthlyRateWei={
          hasActiveMarkee ? markee.leaderboard.minimumMonthlyRate : undefined
        }
        onClose={() => setIsPreviewOpen(false)}
        onIntegrate={() => {
          setIsPreviewOpen(false);
          setIsOpen(true);
        }}
        onMessageUpdated={(message) =>
          setMarkee((current) =>
            current == null ? current : (
              {
                ...current,
                leaderboard: { ...current.leaderboard, message },
              }
            ),
          )
        }
        onStreamUpdated={() => void refreshMarkee()}
        topMarkeeAddress={markee?.leaderboard.topMarkeeAddress ?? undefined}
        topMarkeeName={markee?.leaderboard.name}
        topMarkeeOwner={markee?.leaderboard.topMarkeeOwner ?? undefined}
        topRatePerSecondWei={markee?.leaderboard.topRate}
      />

      <CommunityRevenueClaimModal
        availableRevenueWei={markee?.revenue.claimableAmount}
        chainId={chainId}
        community={community}
        councilSafe={councilSafe}
        isOpen={isClaimOpen}
        markeeChainId={markee?.markeeChainId}
        onClose={() => setIsClaimOpen(false)}
        onClaimSuccess={refreshMarkee}
        onPendingClaimChange={setHasPendingClaim}
      />

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="small"
        title="Create a Markee leaderboard"
        icon={
          <div className="flex h-11 w-11 items-center justify-center">
            <span className="text-2xl" aria-hidden="true">
              🪧
            </span>
          </div>
        }
        testId="markee-opt-in"
        footer={
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              btnStyle="ghost"
              color="secondary"
              className="w-full sm:w-auto"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              btnStyle="filled"
              color="primary"
              className="w-full sm:w-auto"
              disabled={
                !isConnectedCouncilSafe ||
                chainId == null ||
                authorizationStatus === "authorized"
              }
              isLoading={isAuthorizing}
              onClick={handleAuthorize}
              testId="markee-opt-in-create"
              tooltip={
                !isConnectedCouncilSafe ?
                  "Switch to the council Safe to continue."
                : undefined
              }
              tooltipClassName="flex justify-end"
              tooltipSide="tooltip-top-left"
            >
              {authorizationStatus === "authorized" ? "Authorized" : "Create"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {!isConnectedCouncilSafe && councilSafe && (
            <div className="flex items-start gap-3 rounded-xl border border-warning-content/30 bg-warning-soft/50 p-4">
              <ArrowsRightLeftIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning-content" />
              <div>
                <p className="font-medium text-neutral-content">
                  Switch to the council Safe
                </p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-soft-content">
                  Connect with{" "}
                  <span className="inline-flex items-center gap-1 whitespace-nowrap font-mono">
                    {formatAddress(councilSafe)}
                    <button
                      type="button"
                      className="tooltip rounded-md p-1 text-inherit transition-colors hover:bg-neutral/20"
                      data-tip={isCouncilSafeCopied ? "Copied" : "Copy address"}
                      aria-label={
                        isCouncilSafeCopied ?
                          "Council Safe address copied"
                        : "Copy council Safe address"
                      }
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(councilSafe);
                          setIsCouncilSafeCopied(true);
                          window.setTimeout(
                            () => setIsCouncilSafeCopied(false),
                            1500,
                          );
                        } catch (error) {
                          logOnce(
                            "warn",
                            "[CommunityMarkee] Unable to copy the council Safe address",
                            error,
                          );
                        }
                      }}
                      data-testid="markee-opt-in-copy-council-safe"
                    >
                      {isCouncilSafeCopied ?
                        <CheckIcon className="h-4 w-4" />
                      : <ClipboardDocumentIcon className="h-4 w-4" />}
                    </button>
                  </span>{" "}
                  to collect the Safe&apos;s approval and create this
                  leaderboard.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-primary-content/20 bg-primary-soft/60 p-5 dark:border-primary-dark-border/30 dark:bg-primary-dark-base/10">
            <p className="text-lg font-semibold text-neutral-content">
              Give your community a sign worth supporting
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-soft-content">
              Create a leaderboard for community messages. The message with the
              highest stream is promoted to the top.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="flex items-start gap-3 rounded-xl border border-neutral-content/15 p-4">
              <ChatBubbleBottomCenterTextIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary-content" />
              <div>
                <p className="font-medium text-neutral-content">
                  Community messages compete
                </p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-soft-content">
                  Supporters back the messages they want everyone to see.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-neutral-content/15 p-4">
              <ArrowTrendingUpIcon className="mt-0.5 h-5 w-5 shrink-0 text-tertiary-content" />
              <div>
                <p className="font-medium text-neutral-content">
                  The leading message stays on top
                </p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-soft-content">
                  More support moves a message into the community spotlight.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-neutral-content/15 p-4">
              <BanknotesIcon className="mt-0.5 h-5 w-5 shrink-0 text-secondary-content" />
              <div>
                <p className="font-medium text-neutral-content">
                  Revenue flows back to the community
                </p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-soft-content">
                  A share of the winning stream is automatically sent to the
                  council Safe once enough has accumulated.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <TransactionModal
        isOpen={isOptInTransactionModalOpen}
        label="Integrate Markee"
        onClose={() => {
          setIsOptInTransactionModalOpen(false);
          void refreshMarkee();
        }}
        testId="markee-opt-in-transaction"
        transactions={[optInTransaction]}
      />
    </>
  );
}
