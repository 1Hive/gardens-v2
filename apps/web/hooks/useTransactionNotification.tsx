import { useEffect, useRef } from "react";
import { uniqueId } from "lodash-es";
import { WriteContractResult } from "wagmi/actions";

import { useChainFromPath } from "./useChainFromPath";
import { ComputedStatus } from "./useContractWriteWithConfirmations";
import { useTransactionNotificationManager } from "@/providers/TransactionNotificationProvider";

type UseTransactionNotificationArgs = {
  toastId?: string;
  transactionData: WriteContractResult | null | undefined;
  transactionError: Error | null | undefined;
  transactionStatus?: ComputedStatus;
  enabled?: boolean;
  fallbackErrorMessage?: string;
  contractName?: React.ReactNode;
  chainId?: number;
  confirmations?: number;
  watchTransaction?: boolean;
};

export const useTransactionNotification = ({
  toastId: toastIdProp,
  transactionData,
  transactionError,
  transactionStatus,
  enabled = true,
  fallbackErrorMessage,
  contractName,
  chainId,
  confirmations,
  watchTransaction = true,
}: UseTransactionNotificationArgs) => {
  const toastIdRef = useRef<string | null>(null);
  if (toastIdProp != null && toastIdRef.current !== toastIdProp) {
    toastIdRef.current = toastIdProp;
  } else if (toastIdRef.current == null) {
    toastIdRef.current = uniqueId();
  }

  const toastId = toastIdRef.current;
  const chainFromPath = useChainFromPath();
  const { notify } = useTransactionNotificationManager();

  useEffect(() => {
    notify({
      toastId,
      status: transactionStatus,
      contractName,
      transactionHash: transactionData?.hash,
      transactionError,
      fallbackErrorMessage,
      enabled,
      chainId: chainId ?? chainFromPath?.id,
      confirmations,
      watchTransaction,
    });
  }, [
    toastId,
    transactionStatus,
    transactionData?.hash,
    transactionError,
    contractName,
    enabled,
    fallbackErrorMessage,
    chainId,
    chainFromPath?.id,
    confirmations,
    watchTransaction,
    notify,
  ]);

  return toastId;
};
