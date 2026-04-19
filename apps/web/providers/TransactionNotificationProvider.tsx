"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { toast, ToastOptions } from "react-toastify";
import { UserRejectedRequestError } from "viem";
import { useWaitForTransaction } from "wagmi";

import { TransactionStatusNotification } from "@/components/TransactionStatusNotification";
import {
  chainConfigMap,
  ExplorerPreference,
  getExplorerUrl,
} from "@/configs/chains";
import { NOTIFICATION_AUTO_CLOSE_DELAY } from "@/globals";
import { ComputedStatus } from "@/hooks/useContractWriteWithConfirmations";
import { useExplorerPreference } from "@/hooks/useExplorerPreference";

type TransactionToastPayload = {
  toastId: string;
  status?: ComputedStatus;
  contractName?: React.ReactNode;
  transactionHash?: `0x${string}` | string | undefined;
  safeTransactionHash?: `0x${string}` | string | undefined;
  safeAddress?: `0x${string}` | string | undefined;
  targetAddress?: `0x${string}` | string | undefined;
  transactionError?: Error | null;
  fallbackErrorMessage?: string;
  enabled?: boolean;
  chainId?: number;
  confirmations?: number;
  watchTransaction?: boolean;
};

type TransactionToastState = Record<
  string,
  TransactionToastPayload & { createdAt: number }
>;

const isRpcTransactionHash = (hash?: string): hash is `0x${string}` =>
  /^0x[a-fA-F0-9]{64}$/.test(hash ?? "");

type Action =
  | { type: "UPSERT"; payload: TransactionToastPayload }
  | { type: "REMOVE"; toastId: string };

const TransactionNotificationContext = createContext<{
  notify: (payload: TransactionToastPayload) => void;
  remove: (toastId: string) => void;
} | null>(null);

function reducer(
  state: TransactionToastState,
  action: Action,
): TransactionToastState {
  switch (action.type) {
    case "UPSERT": {
      const payload = action.payload;
      if (!payload.toastId) return state;
      const shouldRemove = payload.enabled === false || payload.status == null;
      if (shouldRemove) {
        const { [payload.toastId]: discarded, ...rest } = state;
        return rest;
      }

      const prev = state[payload.toastId];
      const next = {
        ...prev,
        ...payload,
        createdAt: prev?.createdAt ?? Date.now(),
      };

      if (prev && areEntriesEqual(prev, next)) {
        return state;
      }
      return {
        ...state,
        [payload.toastId]: next,
      };
    }
    case "REMOVE": {
      if (!action.toastId) return state;
      const { [action.toastId]: discarded, ...rest } = state;
      return rest;
    }
    default:
      return state;
  }
}

function areEntriesEqual(
  prev: TransactionToastPayload & { createdAt?: number },
  next: TransactionToastPayload & { createdAt?: number },
) {
  return (
    prev.status === next.status &&
    prev.contractName === next.contractName &&
    prev.transactionHash === next.transactionHash &&
    prev.safeTransactionHash === next.safeTransactionHash &&
    prev.safeAddress === next.safeAddress &&
    prev.targetAddress === next.targetAddress &&
    prev.transactionError === next.transactionError &&
    prev.fallbackErrorMessage === next.fallbackErrorMessage &&
    prev.enabled === next.enabled &&
    prev.chainId === next.chainId &&
    prev.confirmations === next.confirmations &&
    prev.watchTransaction === next.watchTransaction
  );
}

export const TransactionNotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [state, dispatch] = useReducer(reducer, {});

  const remove = useCallback((toastId: string) => {
    if (!toastId) return;
    toast.dismiss(toastId);
    dispatch({ type: "REMOVE", toastId });
  }, []);

  const notify = useCallback(
    (payload: TransactionToastPayload) => {
      if (!payload.toastId) return;
      if (payload.enabled === false || payload.status == null) {
        remove(payload.toastId);
        return;
      }

      dispatch({ type: "UPSERT", payload });
    },
    [remove],
  );

  const contextValue = useMemo(() => ({ notify, remove }), [notify, remove]);

  return (
    <TransactionNotificationContext.Provider value={contextValue}>
      {children}
      <TransactionToastManager
        entries={state}
        notify={notify}
        remove={remove}
      />
    </TransactionNotificationContext.Provider>
  );
};

