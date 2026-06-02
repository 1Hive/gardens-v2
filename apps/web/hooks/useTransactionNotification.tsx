import { useEffect, useRef } from "react";
import { uniqueId } from "lodash-es";
import { WriteContractResult } from "wagmi/actions";

import { useChainFromPath } from "./useChainFromPath";
import { ComputedStatus } from "./useContractWriteWithConfirmations";
import { useTransactionNotificationManager } from "@/providers/TransactionNotificationProvider";

type UseTransactionNotificationArgs = {
  toastId?: string;
  transactionData: WriteContractResult | null | undefined;
  transactionHash?: `0x${string}` | string | undefined;
  safeTransactionHash?: `0x${string}` | string | undefined;
  safeAddress?: `0x${string}` | string | undefined;
  targetAddress?: `0x${string}` | string | undefined;
  transactionError: Error | null | undefined;
  transactionStatus?: ComputedStatus;
  enabled?: boolean;
  fallbackErrorMessage?: string;
  contractName?: React.ReactNode;
  walletApprovalLink?: {
    href: string;
    label: string;
  };
  chainId?: number;
  confirmations?: number;
  watchTransaction?: boolean;
};

export const useTransactionNotification = ({
  toastId: toastIdProp,
  transactionData: _transactionData,
  transactionHash,
  safeTransactionHash,
  safeAddress,
  targetAddress,
  transactionError,
  transactionStatus,
  enabled = true,
  fallbackErrorMessage,
  contractName,
  walletApprovalLink,
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
      transactionHash,
      safeTransactionHash,
      safeAddress,
      targetAddress,
      transactionError,
      fallbackErrorMessage,
      enabled,
      walletApprovalLink,
      chainId: chainId ?? chainFromPath?.id,
      confirmations,
      watchTransaction,
    });
  }, [
    toastId,
    transactionStatus,
    transactionHash,
    safeTransactionHash,
    safeAddress,
    targetAddress,
    transactionError,
    contractName,
    walletApprovalLink,
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
