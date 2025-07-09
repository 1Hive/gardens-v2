import { useEffect } from "react";
import { uniqueId } from "lodash-es";
import Image from "next/image";
import { toast, ToastOptions } from "react-toastify";
import { UserRejectedRequestError } from "viem";
import { WriteContractResult } from "wagmi/actions";
import { useChainFromPath } from "./useChainFromPath";
import { ComputedStatus } from "./useContractWriteWithConfirmations";
import {
  TxWaitingForSig,
  TxError,
  TxSuccess,
  TxInProgress,
  TxIdle,
} from "@/assets";
import { chainConfigMap } from "@/configs/chains";
import { NOTIFICATION_AUTO_CLOSE_DELAY } from "@/globals";

export const useTransactionNotification = ({
  toastId: toastIdProp,
  transactionData,
  transactionError,
  transactionStatus,
  enabled,
  fallbackErrorMessage,
  contractName,
}: {
  toastId?: string;
  transactionData: WriteContractResult | null | undefined;
  transactionError: Error | null | undefined;
  transactionStatus?: ComputedStatus;
  enabled?: boolean;
  fallbackErrorMessage?: string;
  contractName?: React.ReactNode;
}) => {
  const toastId = toastIdProp ?? uniqueId();
  const chain = useChainFromPath();

  useEffect(() => {
    if (!enabled || !transactionStatus) {
      return;
    }

    const txNotifProps = {
      status: transactionStatus,
      contractName,
    };

    let notifProps: Parameters<typeof TransactionStatusNotification>[0];
    let toastOptions: Partial<ToastOptions>;

    const clickToExplorer = () => {
      if (transactionData?.hash) {
        window.open(
          `${chainConfigMap[chain?.id ?? 0].explorer}/tx/${transactionData?.hash}`,
          "_blank",
        );
      }
    };

    switch (transactionStatus) {
      case "waiting":
        notifProps = { ...txNotifProps, message: "Waiting for signature" };
        toastOptions = { autoClose: false, type: "warning" };
        break;
      case "loading":
        notifProps = {
          ...txNotifProps,
          message: "Transaction in progress...",
          showClickToExplorer: true,
        };
        toastOptions = {
          autoClose: false,
          type: "info",
          onClick: clickToExplorer,
        };
        break;
      case "success":
        notifProps = {
          ...txNotifProps,
          message: "Transaction successful",
          showClickToExplorer: true,
        };
        toastOptions = {
          type: "success",
          onClick: clickToExplorer,
        };
        break;
      case "error":
        notifProps = {
          ...txNotifProps,
          message:
            transactionError ?
              parseErrorMessage(transactionError)
            : "Error processing transaction",
          showClickToExplorer: !!transactionData?.hash,
        };
        toastOptions = {
          type: "error",
          onClick: clickToExplorer,
        };
        break;
    }

    toastOptions = {
      toastId,
      icon: <></>,
      autoClose: NOTIFICATION_AUTO_CLOSE_DELAY,
      className: "no-icon",
      ...toastOptions,
    } satisfies ToastOptions;

    if (toast.isActive(toastId)) {
      toast.update(toastId, {
        ...toastOptions,
        render: <TransactionStatusNotification {...notifProps} />,
      });
    } else {
      toast(<TransactionStatusNotification {...notifProps} />, toastOptions);
    }
  }, [transactionStatus, transactionData, enabled]);

  function parseErrorMessage(error: Error) {
    if (error?.cause instanceof UserRejectedRequestError) {
      return "User rejected the request";
    } else if (fallbackErrorMessage) {
      return fallbackErrorMessage;
    } else {
      return "Transaction failed. Please report a bug";
    }
  }
};

export const TransactionStatusNotification = ({
  message,
  status,
  contractName,
  showClickToExplorer,
  index,
}: {
  message: React.ReactNode;
  status: "idle" | "waiting" | "loading" | "success" | "error";
  contractName?: React.ReactNode;
  showClickToExplorer?: boolean;
  index?: number;
}) => {
  let icon: any;
  let textColor: string;
  const chain = useChainFromPath();

  switch (status) {
    case "idle":
      icon = TxIdle;
      textColor = "";
      break;
    case "waiting":
      icon = TxWaitingForSig;
      textColor = "text-warning";
      break;
    case "loading":
      icon = TxInProgress;
      textColor = "text-info";
      break;
    case "success":
      icon = TxSuccess;
      textColor = "text-success";
      break;
    case "error":
      icon = TxError;
      textColor = "text-error";
      break;
  }

  return (
    <div className="flex flex-row items-center gap-2">
      {icon && (
        <div className="relative flex items-center justify-center">
          <Image
            className={`${status === "loading" ? "animate-spin" : ""}`}
            width={40}
            src={icon}
            alt="icon"
          />
          {index !== undefined && status === "idle" && (
            <label className="absolute font-medium text-xl">{index}</label>
          )}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {contractName && (
          <div className="font-semibold text-gray-700 text-[22px]">
            {contractName}
          </div>
        )}
        <div
          className={`${showClickToExplorer ? textColor : ""} font-medium text-[20px]`}
        >
          {message}
        </div>
        {chain?.blockExplorers?.default.url && showClickToExplorer && (
          <div className="w-full text-sm italic">
            Click to see in block explorer
          </div>
        )}
      </div>
    </div>
  );
};
