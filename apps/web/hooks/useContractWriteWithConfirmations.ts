import { useEffect } from "react";

import { TransactionReceipt } from "viem";
import { useChainId, useContractWrite, useWaitForTransaction } from "wagmi";
import { useTransactionNotification } from "./useTransactionNotification";
import { chainDataMap } from "@/configs/chainServer";

/**
 * his hook is used to write to a contract and wait for confirmations.
 * @param props
 * - onConfirmations: callback function to run after waited blocks
 * - confirmations: amount of block confirmations to wait for
 * - contractName: name of the contract to show in notification
 * - showNotification: to show status update with toast
 * @returns
 */
export function useContractWriteWithConfirmations(
  props: Parameters<typeof useContractWrite>[0] & {
    onConfirmations?: (receipt: TransactionReceipt) => void;
    confirmations?: number;
    contractName: string;
    showNotification?: boolean;
  },
) {
  const chainId = useChainId();
  let propsWithChainId = {
    ...props,
    chainId: props.chainId ?? chainId,
  };

  const txResult = useContractWrite(propsWithChainId as any);

  // Hook does not run unless hash is defined.
  const txWaitResult = useWaitForTransaction({
    hash: txResult.data?.hash,
    chainId: +propsWithChainId.chainId,
    confirmations:
    propsWithChainId.confirmations ??
    chainDataMap[+propsWithChainId.chainId].confirmations,
  });

  useTransactionNotification({
    transactionData: txResult.data,
    transactionStatus: txResult.status,
    transactionError: txResult.error,
    contractName: props.contractName,
    enabled: props.showNotification ?? true, // default to true
  });

  useEffect(() => {
    if (txResult.isSuccess && txWaitResult.data) {
      propsWithChainId.onConfirmations?.(txWaitResult.data);
    }
  }, [txResult.isSuccess, txWaitResult.data]);

  return {
    ...txResult,
    ...txWaitResult,
    transactionData: txResult.data,
    status: txResult.status,
    confirmationsStatus: txWaitResult.status,
    confirmed: !!txWaitResult.isSuccess,
  };
}
