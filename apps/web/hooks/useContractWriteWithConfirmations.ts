import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getDataSuffix, submitReferral } from "@divvi/referral-sdk";
import { WriteContractMode, WriteContractResult } from "@wagmi/core";
import { toast } from "react-toastify";
import { Abi, Address, TransactionReceipt, isAddress } from "viem";
import { celo } from "viem/chains";
import {
  useAccount,
  useChainId,
  useContractWrite,
  UseContractWriteConfig,
  usePublicClient,
  useWaitForTransaction,
  useWalletClient,
} from "wagmi";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { useTransactionNotification } from "./useTransactionNotification";
import { chainConfigMap } from "@/configs/chains";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { useFlag } from "@/hooks/useFlag";
import { abiWithErrors } from "@/utils/abi";
import { reportClientError } from "@/utils/clientErrorReporter";
import { stringifyJson } from "@/utils/json";
import {
  getWalletConnectDeepLinkChoice,
  isMobileBrowser,
  WALLETCONNECT_CONNECTOR_IDS,
  WalletConnectDeepLinkChoice,
} from "@/utils/walletConnectMobile";

export type ComputedStatus =
  | "loading"
  | "success"
  | "error"
  | "waiting"
  | undefined;

const isRpcTransactionHash = (hash?: string): hash is `0x${string}` =>
  /^0x[a-fA-F0-9]{64}$/.test(hash ?? "");

const shouldRetryWithWalletClient = (error: unknown) => {
  const transportError = [
    error instanceof Error ? error.message : undefined,
    (error as { cause?: { message?: string } })?.cause?.message,
    (error as { details?: string })?.details,
  ]
    .filter(Boolean)
    .join("\n");

  return /HTTP request failed|Failed to fetch|fetch failed|NetworkError|Load failed/i.test(
    transportError,
  );
};

const DIRECT_WALLET_FALLBACK_GAS_LIMIT = 1_500_000n;

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

