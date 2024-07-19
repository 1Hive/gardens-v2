import { useEffect } from "react";
import { uniqueId } from "lodash-es";
import Image from "next/image";
import { toast, ToastOptions } from "react-toastify";
import { UserRejectedRequestError } from "viem";
import { WriteContractResult } from "wagmi/actions";
import { useChainFromPath } from "./useChainFromPath";
import { useContractWriteWithConfirmations } from "./useContractWriteWithConfirmations";
import { WaitingForSig, TxError, TxSuccess, TxMinting } from "@/assets";
import { NOTIFICATION_AUTO_CLOSE_DELAY } from "@/globals";

type TransactionData = WriteContractResult | undefined;

export const useTransactionNotification = (
  { toastId: toastIdProp, transactionData, transactionError, transactionStatus, contractName, enabled, fallbackErrorMessage }: {
    toastId?: string,
    transactionData: TransactionData | null | undefined,
    transactionError: Error | null | undefined,
    transactionStatus?: ReturnType<typeof useContractWriteWithConfirmations>["status"],
    contractName: string,
    enabled?: boolean,
    fallbackErrorMessage?: string,
  },
) => {
  const toastId = toastIdProp ?? uniqueId();
  const chain = useChainFromPath();

  useEffect(() => {
    if (transactionData?.hash) {
      console.info("Tx hash: ", transactionData.hash);
    }
  }, [transactionData?.hash]);

  useEffect(() => {
    if ((!enabled && transactionStatus !== "error" && transactionStatus !== "success") || !transactionStatus) {
      return;
    }

    const txNotifProps = {
      status: transactionStatus,
      contractName,
    };

    let notifProps: Parameters<typeof TransactionStatusNotification>[0];
    let toastOptions: Partial<ToastOptions>;

    const clickToExplorer = () => window.open(`${chain?.blockExplorers?.default.url}/tx/${transactionData?.hash}`, "_blank");

    switch (transactionStatus) {
      case "idle":
        notifProps = { ...txNotifProps, message: "Waiting for signature" };
        toastOptions = { autoClose: false, type: "warning" };
        break;
      case "loading":
        notifProps = { ...txNotifProps, message: "Minting transaction..." };
        toastOptions = { autoClose: false, type: "info", onClick: clickToExplorer };
        break;
      case "success":
        notifProps = { ...txNotifProps, message: "Transaction successfull" };
        toastOptions = { type: "success", onClick: clickToExplorer };
        break;
      case "error":
        notifProps = { ...txNotifProps, message: parseErrorMessage(transactionError as Error) };
        toastOptions = { type: "error", onClick: clickToExplorer };
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
      toast.update(toastId, { ...toastOptions, render: <TransactionStatusNotification {...notifProps} /> });
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
      return "Transaction failed. Please try again";
    }
  }
};

export const TransactionStatusNotification = ({
  message,
  status,
  contractName,
}: {
  message: string,
  status: ReturnType<typeof useContractWriteWithConfirmations>["status"],
  contractName: string,
}) => {
  let icon: any;
  let textColor: string;

  switch (status) {
    case "idle":
      icon = WaitingForSig;
      textColor = "text-warning";
      break;
    case "loading":
      icon = TxMinting;
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
      {icon && <Image className={`${status === "loading" ? "animate-spin" : ""}`} width={40} src={icon} alt="icon" />}
      <div className="flex flex-col gap-1">
        <div className="font-bold">{contractName}</div>
        <div className={textColor}>{message}</div>
      </div>
    </div>
  );
};