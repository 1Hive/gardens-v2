import { useEffect, useMemo } from "react";
import { WriteContractMode } from "@wagmi/core";
import { AbiFunction } from "abitype";
import {
  Abi,
  encodeFunctionData,
  TransactionReceipt,
  UserRejectedRequestError,
} from "viem";
import {
  useChainId,
  useContractWrite,
  UseContractWriteConfig,
  useWaitForTransaction,
} from "wagmi";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { useTransactionNotification } from "./useTransactionNotification";
import { chainConfigMap } from "@/configs/chains";
import { abiWithErrors } from "@/utils/abi";
import { stringifyJson } from "@/utils/json";

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
    abi: abiWithErrors(props.abi as Abi),
  };

  async function logError(error: any, variables: any, context: string) {
    // if (
    //   process.env.NEXT_PUBLIC_TENDERLY_ACCESS_KEY &&
    //   process.env.NEXT_PUBLIC_TENDERLY_ACCOUNT_NAME &&
    //   process.env.NEXT_PUBLIC_TENDERLY_PROJECT_NAME &&
    //   chainIdFromPath &&
    //   walletAddress
    // ) {
    //   const encodedData = encodeFunctionData({
    //     abi: props.abi as [AbiFunction],
    //     functionName: props.functionName as string,
    //     args: variables.args,
    //   });
    //   const tenderly = new Tenderly({
    //     accessKey: process.env.NEXT_PUBLIC_TENDERLY_ACCESS_KEY,
    //     network: +chainIdFromPath,
    //     accountName: process.env.NEXT_PUBLIC_TENDERLY_ACCOUNT_NAME,
    //     projectName: process.env.NEXT_PUBLIC_TENDERLY_PROJECT_NAME,
    //   });
    //   const blockNumber = await publicClient.getBlockNumber();
    //   try {
    //     const simulationResult = await tenderly.simulator.simulateTransaction({
    //       transaction: {
    //         from: walletAddress as Address,
    //         to: props.address as Address,
    //         gas: 20000000,
    //         gas_price: "19419609232",
    //         value: 0,
    //         input: encodedData,
    //       },
    //       blockNumber: Number(blockNumber),
    //     });
    //     console.log({ simulationResult });
    //     const simulationLink = `https://dashboard.tenderly.co/${tenderly.configuration.accountName}/${tenderly.configuration.projectName}/simulator/${simulationResult}`;
    //     console.log({ simulationResult, simulationLink });
    //   } catch (error) {
    //     console.error("Error. Failed to simulate transaction: ", error);
    //   }
    // }
    const encodedData = encodeFunctionData({
      abi: props.abi as [AbiFunction],
      functionName: props.functionName as string,
      args: variables.args,
    });
    const rawData = encodedData;
    let logPayload = {
      error,
      variables,
      context,
      rawData,
      contract: props.address,
      message: error.message,
    };
    try {
      logPayload = {
        ...logPayload,
        errorJson: stringifyJson(error),
      } as any;
    } catch (e) {
      console.debug("Error parsing logPayload error: ", e);
    }
    try {
      logPayload = {
        ...logPayload,
        variablesJson: stringifyJson(variables),
      } as any;
    } catch (e) {
      console.debug("Error parsing logPayload variable: ", e);
    }
    if (!(error?.cause instanceof UserRejectedRequestError)) {
      console.error(
        `Error with transaction [${props.contractName} -> ${props.functionName}]`,
        logPayload,
      );
    }
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
    isLoading: txResult.isLoading || txWaitResult.isLoading,
    transactionStatus: computedStatus as ComputedStatus | undefined,
    transactionData: txResult.data,
    confirmationsStatus: txWaitResult.status,
    confirmed: !!txWaitResult.isSuccess,
  };
}
