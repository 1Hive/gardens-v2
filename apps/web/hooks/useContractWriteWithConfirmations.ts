import { useEffect, useMemo } from "react";

import { WriteContractMode } from "@wagmi/core";
import { Abi, TransactionReceipt } from "viem";
import {
  useChainId,
  useContractWrite,
  UseContractWriteConfig,
  useWaitForTransaction,
} from "wagmi";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { useTransactionNotification } from "./useTransactionNotification";
import { chainConfigMap } from "@/configs/chains";

export type ComputedStatus =
  | "loading"
  | "success"
  | "error"
  | "waiting"
  | undefined;

/**
 * this hook is used to write to a contract and wait for confirmations.
 * @param props
 * - onConfirmations: callback function to run after waited blocks
 * - confirmations: amount of block confirmations to wait for
 * - contractName: name of the contract to show in notification
 * - showNotification: to show status update with toast
 * @returns
 */
export function useContractWriteWithConfirmations<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string,
  TMode extends WriteContractMode = undefined,
>(
  props: UseContractWriteConfig<TAbi, TFunctionName, TMode> & {
    onConfirmations?: (receipt: TransactionReceipt) => void;
    confirmations?: number;
    contractName: string;
    showNotification?: boolean;
    fallbackErrorMessage?: string;
  },
) {
  const toastId = props.contractName + "_" + props.functionName;
  const chainIdFromWallet = useChainId();
  const chainIdFromPath = useChainIdFromPath();
  let propsWithChainId = {
    ...props,
    chainId: props.chainId ?? chainIdFromPath ?? chainIdFromWallet,
  };

  function logError(error: any, variables: any, context: string) {
    console.error(
      `Error with transaction [${props.contractName} -> ${props.functionName}]`,
      { error, variables, context },
    );
  }

  const txResult = useContractWrite(
    propsWithChainId as UseContractWriteConfig<TAbi, TFunctionName, TMode>,
  );

  propsWithChainId.onError = (
    ...params: Parameters<NonNullable<typeof props.onError>>
  ) => {
    props.onError?.(...params);
  };

  // Hook does not run unless hash is defined.
  const txWaitResult = useWaitForTransaction({
    hash: txResult.data?.hash,
    chainId: +propsWithChainId.chainId,
    confirmations:
      propsWithChainId.confirmations ??
      chainConfigMap[+propsWithChainId.chainId].confirmations,
  });

  const computedStatus = useMemo(() => {
    if (txResult.status === "idle") {
      return undefined;
    } else if (txWaitResult.status === "loading") {
      return "loading";
    } else if (txResult.status === "success" || txResult.status === "error") {
      if (txResult.error) {
        logError(txResult.error, txResult.variables, "wait for tx");
      }
      return txResult.status;
    } else if (txWaitResult.status === "idle") {
      return "waiting";
    }
    return txWaitResult.status;
  }, [txResult.status, txWaitResult.status]);

  useTransactionNotification({
    toastId,
    transactionData: txResult.data,
    transactionStatus: computedStatus,
    transactionError: txResult.error,
    enabled: props.showNotification ?? true, // default to true
    fallbackErrorMessage: props.fallbackErrorMessage,
  });

  useEffect(() => {
    if (txWaitResult.isSuccess && txWaitResult.data) {
      propsWithChainId.onConfirmations?.(txWaitResult.data);
    }
  }, [txResult.isSuccess, txWaitResult.data]);

  return {
    ...txResult,
    ...txWaitResult,
    transactionStatus: computedStatus as ComputedStatus | undefined,
    transactionData: txResult.data,
    confirmationsStatus: txWaitResult.status,
    confirmed: !!txWaitResult.isSuccess,
  };
}