export const useTransactionNotificationManager = () => {
  const ctx = useContext(TransactionNotificationContext);
  if (ctx == null) {
    throw new Error(
      "useTransactionNotification must be used within a TransactionNotificationProvider",
    );
  }
  return ctx;
};

type ManagerProps = {
  entries: TransactionToastState;
  notify: (payload: TransactionToastPayload) => void;
  remove: (toastId: string) => void;
};

const handledStatuses: ComputedStatus[] = [
  "waiting",
  "loading",
  "success",
  "error",
];

const TransactionToastManager = ({ entries, notify, remove }: ManagerProps) => {
  const values = useMemo(() => Object.values(entries), [entries]);
  const { explorerPreference } = useExplorerPreference();

  useEffect(() => {
    values.forEach((entry) => {
      if (!handledStatuses.includes(entry.status as ComputedStatus)) {
        remove(entry.toastId);
        return;
      }

      const notifProps = mapStatusToNotification(entry, explorerPreference);
      const toastOptions: ToastOptions = {
        toastId: entry.toastId,
        icon: <></>,
        autoClose: notifProps.autoClose ?? NOTIFICATION_AUTO_CLOSE_DELAY,
        className: "no-icon",
        type: notifProps.type,
        onClick: notifProps.onClick,
        onClose: () => remove(entry.toastId),
      };

      const content = (
        <TransactionStatusNotification
          status={entry.status as Exclude<ComputedStatus, undefined>}
          message={notifProps.message}
          contractName={entry.contractName}
          showClickToExplorer={notifProps.showClickToExplorer}
          auxiliaryLink={notifProps.auxiliaryLink}
        />
      );

      if (toast.isActive(entry.toastId)) {
        toast.update(entry.toastId, {
          ...toastOptions,
          render: content,
        });
      } else {
        toast(content, toastOptions);
      }
    });
  }, [explorerPreference, values, remove]);

  return (
    <>
      {values.map((entry) => (
        <TransactionStatusWatcher
          key={entry.toastId}
          entry={entry}
          notify={notify}
        />
      ))}
    </>
  );
};

type NotificationRenderConfig = {
  message: React.ReactNode;
  type: ToastOptions["type"];
  showClickToExplorer: boolean;
  auxiliaryLink?: {
    href: string;
    label: React.ReactNode;
  };
  onClick?: () => void;
  autoClose?: ToastOptions["autoClose"];
};

type SafeTransactionServiceResponse = {
  isExecuted?: boolean;
  isSuccessful?: boolean;
  transactionHash?: string | null;
  txHash?: string | null;
  executionTxHash?: string | null;
  safeTxHash?: string | null;
  to?: string | null;
  nonce?: number | null;
};

const mapStatusToNotification = (
  entry: TransactionToastPayload,
  explorerPreference: ExplorerPreference,
): NotificationRenderConfig => {
  const chainUrl = getExplorerUrl(entry.chainId, explorerPreference);
  const safeQueueUrl = getSafeQueueUrl(entry.chainId, entry.safeAddress);
  const explorerTransactionHash =
    isRpcTransactionHash(entry.transactionHash) ? entry.transactionHash : null;
  const openExplorer = () => {
    if (explorerTransactionHash) {
      window.open(`${chainUrl}/tx/${explorerTransactionHash}`, "_blank");
    }
  };

  switch (entry.status) {
    case "waiting":
      return {
        message: "Waiting for signature",
        type: "warning" as ToastOptions["type"],
        showClickToExplorer: false,
        auxiliaryLink:
          safeQueueUrl && entry.safeTransactionHash ?
            {
              href: safeQueueUrl,
              label: "Open in Safe",
            }
          : undefined,
        autoClose: false,
      };
    case "loading":
      return {
        message: "Transaction in progress...",
        type: "info" as ToastOptions["type"],
        showClickToExplorer: explorerTransactionHash != null,
        onClick: explorerTransactionHash != null ? openExplorer : undefined,
        autoClose: false,
      };
    case "success":
      return {
        message: "Transaction successful",
        type: "success" as ToastOptions["type"],
        showClickToExplorer: explorerTransactionHash != null,
        onClick: explorerTransactionHash != null ? openExplorer : undefined,
      };
    case "error":
      return {
        message: parseErrorMessage(entry),
        type: "error" as ToastOptions["type"],
        showClickToExplorer: explorerTransactionHash != null,
        onClick: explorerTransactionHash != null ? openExplorer : undefined,
      };
    default:
      return {
        message: "",
        type: "default" as ToastOptions["type"],
        showClickToExplorer: false,
      };
  }
};

