import { useEffect, useState } from "react";
import Image from "next/image";
import { Id, toast } from "react-toastify";
import { UserRejectedRequestError } from "viem";
import { WriteContractResult } from "wagmi/actions";
import { useContractWriteWithConfirmations } from "./useContractWriteWithConfirmations";
import { WaitingForSig, TxError, TxSuccess } from "@/assets";

type TransactionData = WriteContractResult | undefined;

export const useTransactionNotification = (
  { transactionData, transactionError, transactionStatus, contractName, enabled}: {
    transactionData: TransactionData | null | undefined,
    transactionError: Error | null | undefined,
    transactionStatus: ReturnType<typeof useContractWriteWithConfirmations>["status"],
    contractName: string,
    enabled?: boolean,
  },
) => {
  const [toastId, setToastId] = useState<Id>();

  useEffect(() => {
    if (transactionData?.hash) {
      console.info("Tx hash: ", transactionData.hash);
    }
  }, [transactionData?.hash]);

  useEffect(() => {
    if (!enabled || !transactionStatus || transactionStatus === "idle") {
      return;
    }

    const txNotifProps = {
      transactionStatus,
      contractName,
    };

    if (!toastId) {
      setToastId(toast(TransactionStatusNotification({
        ...txNotifProps, message: "Waiting for signature",
      }), {
        autoClose: false,
        closeButton: false,
        closeOnClick: false,
        icon: <></>,
        type: "warning",
        className: "no-icon",
      }));
    } else {
      if (transactionStatus === "success") {
        toast.update(toastId!, {
          render: TransactionStatusNotification({ ...txNotifProps, message:"Transaction sent successfully" }),
          autoClose: undefined,
          closeButton: undefined,
          closeOnClick: true,
          type: "success",
        });
        setToastId(undefined);
      } else if (transactionStatus === "error") {
        toast.update(toastId!, {
          render: TransactionStatusNotification({ ...txNotifProps, message:parseErrorMessage(transactionError as Error) }),
          autoClose: undefined,
          closeButton: undefined,
          closeOnClick: true,
          type: "error",
        });
        setToastId(undefined);
      }
    }
  }, [transactionStatus]);

  function parseErrorMessage(error: Error) {
    if (error?.cause instanceof UserRejectedRequestError) {
      return "User rejected the request";
    } else {
      return "Transaction failed. Please try again";
    }
  }
};

const TransactionStatusNotification = ({
  message,
  transactionStatus,
  contractName,
}: {
  message: string,
  transactionStatus: ReturnType<typeof useContractWriteWithConfirmations>["status"],
  contractName: string,
}) => {
  return (<div className="flex flex-row items-center gap-2">
    <Image width={48} src={transactionStatus === "loading" ? WaitingForSig : transactionStatus === "success" ? TxSuccess : TxError} alt="icon"/>
    <div className="flex flex-col gap-1">
      <div className="font-bold">{contractName}</div>
      <div className={`${transactionStatus === "loading" ? "text-warning" : transactionStatus === "success" ? "text-success" : "text-error"}`}>{message}</div>
    </div>
  </div>);
};