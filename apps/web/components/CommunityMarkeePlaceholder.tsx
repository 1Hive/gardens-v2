"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowTrendingUpIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
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
import { CommunityStreamingMarkeeModal } from "@/components/CommunityStreamingMarkeeModal";
import { InfoBox } from "@/components/InfoBox";
import { Modal } from "@/components/Modal";
import {
  TransactionModal,
  TransactionProps,
} from "@/components/TransactionModal";
import { chainConfigMap } from "@/configs/chains";
import { ComputedStatus } from "@/hooks/useContractWriteWithConfirmations";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import {
  CommunityMarkeeResponse,
  fetchMarkeeJson,
  MarkeeClaimQuoteResponse,
} from "@/services/markee";
import { reportClientError } from "@/utils/clientErrorReporter";
import { formatAddress } from "@/utils/formatAddress";
import { logOnce } from "@/utils/log";
import {
  buildMarkeeOpenStreamOperations,
  CFA_AGREEMENT_ID,
  CFA_V1_FORWARDER_ADDRESS,
  cfaV1ForwarderABI,
  ethxApproveABI,
  GDA_AGREEMENT_ID,
  getMarkeeFundingMonths,
  getMarkeeMonthlyAmountForFundingValue,
  getMarkeeRequiredNativeBalance,
  getMarkeeStreamAmounts,
  getMarkeeStreamFunding,
  MARKEE_BUFFER_PERIOD,
  MARKEE_SECONDS_IN_MONTH,
  MarkeeFundingUnit,
  markeeOwnerABI,
  streamingLeaderboardRuntimeABI,
  superfluidHostABI,
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

type ChallengeResponse = {
  nonce: string;
  typedData: Eip712TypedData;
};

type VerifyResponse = {
  authorized: boolean;
  bridged?: boolean;
  transactionHash?: `0x${string}`;
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

const authorizationStatusMessage: Partial<Record<AuthorizationStatus, string>> =
  {
    requesting: "Preparing the council Safe authorization request…",
    signing: "Approve the authorization request in your council Safe…",
    verifying: "Verifying the council Safe approval…",
  };

function PlaceholderSign({
  hint,
  isPlaceholder,
  message,
}: {
  hint: string;
  isPlaceholder: boolean;
  message: string;
}) {
  return (
    <div className="group relative w-full pb-3">
      <div
        className={`relative rounded-xl bg-neutral/50 px-6 py-8 transition-colors duration-200 group-hover:border-primary-content/50 ${isPlaceholder ? "border-2 border-dashed border-neutral-content/30" : "border border-neutral-content/15"}`}
      >
        <p className="w-full text-center font-mono text-lg leading-snug text-neutral-content transition-colors duration-200 group-hover:text-primary-content">
          <span aria-hidden="true">🪧 </span>
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
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : fallback);
}

function getTransactionErrorMessage(error: unknown, fallback: string) {
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

function formatEthInput(value: bigint) {
  const [whole, fraction = ""] = formatEther(value).split(".");
  const visibleFraction = fraction.slice(0, 12).replace(/0+$/u, "");
  return visibleFraction.length > 0 ? `${whole}.${visibleFraction}` : whole;
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
}) {
  const minimumMonthlyRateAmount = BigInt(
    minimumMonthlyRateWei ?? "10000000000000000",
  );
  const minimumMonthlyRate = Number(formatEther(minimumMonthlyRateAmount));
  const minimumOneMonthFundingAmount = formatEthInput(
    getMarkeeStreamAmounts(minimumMonthlyRateAmount, 10n ** 18n).value,
  );
  const [streamAmount, setStreamAmount] = useState(
    minimumOneMonthFundingAmount,
  );
  const [fundDuration, setFundDuration] = useState("1");
  const [fundUnit, setFundUnit] = useState<MarkeeFundingUnit>("month");
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
  const [activeStreamMarkee, setActiveStreamMarkee] = useState<Address | null>(
    null,
  );
  const [activeStreamRate, setActiveStreamRate] = useState(0n);
  const [isStreamPositionLoading, setIsStreamPositionLoading] = useState(false);
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
    enabled: transactionNotification != null,
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
  const isLive =
    leaderboardAddress != null &&
    topMarkeeAddress != null &&
    markeeChainId != null;
  const isTopMarkeeOwner =
    connectedAccount != null &&
    topMarkeeOwner != null &&
    connectedAccount.toLowerCase() === topMarkeeOwner.toLowerCase();
  const ownedMarkeeAddress =
    isTopMarkeeOwner ? topMarkeeAddress : connectedMarkeeAddress;
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
  const activeStreamTargetsOwnedMarkee =
    hasActiveStream &&
    activeStreamMarkee != null &&
    ownedMarkeeAddress != null &&
    activeStreamMarkee.toLowerCase() === ownedMarkeeAddress.toLowerCase();
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
  const streamSummary = useMemo(() => {
    const total = Number(streamAmount) || 0;
    const duration = Number(fundDuration) || 0;
    const months =
      fundUnit === "hour" ? duration / 730
      : fundUnit === "day" ? duration / (365 / 12)
      : fundUnit === "year" ? duration * 12
      : duration;
    const bufferMonths = Number(MARKEE_BUFFER_PERIOD) / 2_628_000;
    const monthly = months > 0 ? total / (months + bufferMonths) : 0;

    return {
      duration,
      months,
      monthly,
      total,
    };
  }, [fundDuration, fundUnit, streamAmount]);
  const minimumFundingAmount = useMemo(() => {
    try {
      return formatEthInput(
        getMarkeeStreamAmounts(
          minimumMonthlyRateAmount,
          getMarkeeFundingMonths(fundDuration, fundUnit),
        ).value,
      );
    } catch {
      return minimumOneMonthFundingAmount;
    }
  }, [
    fundDuration,
    fundUnit,
    minimumMonthlyRateAmount,
    minimumOneMonthFundingAmount,
  ]);
  const isBelowMinimum =
    streamSummary.monthly > 0 && streamSummary.monthly < minimumMonthlyRate;
  const fundingDurationError =
    streamSummary.months > 0 && streamSummary.months <= 4 / 730 ?
      "Fund the stream for more than four hours to cover its refundable buffer."
    : null;
  const streamFormError = fundingDurationError ?? streamValidationError;
  const canStartPreview =
    streamSummary.monthly >= minimumMonthlyRate &&
    streamSummary.total > 0 &&
    streamSummary.months > 0 &&
    fundingDurationError == null &&
    (!shouldCreateMarkee ||
      (newMarkeeMessage.trim().length > 0 &&
        newMarkeeMessageByteLength <= messageByteLimit &&
        newMarkeeNameByteLength <= nameByteLimit)) &&
    (shouldCreateMarkee ||
      !shouldShowOwnedMarkeeEditor ||
      (editedMessage.trim().length > 0 &&
        messageByteLength <= messageByteLimit &&
        nameByteLength <= nameByteLimit));
  const newMarkeeMessageInput = (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-soft-content">
          Your message
        </span>
        <textarea
          className="textarea textarea-bordered textarea-info min-h-24 w-full resize-none bg-primary-soft-dark font-mono outline-none"
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
      setStreamAmount(minimumOneMonthFundingAmount);
      setFundDuration("1");
      setFundUnit("month");
      setStreamValidationError(null);
      setNewMarkeeMessage("");
      setNewMarkeeName("");
    }
  }, [isOpen, minimumOneMonthFundingAmount]);

  useEffect(() => {
    setStreamValidationError(null);
  }, [fundDuration, fundUnit, streamAmount, walletBalance?.value]);

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
      setIsStreamPositionLoading(false);
      return;
    }

    let cancelled = false;
    setIsStreamPositionLoading(true);

    void (async () => {
      const [ethxResult, activeMarkeeResult] = await Promise.all([
        publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          functionName: "ETHX",
        }),
        publicClient.readContract({
          abi: streamingLeaderboardRuntimeABI,
          address: leaderboardAddress,
          args: [connectedAccount],
          functionName: "backerMarkee",
        }),
      ]);
      if (!isAddress(ethxResult)) {
        throw new Error("The Markee stream token is unavailable.");
      }

      const flowRate = await publicClient.readContract({
        abi: cfaV1ForwarderABI,
        address: CFA_V1_FORWARDER_ADDRESS,
        args: [getAddress(ethxResult), connectedAccount, leaderboardAddress],
        functionName: "getFlowrate",
      });
      if (cancelled) return;

      const liveRate = flowRate > 0n ? flowRate : 0n;
      setActiveStreamRate(liveRate);
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
        setStreamAmount(
          formatEthInput(
            getMarkeeStreamAmounts(
              liveRate * MARKEE_SECONDS_IN_MONTH,
              10n ** 18n,
            ).value,
          ),
        );
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
  }, [connectedAccount, isLive, isOpen, leaderboardAddress, publicClient]);

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

  const handleClose = () => {
    setIsPreviewComplete(false);
    setIsStreaming(false);
    setIsEditingMessage(false);
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

  const handleStartStream = async () => {
    if (!isLive) {
      setIsPreviewComplete(true);
      return;
    }
    if (connectedAccount == null) {
      showStreamError(null, "Connect a wallet to start streaming.");
      return;
    }
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
      } catch (error) {
        showStreamError(error, "Unable to switch to Ethereum Sepolia.");
      }
      return;
    }
    if (publicClient == null || walletClient == null) {
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
    let createTransactionHash: `0x${string}` | undefined;
    let messageTransactionHash: `0x${string}` | undefined;
    let nameTransactionHash: `0x${string}` | undefined;
    let streamTransactionHash: `0x${string}` | undefined;
    let notificationToastId: string | undefined;
    try {
      const monthsFixed18 = getMarkeeFundingMonths(fundDuration, fundUnit);
      const fundingValue = parseEther(streamAmount);
      const monthlyWei = getMarkeeMonthlyAmountForFundingValue(
        fundingValue,
        monthsFixed18,
      );
      const amounts = getMarkeeStreamAmounts(monthlyWei, monthsFixed18);
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
        ethxBalance,
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
          functionName: "balanceOf",
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
        ethxBalance,
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
        createTransactionHash = await walletClient.writeContract({
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
              break;
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
        setCreateTransaction({
          contractName: "Create Markee",
          message: "Markee created.",
          status: "success",
        });
        updateTransactionNotification(notificationToastId, {
          status: "success",
        });
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
          messageTransactionHash = await walletClient.writeContract({
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
          nameTransactionHash = await walletClient.writeContract({
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
      const poolResult = await publicClient.readContract({
        abi: streamingLeaderboardRuntimeABI,
        address: leaderboardAddress,
        args: [targetMarkeeAddress],
        functionName: "poolOf",
      });
      if (!isAddress(poolResult) || poolResult === zeroAddress) {
        throw new Error("The Markee refund pool is unavailable.");
      }
      const pool = getAddress(poolResult);

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
        return;
      }
      if (!showsTransactionModal) onClose();
      notificationToastId = beginTransactionNotification(
        existingFlowRate > 0n ? "Replace Markee stream" : "Start Markee stream",
        host,
      );
      streamTransactionHash = await walletClient.writeContract({
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
          fundDuration,
          fundUnit,
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
      } catch (error) {
        showStreamError(error, "Unable to switch to Ethereum Sepolia.");
      }
      return;
    }
    if (publicClient == null || walletClient == null) {
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
      stopTransactionHash = await walletClient.writeContract({
        abi: cfaV1ForwarderABI,
        address: CFA_V1_FORWARDER_ADDRESS,
        args: [getAddress(ethxResult), leaderboardAddress, 0n],
        functionName: "setFlowrate",
      });
      updateTransactionNotification(notificationToastId, {
        status: "loading",
        transactionHash: stopTransactionHash,
      });
      onClose();
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: stopTransactionHash,
      });
      if (receipt.status !== "success") {
        throw new Error("The stop-stream transaction reverted.");
      }

      setActiveStreamMarkee(null);
      setActiveStreamRate(0n);
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

  return (
    <>
      <CommunityStreamingMarkeeModal
        chainId={markeeChainId}
        currentMessage={message}
        currentName={topMarkeeName}
        leaderboardAddress={leaderboardAddress}
        isOpen={isOpen}
        onClose={handleClose}
        title={
          shouldCreateMarkee ? "Create your Markee"
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
                    disabled={isStreaming || isStoppingStream}
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
                  isConnectedMarkeeLoading ||
                  isStreamPositionLoading ||
                  streamFormError != null ||
                  (isLive && connectedAccount == null)
                }
                isLoading={isStreaming}
                onClick={handleStartStream}
                testId="markee-stream-preview-submit"
              >
                {isConnectedMarkeeLoading || isStreamPositionLoading ?
                  "Checking your stream…"
                : isLive && connectedAccount == null ?
                  "Connect wallet"
                : isLive && connectedChain?.id !== markeeChainId ?
                  "Switch to Sepolia"
                : shouldCreateMarkee ?
                  "Create and start streaming"
                : (
                  ownedMarkeeHasEmptyMessage ||
                  hasPendingMessageUpdate ||
                  hasPendingNameUpdate
                ) ?
                  hasActiveStream ?
                    "Save and replace stream"
                  : "Save and start streaming"
                : hasActiveStream ?
                  "Replace stream"
                : "Start stream"}
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
        : <div className="flex flex-col gap-5">
            <InfoBox
              infoBoxType="info"
              className="rounded-xl px-4 py-3"
              title={isLive ? "Ethereum Sepolia" : "Preview mode"}
              content={
                isLive ?
                  shouldCreateMarkee ?
                    "Create your own Markee message, then fund its stream on Sepolia. The transaction modal will guide you through creation and streaming."
                  : hasActiveStream && activeStreamTargetsOwnedMarkee ?
                    "Your stream is live. Change the monthly rate or funding below, then replace it in one transaction. You can also stop streaming."
                  : hasActiveStream ?
                    "You currently stream to another Markee. Replacing it below will move that stream to your Markee in one transaction, or you can stop it."
                  : !isTopMarkeeOwner ?
                    "Your Markee is already created. Native ETH wrapping, the refundable ETHx buffer, and streaming are handled together in one transaction."
                  : "Adjust the stream backing your Markee. Native ETH wrapping, the refundable ETHx buffer, and streaming are handled together in one transaction."

                : "Try the streaming interaction below. Nothing will be sent on-chain."
              }
            />

            {shouldCreateMarkee ?
              newMarkeeMessageInput
            : ownedMarkeeAddress != null && (
                <div className="rounded-xl border border-neutral-content/15 bg-neutral/40 p-4">
                  {shouldShowOwnedMarkeeEditor ?
                    <div className="flex flex-col gap-3">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-neutral-soft-content">
                          Markee message
                        </span>
                        <textarea
                          className="textarea textarea-bordered textarea-info min-h-24 w-full resize-none bg-primary-soft-dark font-mono outline-none"
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
                      <p className="text-xs uppercase tracking-wider text-neutral-soft-content">
                        Your Markee
                      </p>
                      <p className="mt-2 break-words font-mono text-lg text-neutral-content">
                        <span aria-hidden="true">🪧 </span>
                        {displayedMarkeeMessage}
                      </p>
                      {ownedMarkeeName && (
                        <p className="mt-1 text-sm text-neutral-soft-content">
                          {ownedMarkeeName}
                        </p>
                      )}
                      <Button
                        btnStyle="ghost"
                        color="primary"
                        className="mt-3 px-0"
                        onClick={() => setIsEditingMessage(true)}
                      >
                        Edit message
                      </Button>
                    </div>
                  }
                </div>
              )
            }

            <button
              type="button"
              className={`w-full rounded-xl border p-4 text-left transition-colors ${streamAmount === minimumFundingAmount ? "border-primary-content bg-neutral/60" : "border-neutral-content/20 bg-neutral/30 hover:border-primary-content/50"}`}
              onClick={() => setStreamAmount(minimumFundingAmount)}
            >
              <p className="text-sm font-medium text-neutral-soft-content">
                Minimum
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-neutral-content">
                {minimumMonthlyRate} ETH / mo
              </p>
              <p className="mt-1 text-xs text-neutral-soft-content">
                Stream at the lowest rate
              </p>
            </button>

            <label className="flex flex-col gap-2">
              <span className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wider text-neutral-soft-content">
                <span>Stream</span>
                {isLive && (
                  <span className="normal-case tracking-normal">
                    Wallet balance:{" "}
                    <span className="font-mono font-semibold text-neutral-content">
                      {connectedAccount == null ?
                        "Connect wallet"
                      : isWalletBalanceLoading ?
                        "Loading…"
                      : walletBalance ?
                        `${formatEthAmount(walletBalance.value)} ${walletBalance.symbol}`
                      : "Unavailable"}
                    </span>
                  </span>
                )}
              </span>
              <span className="input input-bordered input-info flex items-center gap-2 dark:bg-primary-soft-dark">
                <input
                  inputMode="decimal"
                  className="w-full flex-1 bg-transparent font-mono outline-none"
                  value={streamAmount}
                  onChange={(event) =>
                    setStreamAmount(sanitizeAmount(event.target.value))
                  }
                  aria-label="Total streaming amount"
                />
                <span className="text-sm text-neutral-soft-content">ETH</span>
              </span>
              {isBelowMinimum && (
                <span className="text-xs text-danger-content">
                  This amount results in a rate below the {minimumMonthlyRate}{" "}
                  ETH per month minimum.
                </span>
              )}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-soft-content">
                For
              </span>
              <span className="join w-full">
                <input
                  inputMode="decimal"
                  className="input join-item input-bordered input-info min-w-0 flex-1 bg-transparent font-mono dark:bg-primary-soft-dark"
                  value={fundDuration}
                  onChange={(event) =>
                    setFundDuration(sanitizeAmount(event.target.value))
                  }
                  aria-label="Streaming funding duration"
                  aria-invalid={streamFormError != null}
                />
                <select
                  className="select join-item select-bordered select-info shrink-0 bg-transparent text-sm text-neutral-soft-content dark:bg-primary-soft-dark"
                  value={fundUnit}
                  onChange={(event) =>
                    setFundUnit(event.target.value as MarkeeFundingUnit)
                  }
                  aria-label="Funding duration unit"
                >
                  <option value="hour">hours</option>
                  <option value="day">days</option>
                  <option value="month">months</option>
                  <option value="year">years</option>
                </select>
              </span>
              <span className="text-xs text-neutral-soft-content">
                You can top up or stop your stream whenever you like.
              </span>
            </label>

            {streamFormError && (
              <div role="alert" aria-live="polite">
                <InfoBox
                  infoBoxType="error"
                  className="rounded-xl px-4 py-3"
                  title={
                    fundingDurationError ?
                      "Funding period too short"
                    : "Insufficient balance"
                  }
                  content={streamFormError}
                />
              </div>
            )}

            {streamSummary.total > 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-neutral-content/15 bg-neutral/30 p-4 font-mono text-xs">
                <div className="flex items-center justify-between gap-4 text-neutral-soft-content">
                  <span>Stream rate</span>
                  <span className="text-neutral-content">
                    {streamSummary.monthly.toFixed(4)} ETH / mo
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-neutral-soft-content">
                  <span>Runs for</span>
                  <span className="text-neutral-content">
                    {streamSummary.duration} {fundUnit}
                    {streamSummary.duration === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="my-1 border-t border-neutral-content/15" />
                <div className="flex items-center justify-between gap-4 text-neutral-soft-content">
                  <span>Total to stream</span>
                  <span className="text-sm font-semibold text-primary-content">
                    {streamSummary.total.toFixed(5)} ETH
                  </span>
                </div>
              </div>
            )}
          </div>
        }
      </CommunityStreamingMarkeeModal>
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
        onClose={() => setIsTransactionModalOpen(false)}
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
  chainId,
  community,
  councilSafe,
  isOpen,
  onClose,
}: {
  chainId?: number;
  community: Address;
  councilSafe?: Address;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isClaimComplete, setIsClaimComplete] = useState(false);
  const [claimStatus, setClaimStatus] = useState<AuthorizationStatus>("idle");
  const [quote, setQuote] = useState<MarkeeClaimQuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [isRecipientCopied, setIsRecipientCopied] = useState(false);
  const { address: connectedAccount, connector } = useAccount();
  const claimAmountWei = quote ? BigInt(quote.claimAmount) : 0n;
  const bridgeFeeAmountWei = quote ? BigInt(quote.estimatedFeeAmount) : 0n;
  const isBridgedClaim = quote?.bridged === true;
  const claimRecipient = quote?.recipient ?? councilSafe;
  const markeeChainName =
    quote != null ?
      chainConfigMap[quote.markeeChainId]?.name ??
      `chain ${quote.markeeChainId}`
    : "the Markee chain";
  const communityChainName =
    chainId != null ?
      chainConfigMap[chainId]?.name ?? `chain ${chainId}`
    : "the community chain";
  const estimatedFeeAmountWei = isBridgedClaim ? bridgeFeeAmountWei : 0n;
  const amountReceivedWei =
    claimAmountWei > estimatedFeeAmountWei ?
      claimAmountWei - estimatedFeeAmountWei
    : 0n;
  const availableRevenue = quote ? Number(formatEther(claimAmountWei)) : 0;
  const estimatedFee = quote ? Number(formatEther(estimatedFeeAmountWei)) : 0;
  const feePercentage =
    availableRevenue > 0 ? (estimatedFee / availableRevenue) * 100
    : estimatedFee > 0 ? Number.POSITIVE_INFINITY
    : 0;
  const feePercentageLabel =
    feePercentage > 100 ? ">100%"
    : Number.isFinite(feePercentage) ? `${feePercentage.toFixed(2)}%`
    : ">100%";
  const areClaimFeesAboveRevenue =
    quote != null && estimatedFeeAmountWei > claimAmountWei;
  const isFeeAboveTenPercent =
    claimAmountWei > 0n ?
      estimatedFeeAmountWei * 10n > claimAmountWei
    : estimatedFeeAmountWei > 0n;
  const isFeeAtLeastFivePercent =
    claimAmountWei > 0n && estimatedFeeAmountWei * 20n >= claimAmountWei;
  const feeTextClass =
    isFeeAboveTenPercent ? "text-danger-content"
    : isFeeAtLeastFivePercent ? "text-warning-content"
    : "text-primary-content";
  const isAuthorizingClaim =
    claimStatus === "requesting" ||
    claimStatus === "signing" ||
    claimStatus === "verifying";

  useEffect(() => {
    if (!isOpen || chainId == null) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      chainId: chainId.toString(),
      community,
    });

    setIsQuoteLoading(true);
    setQuoteError(null);
    void fetchMarkeeJson<MarkeeClaimQuoteResponse>(
      `/api/markee/claim/quote?${params.toString()}`,
      controller.signal,
    )
      .then(setQuote)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setQuoteError(
          error instanceof Error ?
            error.message
          : "Unable to load the claim quote.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsQuoteLoading(false);
      });

    return () => controller.abort();
  }, [chainId, community, isOpen]);

  const handleClose = () => {
    setIsClaimComplete(false);
    setQuote(null);
    setQuoteError(null);
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
      areClaimFeesAboveRevenue
    ) {
      return;
    }

    setClaimStatus("requesting");

    try {
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
      if (
        challenge.typedData.message.claimAmount !== quote.claimAmount ||
        challenge.typedData.message.maxFeeAmount !== quote.estimatedFeeAmount ||
        challenge.typedData.message.markeeChainId !==
          quote.markeeChainId.toString() ||
        challenge.typedData.message.recipient !== quote.recipient
      ) {
        throw new Error(
          "The claim quote changed. Reopen the modal and try again.",
        );
      }

      setClaimStatus("signing");
      const signature = await signTypedDataWithProvider({
        account: connectedAccount,
        connector,
        typedData: challenge.typedData,
      });

      setClaimStatus("verifying");
      const verification = await postClaimAuthorization<VerifyResponse>({
        action: "verify",
        nonce: challenge.nonce,
        signature,
      });
      if (!verification.authorized) {
        throw new Error("The claim authorization was not accepted.");
      }

      setClaimStatus("authorized");
      setIsClaimComplete(true);
    } catch (error) {
      setClaimStatus("idle");
      if (!isUserRejectedTransactionError(error)) {
        logOnce("error", "[CommunityMarkee] Claim authorization failed", error);
      }
    }
  };

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
                areClaimFeesAboveRevenue
              }
              isLoading={isAuthorizingClaim}
              onClick={handleClaimAuthorization}
              testId="markee-community-claim-submit"
              tooltip={
                areClaimFeesAboveRevenue ?
                  "Claim costs exceed the available community revenue."
                : undefined
              }
            >
              Claim to council Safe
            </Button>
          </div>
      }
    >
      {isClaimComplete ?
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <CheckCircleIcon className="h-16 w-16 text-primary-content" />
          <div>
            <h4 className="text-lg text-neutral-content">Revenue claimed</h4>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-soft-content">
              {quote?.bridged ?
                "The claim transaction was confirmed. Across is delivering the revenue to the council Safe."
              : "The community revenue was sent to the council Safe."}
            </p>
          </div>
        </div>
      : <div className="flex flex-col gap-5">
          <InfoBox
            infoBoxType="info"
            className="rounded-xl px-4 py-3"
            title="Manual claim"
          >
            {quote == null ?
              <>Checking the route to the community council Safe</>
            : isBridgedClaim ?
              <>
                Bridge Markee community revenue from {markeeChainName} to{" "}
                {communityChainName} directly to the council Safe
              </>
            : <>
                Claim Markee community revenue directly on {markeeChainName} to
                the council Safe
              </>
            }{" "}
            {claimRecipient != null ?
              <span className="inline-flex items-center gap-1 whitespace-nowrap font-mono">
                {formatAddress(claimRecipient)}
                <button
                  type="button"
                  className="tooltip rounded-md p-1 text-inherit transition-colors hover:bg-neutral/20"
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
            : "(unavailable)"}
            .
          </InfoBox>

          {quoteError && (
            <div role="alert">
              <InfoBox
                infoBoxType="error"
                className="rounded-xl px-4 py-3"
                title="Claim quote unavailable"
                content={quoteError}
              />
            </div>
          )}

          <div
            className="rounded-xl border border-neutral-content/15 bg-neutral/30 p-5 text-center"
            aria-busy={isQuoteLoading}
          >
            <p className="text-xs uppercase tracking-wider text-neutral-soft-content">
              Available community revenue
            </p>
            <div className="mt-2 flex min-h-9 items-center justify-center font-mono text-3xl font-semibold text-neutral-content">
              {quote ?
                `${formatEthAmount(claimAmountWei)} ${quote.symbol}`
              : isQuoteLoading ?
                <div
                  aria-hidden="true"
                  className="skeleton h-9 w-36 rounded-md [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#353535]"
                />
              : "Unavailable"}
            </div>
          </div>

          <div
            className="flex flex-col gap-3 rounded-xl border border-neutral-content/15 bg-neutral/30 p-4 font-mono text-xs"
            aria-busy={isQuoteLoading}
          >
            {isBridgedClaim && (
              <>
                <div className="flex items-center justify-between gap-4 text-neutral-soft-content">
                  <span>Estimated bridge fees</span>
                  <span className={feeTextClass}>
                    {formatEthAmount(estimatedFeeAmountWei)} {quote.symbol} (
                    {feePercentageLabel})
                  </span>
                </div>
                <div className="border-t border-neutral-content/15" />
              </>
            )}
            <div className="flex items-center justify-between gap-4 text-neutral-soft-content">
              <span>Council Safe receives</span>
              <span className="text-sm font-semibold text-primary-content">
                {quote ?
                  `${formatEthAmount(amountReceivedWei)} ${quote.symbol}`
                : isQuoteLoading ?
                  <span
                    aria-hidden="true"
                    className="skeleton block h-5 w-24 rounded-md [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#353535]"
                  />
                : "—"}
              </span>
            </div>
          </div>

          {isQuoteLoading && (
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
  const [isOpen, setIsOpen] = useState(false);
  const [markee, setMarkee] = useState<CommunityMarkeeResponse | null>(null);
  const [authorizationStatus, setAuthorizationStatus] =
    useState<AuthorizationStatus>("idle");
  const [authorizationError, setAuthorizationError] = useState<string | null>(
    null,
  );
  const { address: connectedAccount, connector } = useAccount();
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
    hasActiveMarkee && connectedAccount != null && !isConnectedTopMarkeeOwner ?
      `Stream ${formatEthInput(topMarkeeChallengeRate)} ETH/mo to change`
    : "Stream to this sign";

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
    },
    [chainId, community],
  );

  useEffect(() => {
    if (chainId == null) return;

    const controller = new AbortController();
    void refreshMarkee(controller.signal).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Unable to load Markee community status", error);
      }
    });

    return () => controller.abort();
  }, [chainId, refreshMarkee]);

  if (markee == null) return null;

  const handleAuthorize = async () => {
    if (
      !isConnectedCouncilSafe ||
      connectedAccount == null ||
      connector == null ||
      chainId == null
    ) {
      return;
    }

    setAuthorizationError(null);
    setAuthorizationStatus("requesting");

    try {
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
      const signature = await signTypedDataWithProvider({
        account: connectedAccount,
        connector,
        typedData: challenge.typedData,
      });

      setAuthorizationStatus("verifying");
      const verification = await postAuthorization<VerifyResponse>({
        action: "verify",
        nonce: challenge.nonce,
        signature,
      });
      if (!verification.authorized) {
        throw new Error("The council Safe authorization was not accepted.");
      }

      setAuthorizationStatus("authorized");
    } catch (error) {
      setAuthorizationStatus("idle");
      setAuthorizationError(
        error instanceof Error ?
          error.message
        : "Unable to authorize Markee integration.",
      );
    }
  };

  return (
    <>
      <section aria-label="Markee leaderboard">
        <button
          type="button"
          className="w-full cursor-pointer rounded-xl text-left focus:outline-none"
          aria-label="Open this Markee"
          onClick={() => setIsPreviewOpen(true)}
        >
          <PlaceholderSign
            hint={signHint}
            isPlaceholder={!hasActiveMarkee}
            message={displayedMessage}
          />
        </button>

        {canOptIn && (
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-neutral-content/15 bg-neutral/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-soft-content">
                  Community revenue
                </p>
                <p className="mt-1 font-mono text-lg font-semibold text-neutral-content">
                  {formatEthAmount(markee.revenue.claimableAmount)}{" "}
                  {markee.revenue.symbol}
                </p>
              </div>
              <Button
                btnStyle="outline"
                color="primary"
                className="w-full sm:w-auto"
                onClick={() => setIsClaimOpen(true)}
                testId="markee-community-claim-open"
              >
                Claim
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
      />

      <CommunityRevenueClaimModal
        chainId={chainId}
        community={community}
        councilSafe={councilSafe}
        isOpen={isClaimOpen}
        onClose={() => setIsClaimOpen(false)}
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
                  Connect with {formatAddress(councilSafe)} to collect the
                  Safe&apos;s approval and create this leaderboard.
                </p>
              </div>
            </div>
          )}

          {authorizationStatusMessage[authorizationStatus] && (
            <div role="status" aria-live="polite">
              <InfoBox
                infoBoxType="info"
                className="rounded-xl px-4 py-3"
                content={authorizationStatusMessage[authorizationStatus]}
              />
            </div>
          )}

          {authorizationStatus === "authorized" && (
            <div role="status" aria-live="polite">
              <InfoBox
                infoBoxType="success"
                className="rounded-xl px-4 py-3"
                title="Council Safe authorized"
                content="The community Markee is being created and will appear here shortly."
              />
            </div>
          )}

          {authorizationError && (
            <div role="alert">
              <InfoBox
                infoBoxType="error"
                className="rounded-xl px-4 py-3"
                title="Authorization failed"
                content={authorizationError}
              />
            </div>
          )}

          <div className="rounded-2xl border border-primary-content/20 bg-primary-soft/60 p-5 dark:border-primary-dark-border/30 dark:bg-primary-dark-base/10">
            <p className="text-lg font-semibold text-neutral-content">
              Give your community a sign worth supporting
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-soft-content">
              Markee is a streaming leaderboard where supporters stream funds
              toward community messages. The message receiving the most support
              takes the top position.
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
    </>
  );
}