const getWalletConnectApprovalLink = (
  connectorId?: string,
): WalletConnectDeepLinkChoice | undefined => {
  if (
    !connectorId ||
    !WALLETCONNECT_CONNECTOR_IDS.has(connectorId) ||
    !isMobileBrowser()
  ) {
    return undefined;
  }

  return getWalletConnectDeepLinkChoice();
};

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
  const { connector, address: connectedAddress } = useAccount();
  const reportedTransactionErrorRef = useRef<string | null>(null);
  const queryParams = useCollectQueryParams();
  const resolvedChaindId = +(
    props.chainId ??
    chainIdFromPath ??
    chainIdFromWallet
  );
  const publicClient = usePublicClient({ chainId: resolvedChaindId });
  const { data: walletClient } = useWalletClient({ chainId: resolvedChaindId });
  const forceSimulate = useFlag("showAsCouncilSafe");
  const [directWriteResult, setDirectWriteResult] = useState<{
    data?: WriteContractResult;
    error?: Error | null;
    status: "idle" | "loading" | "success" | "error";
  }>({ status: "idle" });

  const councilSafeFromFlag = useMemo(() => {
    const queryVal = queryParams?.flag_showAsCouncilSafe;
    if (queryVal && isAddress(queryVal)) return queryVal as Address;
    const envVal = process.env.NEXT_PUBLIC_FLAG_SHOWASCOUNCILSAFE;
    if (envVal && isAddress(envVal)) return envVal as Address;
    if (typeof window !== "undefined") {
      const stored = window.localStorage?.getItem("flag_showAsCouncilSafe");
      if (stored && isAddress(stored)) return stored as Address;
    }
    return undefined;
  }, [queryParams]);

  const shouldDivviTrack = useMemo(() => {
    return !IS_E2E && resolvedChaindId === celo.id;
  }, [resolvedChaindId]);

  const abiWithCustomErrors = useMemo(() => {
    if (!props.abi) return undefined;
    return abiWithErrors(props.abi as Abi);
  }, [props.abi]);

  const dataSuffix = useMemo(() => {
    if (!shouldDivviTrack) return undefined;

    const suffix = getDataSuffix({
      consumer: DIVVI_CONSUMER as Address,
      providers: DIVVI_PROVIDERS as Address[],
    });

    return (suffix.startsWith("0x") ? suffix : `0x${suffix}`) as `0x${string}`;
  }, [shouldDivviTrack]);

  const propsWithChainId = {
    ...props,
    abi: (abiWithCustomErrors ?? props.abi) as TAbi,
    chainId: resolvedChaindId,
    dataSuffix,
    confirmations:
      props.confirmations ??
      chainConfigMap[+resolvedChaindId]?.confirmations ??
      1,
    onConfirmations: props.onConfirmations,
  };

  function logError(error: any, variables: any, context: string) {
    console.error(
      `Error with transaction [${props.contractName} -> ${props.functionName}]`,
      {
        error,
        variables,
        context,
        cause: error?.cause?.message || error?.message,
      },
    );
  }

  const txResult = useContractWrite(
    propsWithChainId as UseContractWriteConfig<TAbi, TFunctionName, TMode>,
  );

  const simulationToastId = `${toastId}_sim`;

  const writeWithWalletClientAsync = useCallback(
    async (
      overrides?: Parameters<
        NonNullable<typeof txResult.writeAsync>
      >[0] extends undefined ?
        undefined
      : Parameters<NonNullable<typeof txResult.writeAsync>>[0],
    ) => {
      if (!walletClient) {
        throw new Error("Wallet client is not available");
      }

      const overrideConfig = (overrides ?? {}) as Record<string, unknown>;
      const variableConfig = (txResult.variables ?? {}) as Record<
        string,
        unknown
      >;
      const propConfig = propsWithChainId as Record<string, unknown>;
      const getWriteValue = (key: string) =>
        overrideConfig[key] ?? variableConfig[key] ?? propConfig[key];
      const accountForWrite =
        getWriteValue("account") ??
        (walletClient as any).account ??
        connectedAddress;
      const request = {
        abi: getWriteValue("abi"),
        address: getWriteValue("address"),
        functionName: getWriteValue("functionName"),
        args: getWriteValue("args"),
        account: accountForWrite,
        accessList: getWriteValue("accessList"),
        dataSuffix: getWriteValue("dataSuffix"),
        gas: getWriteValue("gas"),
        gasPrice: getWriteValue("gasPrice"),
        maxFeePerGas: getWriteValue("maxFeePerGas"),
        maxPriorityFeePerGas: getWriteValue("maxPriorityFeePerGas"),
        nonce: getWriteValue("nonce"),
        value: getWriteValue("value"),
        chain: resolvedChaindId ? { id: resolvedChaindId } : null,
      };

      setDirectWriteResult({ status: "loading" });

      try {
        if (request.gas == null) {
          try {
            request.gas = await (walletClient as any).estimateContractGas(
              request,
            );
          } catch (error) {
            console.warn(
              `Using fallback gas limit for transaction [${props.contractName} -> ${props.functionName}] after wallet gas estimation failed`,
              error,
            );
            request.gas = DIRECT_WALLET_FALLBACK_GAS_LIMIT;
          }
        }

        const hash = await (walletClient as any).writeContract(request);
        const data = { hash } as WriteContractResult;
        setDirectWriteResult({ data, status: "success" });
        props.onSuccess?.(data, overrides as any, undefined as any);
        props.onSettled?.(data, null, overrides as any, undefined as any);
        return data;
      } catch (error) {
        const normalizedError =
          error instanceof Error ? error : new Error(String(error));
        setDirectWriteResult({
          error: normalizedError,
          status: "error",
        });
        props.onError?.(normalizedError, overrides as any, undefined as any);
        props.onSettled?.(
          undefined,
          normalizedError,
          overrides as any,
          undefined as any,
        );
        throw normalizedError;
      }
    },
    [
      props,
      propsWithChainId,
      resolvedChaindId,
      txResult.variables,
      walletClient,
      connectedAddress,
    ],
  );

  const simulateAndWriteAsync = useCallback(
    async (
      overrides?: Parameters<
        NonNullable<typeof txResult.writeAsync>
      >[0] extends undefined ?
        undefined
      : Parameters<NonNullable<typeof txResult.writeAsync>>[0],
    ) => {
      const isMockConnector = connector?.id === "mock";
      if (!isMockConnector && !forceSimulate) {
        setDirectWriteResult({ status: "idle" });

        try {
          return await txResult.writeAsync?.(overrides as any);
        } catch (error) {
          if (shouldRetryWithWalletClient(error)) {
            console.warn(
              `Retrying transaction [${props.contractName} -> ${props.functionName}] with wallet client after public RPC preflight failed`,
              error,
            );
            return writeWithWalletClientAsync(overrides);
          }
          throw error;
        }
      }
      // If we can't simulate, fall back to normal write
      if (
        publicClient == null ||
        !props.address ||
        !props.abi ||
        !props.functionName
      ) {
        return txResult.writeAsync?.(overrides as any);
      }

      const accountForSimulation =
        (overrides as any)?.account ??
        (props as any)?.account ??
        (txResult.variables as any)?.account ??
        (forceSimulate ? councilSafeFromFlag : undefined) ??
        connectedAddress;

      try {
        await (publicClient as any).simulateContract({
          address: props.address as Address,
          abi: props.abi as Abi,
          functionName: props.functionName as any,
          args:
            (overrides as any)?.args ??
            (props as any)?.args ??
            (txResult.variables as any)?.args,
          value:
            (overrides as any)?.value ??
            (props as any)?.value ??
            (txResult.variables as any)?.value,
          account: accountForSimulation as Address | undefined,
        });
        toast.success("Simulation successful", { toastId: simulationToastId });
      } catch (error) {
        console.error("[Simulation failed]", {
          error,
          from: accountForSimulation,
        });
        toast.error("Simulation failed. See console for details.", {
          toastId: simulationToastId,
        });
        throw error;
      }

      return txResult.writeAsync?.(overrides as any);
    },
    [
      connectedAddress,
      connector?.id,
      forceSimulate,
      councilSafeFromFlag,
      publicClient,
      props.address,
      props.abi,
      props.functionName,
      props.args,
      props.value,
      (props as any)?.account,
      resolvedChaindId,
      txResult.writeAsync,
      txResult.variables,
      simulationToastId,
      writeWithWalletClientAsync,
    ],
  );

  const simulateAndWrite = useCallback(
    (overrides?: Parameters<NonNullable<typeof txResult.write>>[0]) => {
      simulateAndWriteAsync(overrides as any).catch(() => {
        /* error already surfaced via toast/console */
      });
    },
    [simulateAndWriteAsync, txResult.write],
  );

  propsWithChainId.onError = (
    ...params: Parameters<NonNullable<typeof props.onError>>
  ) => {
    props.onError?.(...params);
  };

  const rawTransactionHash = directWriteResult.data?.hash ?? txResult.data?.hash;
  const transactionHash =
    isRpcTransactionHash(rawTransactionHash) ? rawTransactionHash : undefined;
  const safeTransactionHash =
    rawTransactionHash != null && transactionHash == null ?
      rawTransactionHash
    : undefined;

  // Hook does not run unless hash is defined.
  const txWaitResult = useWaitForTransaction({
    hash: transactionHash,
    chainId: +resolvedChaindId,
    confirmations: propsWithChainId.confirmations,
    enabled: transactionHash != null,
  });
  const transactionError =
    directWriteResult.error ?? txResult.error ?? txWaitResult.error;

  const computedStatus = useMemo(() => {
    if (directWriteResult.status === "loading") {
      return "waiting";
    }

    if (directWriteResult.status === "error") {
      return "error";
    }

    if (txResult.status === "idle" && directWriteResult.status === "idle") {
      return undefined;
    }

    if (txResult.status === "error") {
      if (directWriteResult.data == null && txResult.error) {
        logError(txResult.error, txResult.variables, "write tx");
        return "error";
      }
    }

    if (transactionHash == null) {
      return "waiting";
    }

    if (txWaitResult.status === "loading") {
      return "loading";
    }

    if (txWaitResult.status === "success") {
      return "success";
    }

    if (txWaitResult.status === "error") {
      return "error";
    }

    if (txWaitResult.status === "idle") {
      return "waiting";
    }

    return txWaitResult.status;
  }, [
    directWriteResult.data,
    directWriteResult.status,
    transactionHash,
    txResult.error,
    txResult.status,
    txResult.variables,
    txWaitResult.status,
  ]);
  const walletApprovalLink = useMemo(
    () =>
      computedStatus === "waiting" ?
        getWalletConnectApprovalLink(connector?.id)
      : undefined,
    [computedStatus, connector?.id],
  );

  useTransactionNotification({
    toastId,
    transactionData: directWriteResult.data ?? txResult.data,
    transactionHash,
    safeTransactionHash,
    safeAddress: connectedAddress,
    targetAddress: props.address,
    transactionStatus: computedStatus,
    transactionError,
    walletApprovalLink,
    enabled: props.showNotification ?? true, // default to true
    fallbackErrorMessage: props.fallbackErrorMessage,
    contractName: props.contractName,
    chainId: resolvedChaindId,
    confirmations: propsWithChainId.confirmations,
    watchTransaction: true,
  });

  useEffect(() => {
    if (computedStatus !== "error" || !transactionError) return;

    const errorKey = stringifyJson({
      chainId: resolvedChaindId,
      contractName: props.contractName,
      functionName: props.functionName,
      address: props.address,
      message: transactionError.message,
      transactionHash,
      safeTransactionHash,
    });

    if (reportedTransactionErrorRef.current === errorKey) return;
    reportedTransactionErrorRef.current = errorKey;

    reportClientError(transactionError, {
      type: "transaction-error",
      contractName: props.contractName,
      functionName: props.functionName,
      address: props.address,
      args: props.args,
      chainId: resolvedChaindId,
      connectedAddress,
      transactionHash,
      safeTransactionHash,
      fallbackErrorMessage: props.fallbackErrorMessage,
      status: {
        directWrite: directWriteResult.status,
        write: txResult.status,
        confirmations: txWaitResult.status,
      },
      tags: {
        error_type: "transaction-error",
        chain_id: resolvedChaindId,
        contract_name: props.contractName,
        function_name: props.functionName,
      },
    });
  }, [
    computedStatus,
    transactionError,
    resolvedChaindId,
    props.contractName,
    props.functionName,
    props.address,
    props.args,
    props.fallbackErrorMessage,
    connectedAddress,
    transactionHash,
    safeTransactionHash,
    directWriteResult.status,
    txResult.status,
    txWaitResult.status,
  ]);

  useEffect(() => {
    if (txWaitResult.isSuccess && txWaitResult.data) {
      const hash = transactionHash;
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
  }, [transactionHash, txResult.isSuccess, txWaitResult.data]);

  return {
    ...txResult,
    ...txWaitResult,
    data: directWriteResult.data ?? txResult.data,
    error: directWriteResult.error ?? txResult.error,
    write: simulateAndWrite,
    writeAsync: simulateAndWriteAsync,
    isLoading:
      directWriteResult.status === "loading" ||
      txResult.isLoading ||
      txWaitResult.isLoading,
    transactionStatus: computedStatus as ComputedStatus | undefined,
    transactionData: directWriteResult.data ?? txResult.data,
    confirmationsStatus: txWaitResult.status,
    confirmed: !!txWaitResult.isSuccess,
  };
}
