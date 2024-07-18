import { useEffect, useState } from "react";
import Image from "next/image";
import { Id, toast } from "react-toastify";
import { UserRejectedRequestError } from "viem";
import { WriteContractResult } from "wagmi/actions";
import { useContractWriteWithConfirmations } from "./useContractWriteWithConfirmations";
import { WaitingForSig, TxError, TxSuccess } from "@/assets";

type TransactionData = WriteContractResult | undefined;

export const useTransactionNotification = (
  { transactionData, transactionError, transactionStatus, contractName, enabled }: {
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
      status: transactionStatus,
      contractName,
    };

    if (!toastId) {
      setToastId(toast(TransactionStatusNotification({
        ...txNotifProps, message: "Waiting for signature",
      }), {
        autoClose: false,
        icon: <></>,
        type: "warning",
        className: "no-icon",
      }));
    } else {
      if (transactionStatus === "success") {
        toast.update(toastId!, {
          render: TransactionStatusNotification({ ...txNotifProps, message:"Transaction sent successfully" }),
          autoClose: undefined,
          type: "success",
        });
        setToastId(undefined);
      } else if (transactionStatus === "error") {
        toast.update(toastId!, {
          render: TransactionStatusNotification({ ...txNotifProps, message:parseErrorMessage(transactionError as Error) }),
          autoClose: undefined,
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
      textColor = "";
      break;
    case "loading":
      icon = WaitingForSig;
      textColor = "text-warning";
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

  return (<div className="flex flex-row items-center gap-2">
    {icon && <Image width={40} src={icon} alt="icon" />}
    <div className="flex flex-col gap-1">
      <div className="font-bold">{contractName}</div>
      <div className={textColor}>{message}</div>
    </div>
  </div>);
};