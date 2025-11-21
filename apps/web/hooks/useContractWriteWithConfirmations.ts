import { useEffect, useMemo } from "react";

import { getDataSuffix, submitReferral } from "@divvi/referral-sdk";
import { WriteContractMode } from "@wagmi/core";
import { Abi, Address, TransactionReceipt } from "viem";
import { celo } from "viem/chains";
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

// Divvi configuration constants
const DIVVI_CONSUMER =
  process.env.NEXT_PUBLIC_DIVVI_CONSUMER ??
  "0x3c4d7f1a2b5e8c6f9e4b5a2c3d4e5f6a7b8c9d0e";
const DIVVI_PROVIDERS = process.env.NEXT_PUBLIC_DIVVI_PROVIDERS?.split(",") ?? [
  "0x0423189886d7966f0dd7e7d256898daeee625dca",
  "0x5f0a55fad9424ac99429f635dfb9bf20c3360ab8",
];

const IS_E2E =
  process.env.NEXT_PUBLIC_E2E === "true" || process.env.E2E === "true";

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
  const resolvedChaindId = +(
    props.chainId ??
    chainIdFromPath ??
    chainIdFromWallet
  );

  const shouldDivviTrack = useMemo(() => {
    return !IS_E2E && resolvedChaindId === celo.id;
  }, [resolvedChaindId]);

  let propsWithChainId = {
    ...props,
    chainId: resolvedChaindId,
    dataSuffix:
      shouldDivviTrack
        ? (`0x${getDataSuffix({
            consumer: DIVVI_CONSUMER as Address,
            providers: DIVVI_PROVIDERS as Address[],
          })}` as `0x${string}`)
        : undefined,
    confirmations:
      props.confirmations ??
      chainConfigMap[+resolvedChaindId]?.confirmations ??
      1,
    onConfirmations: props.onConfirmations,
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
    chainId: +resolvedChaindId,
    confirmations: propsWithChainId.confirmations,
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
    contractName: props.contractName,
    chainId: resolvedChaindId,
    confirmations: propsWithChainId.confirmations,
  });

  useEffect(() => {
    if (txWaitResult.isSuccess && txWaitResult.data) {
      const hash = txResult.data?.hash;
      // Referral tracking only for Celo
      if (hash && shouldDivviTrack) {
        try {
          submitReferral({
            txHash: hash,
            chainId: resolvedChaindId,
          }).then(() => {
            console.info("Successfully tracked referral with Divvi:", hash);
          });
        } catch (error) {
          logError(error, { hash }, "track divvi referral");
        }
      }
      propsWithChainId.onConfirmations?.(txWaitResult.data);
    }
  }, [txResult.isSuccess, txWaitResult.data]);

  return {
    ...txResult,
    ...txWaitResult,
    isLoading: txResult.isLoading || txWaitResult.isLoading,
    transactionStatus: computedStatus as ComputedStatus | undefined,
    transactionData: txResult.data,
    confirmationsStatus: txWaitResult.status,
    confirmed: !!txWaitResult.isSuccess,
  };
}
