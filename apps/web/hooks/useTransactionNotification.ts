import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { WriteContractResult } from "wagmi/actions";
import { useViemClient } from "./useViemClient";
import { Address } from "viem";
import { chainDataMap } from "@/configs/chainServer";
import useChainFromPath from "@/hooks/useChainIdFromtPath";

type TransactionStatus = "error" | "success" | "loading" | "idle";
type TransactionData = WriteContractResult | undefined;
type TransactionPayload = {
  status: TransactionStatus;
  data?: TransactionData;
  error?: string;
  transactionData?: TransactionData;
};
type TransactionFunction = (
  value: TransactionPayload | PromiseLike<TransactionPayload>,
) => void;

export const useTransactionNotification = (
  transactionData: TransactionData,
) => {
  const [transactionStatus, updateTransactionStatus] =
    useState<TransactionStatus>("idle");
  const [txConfirmationHash, setTxConfirmationHash] = useState<
    Address | undefined
  >(undefined);
  const [promiseResolve, setPromiseResolve] = useState<
    TransactionFunction | undefined
  >(undefined);
  const [promiseReject, setPromiseReject] = useState<
    TransactionFunction | undefined
  >(undefined);
  const { id: urlChainId } = useChainFromPath();
  const viemClient = useViemClient();

  const transactionPromise = () => {
    return new Promise<TransactionPayload>((resolve, reject) => {
      setPromiseResolve(() => resolve);
      setPromiseReject(() => reject);
    });
  };

  useEffect(() => {
    if (transactionStatus === "error") {
      promiseReject?.({ status: "error" });
    }
    if (transactionStatus === "success") {
      promiseResolve?.({ status: "success", transactionData: transactionData });
    }
    if (transactionStatus === "loading") {
      const promise = transactionPromise();

      setTimeout(() => {
        promiseReject?.({ status: "error" });
      }, 1000);

      // Wallet interaction notification toasts
      toast
        .promise(promise, {
          pending: "Please sign the transaction",
          success: "Transaction sent!",
          error: "Something went wrong",
        })
        .then((data) => {
          console.log("Tx hash: " + data.transactionData?.hash);
          // const receipt = async () =>
          //   await viemClient.waitForTransactionReceipt({
          //     confirmations: chainDataMap[chainId].confirmations,
          //     hash: data.transactionData?.hash || "0x",
          //   });

          // // transaction notification toasts
          // toast
          //   .promise(receipt, {
          //     pending: "Waiting for block confirmations...",
          //     success: `Transaction sent with ${chainDataMap[chainId].confirmations} confirmations`,
          //     error: "Something went wrong",
          //   })
          //   .then((data) => {
          //     console.log(data);
          setTxConfirmationHash(data.transactionData?.hash);
          //   })
          //   .catch((error: any) => {
          //     console.error(`Tx failure: ${error}`);
          //   });
        })
        .catch((error: any) => {
          console.error(error);
        });
    }
  }, [transactionStatus]);

  return { updateTransactionStatus, txConfirmationHash };
};
