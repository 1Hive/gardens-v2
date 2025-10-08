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
import { chainConfigMap } from "@/configs/chains";
import { NOTIFICATION_AUTO_CLOSE_DELAY } from "@/globals";
import { ComputedStatus } from "@/hooks/useContractWriteWithConfirmations";

type TransactionToastPayload = {
  toastId: string;
  status?: ComputedStatus;
  contractName?: React.ReactNode;
  transactionHash?: `0x${string}` | string | undefined;
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

  useEffect(() => {
    values.forEach((entry) => {
      if (!handledStatuses.includes(entry.status as ComputedStatus)) {
        remove(entry.toastId);
        return;
      }

      const notifProps = mapStatusToNotification(entry);
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
  }, [values, remove]);

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
  onClick?: () => void;
  autoClose?: ToastOptions["autoClose"];
};

const mapStatusToNotification = (
  entry: TransactionToastPayload,
): NotificationRenderConfig => {
  const chainUrl = getExplorerUrl(entry.chainId);
  const openExplorer = () => {
    if (entry.transactionHash) {
      window.open(`${chainUrl}/tx/${entry.transactionHash}`, "_blank");
    }
  };

  switch (entry.status) {
    case "waiting":
      return {
        message: "Waiting for signature",
        type: "warning" as ToastOptions["type"],
        showClickToExplorer: false,
        autoClose: false,
      };
    case "loading":
      return {
        message: "Transaction in progress...",
        type: "info" as ToastOptions["type"],
        showClickToExplorer: true,
        onClick: entry.transactionHash ? openExplorer : undefined,
        autoClose: false,
      };
    case "success":
      return {
        message: "Transaction successful",
        type: "success" as ToastOptions["type"],
        showClickToExplorer: true,
        onClick: entry.transactionHash ? openExplorer : undefined,
      };
    case "error":
      return {
        message: parseErrorMessage(entry),
        type: "error" as ToastOptions["type"],
        showClickToExplorer: !!entry.transactionHash,
        onClick: entry.transactionHash ? openExplorer : undefined,
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

const parseErrorMessage = (
  entry: TransactionToastPayload,
): React.ReactNode => {
  const error = entry.transactionError;
  if (error?.cause instanceof UserRejectedRequestError) {
    return "User rejected the request";
  }
  if (entry.fallbackErrorMessage) {
    return renderMultilineMessage(entry.fallbackErrorMessage);
  }
  return renderMultilineMessage("Transaction failed.\nPlease report a bug");
};

const TransactionStatusWatcher = ({
  entry,
  notify,
}: {
  entry: TransactionToastPayload;
  notify: (payload: TransactionToastPayload) => void;
}) => {
  const shouldWatch = Boolean(
    entry.watchTransaction !== false &&
      entry.transactionHash &&
      entry.chainId != null &&
      (entry.status === "waiting" || entry.status === "loading"),
  );

  const { status, error } = useWaitForTransaction({
    hash: entry.transactionHash as `0x${string}` | undefined,
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

  return null;
};

function getExplorerUrl(chainId?: number) {
  if (chainId && chainConfigMap[chainId]?.explorer) {
    return chainConfigMap[chainId].explorer;
  }
  return "https://etherscan.io";
}