const renderMultilineMessage = (message: string) => {
  const lines = message.split("\n");
  return (
    <span>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </span>
  );
};

const parseErrorMessage = (entry: TransactionToastPayload): React.ReactNode => {
  const error = entry.transactionError;
  if (isContractsPausedError(error)) {
    return "Contracts are in maintenance, please come back later.";
  }
  if (error?.cause instanceof UserRejectedRequestError) {
    return "User rejected the request";
  }
  if (entry.fallbackErrorMessage) {
    return renderMultilineMessage(entry.fallbackErrorMessage);
  }
  return renderMultilineMessage("Transaction failed.\nPlease report a bug");
};

const PAUSE_ERROR_NAMES = new Set([
  "strategypaused",
  "communitypaused",
  "strategyselectorpaused",
  "communityselectorpaused",
]);
const PAUSE_ERROR_MESSAGE_TOKENS = [
  "strategy paused",
  "community paused",
  "strategyselectorpaused",
  "communityselectorpaused",
];

function isContractsPausedError(error: unknown): boolean {
  let current: any = error;
  let depth = 0;
  while (current != null && depth < 5) {
    const exactNames = [
      current?.name,
      current?.reason,
      current?.errorName,
      current?.data?.errorName,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    if (exactNames.some((name) => PAUSE_ERROR_NAMES.has(name))) {
      return true;
    }

    const structuredText = [
      current?.shortMessage,
      current?.details,
      current?.cause?.shortMessage,
      current?.cause?.details,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (
      PAUSE_ERROR_MESSAGE_TOKENS.some((token) => structuredText.includes(token))
    ) {
      return true;
    }

    current = current?.cause;
    depth++;
  }
  return false;
}

const TransactionStatusWatcher = ({
  entry,
  notify,
}: {
  entry: TransactionToastPayload;
  notify: (payload: TransactionToastPayload) => void;
}) => {
  const shouldWatchSafeTransaction = Boolean(
    entry.watchTransaction !== false &&
      entry.transactionHash == null &&
      entry.safeTransactionHash != null &&
      entry.chainId != null &&
      (entry.status === "waiting" || entry.status === "loading"),
  );
  const shouldWatch = Boolean(
    entry.watchTransaction !== false &&
      isRpcTransactionHash(entry.transactionHash) &&
      entry.chainId != null &&
      (entry.status === "waiting" || entry.status === "loading"),
  );

  const { status, error } = useWaitForTransaction({
    hash:
      isRpcTransactionHash(entry.transactionHash) ?
        entry.transactionHash
      : undefined,
    chainId: entry.chainId,
    confirmations: entry.confirmations,
    enabled: shouldWatch,
  });

  useEffect(() => {
    if (!shouldWatch) return;

    if (status === "success" && entry.status !== "success") {
      notify({
        toastId: entry.toastId,
        status: "success",
        transactionError: null,
      });
    }
    if (status === "error" && entry.status !== "error") {
      notify({
        toastId: entry.toastId,
        status: "error",
        transactionError: error ?? entry.transactionError,
      });
    }
  }, [
    shouldWatch,
    status,
    error,
    entry.status,
    entry.toastId,
    entry.transactionError,
    notify,
  ]);

  useEffect(() => {
    if (!shouldWatchSafeTransaction) {
      return;
    }

    let cancelled = false;

    const pollSafeTransaction = async () => {
      const chainConfig = chainConfigMap[entry.chainId ?? -1];
      const safePrefix = chainConfig?.safePrefix;
      const safeTransactionHash = entry.safeTransactionHash;
      const safeAddress = entry.safeAddress;
      if (!safePrefix || safeTransactionHash == null) {
        return;
      }

      try {
        const response = await fetch(
          `https://api.safe.global/tx-service/${safePrefix}/api/v1/multisig-transactions/${safeTransactionHash}/`,
        );

        if (!response.ok) {
        } else {
          const data =
            (await response.json()) as SafeTransactionServiceResponse | null;
          if (cancelled || data == null) {
            return;
          }

          const executionHash =
            data.transactionHash ??
            data.txHash ??
            data.executionTxHash ??
            undefined;
          const resolvedSafeTxHash = data.safeTxHash ?? safeTransactionHash;

          if (isRpcTransactionHash(executionHash)) {
            notify({
              toastId: entry.toastId,
              status: "loading",
              transactionHash: executionHash,
              safeTransactionHash: resolvedSafeTxHash,
              transactionError: null,
            });
            return;
          }

          if (data.isExecuted === true) {
            notify({
              toastId: entry.toastId,
              status:
                data.isSuccessful === false ?
                  "error"
                : "success",
              safeTransactionHash: resolvedSafeTxHash,
              transactionError:
                data.isSuccessful === false ?
                  entry.transactionError ?? new Error("Safe transaction failed")
                : null,
            });
            return;
          }
        }

        if (!safeAddress) {
          return;
        }

        const listResponse = await fetch(
          `https://api.safe.global/tx-service/${safePrefix}/api/v1/safes/${safeAddress}/multisig-transactions/?limit=10`,
        );

        if (!listResponse.ok) {
          console.debug("[TransactionStatusWatcher] safe list poll non-200", {
            toastId: entry.toastId,
            chainId: entry.chainId,
            safeAddress,
            status: listResponse.status,
          });
          return;
        }

        const listData = (await listResponse.json()) as {
          results?: SafeTransactionServiceResponse[];
        } | null;

        const matchingTransaction =
          listData?.results?.find((tx) => {
            const matchesTarget =
              entry.targetAddress == null ||
              tx.to?.toLowerCase() === entry.targetAddress.toLowerCase();
            return matchesTarget;
          }) ?? listData?.results?.[0];

        if (cancelled || matchingTransaction == null) {
          return;
        }

        const matchedExecutionHash =
          matchingTransaction.transactionHash ??
          matchingTransaction.txHash ??
          matchingTransaction.executionTxHash ??
          undefined;
        const matchedSafeTxHash =
          matchingTransaction.safeTxHash ?? safeTransactionHash;

        if (isRpcTransactionHash(matchedExecutionHash)) {
          notify({
            toastId: entry.toastId,
            status: "loading",
            transactionHash: matchedExecutionHash,
            safeTransactionHash: matchedSafeTxHash,
            transactionError: null,
          });
          return;
        }

        if (matchingTransaction.isExecuted === true) {
          notify({
            toastId: entry.toastId,
            status:
              matchingTransaction.isSuccessful === false ?
                "error"
              : "success",
            safeTransactionHash: matchedSafeTxHash,
            transactionError:
              matchingTransaction.isSuccessful === false ?
                entry.transactionError ?? new Error("Safe transaction failed")
              : null,
          });
        }
      } catch (_pollError) {
        // ignore polling errors and try again on next interval
      }
    };

    void pollSafeTransaction();
    const intervalId = window.setInterval(() => {
      void pollSafeTransaction();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    entry.chainId,
    entry.safeTransactionHash,
    entry.safeAddress,
    entry.status,
    entry.toastId,
    entry.targetAddress,
    entry.transactionError,
    entry.transactionHash,
    entry.watchTransaction,
    notify,
    shouldWatchSafeTransaction,
  ]);

  return null;
};

function getSafeQueueUrl(
  chainId?: number,
  safeAddress?: `0x${string}` | string,
) {
  if (chainId == null || !safeAddress) {
    return undefined;
  }

  const safePrefix = chainConfigMap[chainId]?.safePrefix;
  if (!safePrefix) {
    return undefined;
  }

  return `https://app.safe.global/transactions/queue?safe=${safePrefix}:${safeAddress}`;
}
