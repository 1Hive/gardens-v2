import { useEffect, useRef, useState } from "react";
import { noop } from "lodash-es";
import { formatUnits } from "viem";
import { Address, useContractRead, usePublicClient } from "wagmi";
import { useContractWriteWithConfirmations } from "./useContractWriteWithConfirmations";
import { useResolvedChainId } from "./useResolvedChainId";
import { TransactionProps } from "@/components/TransactionModal";
import { erc20ABI } from "@/src/generated";
import {
  getAllowanceAction,
  getAllowanceShortfall,
  increaseAllowanceAbi,
  preflightIncreaseAllowance,
} from "@/utils/allowance";
import { delayAsync } from "@/utils/delayAsync";
import { roundToSignificant } from "@/utils/numbers";
import { getTxMessage } from "@/utils/transactionMessages";

export function useHandleAllowance(
  accountAddr: Address | undefined,
  token: { address: string; decimals: number; symbol: string } | undefined,
  spenderAddr: Address,
  amount: bigint,
  triggerNextTx: (covenantSignature: `0x${string}` | undefined) => void,
  options: {
    transactionLabel?: string;
    resetAllowanceIfNeeded?: boolean;
  } = {},
): {
  allowanceTxProps: TransactionProps;
  allowanceRequired: boolean | undefined;
  handleAllowance: (args?: {
    formAmount?: bigint;
    covenantSignature?: `0x${string}`;
  }) => Promise<void>;
  resetState: () => void;
} {
  const chainId = useResolvedChainId();
  const publicClient = usePublicClient({ chainId });
  const activeAllowanceMethod = useRef<"approve" | "increaseAllowance">(
    "approve",
  );
  const [allowanceTxProps, setAllowanceTxProps] = useState<TransactionProps>({
    contractName:
      options.transactionLabel ?? `${token?.symbol} expenditure approval`,
    message: "",
    status: "idle",
  });
  const [onSuccess, setOnSuccess] = useState<() => void>(noop);
  const [allowanceRequired, setAllowanceRequired] = useState<
    boolean | undefined
  >(undefined);

  const { refetch: refetchAllowance } = useContractRead({
    chainId,
    address: token?.address as Address,
    abi: erc20ABI,
    args: [accountAddr as Address, spenderAddr],
    functionName: "allowance",
    enabled: !!token?.address && !!accountAddr && !!spenderAddr,
  });

  const {
    writeAsync: writeAllowTokenAsync,
    transactionStatus: approveTransactionStatus,
    error: approveAllowanceError,
  } = useContractWriteWithConfirmations({
    address: token?.address as Address,
    abi: erc20ABI,
    // args: [spenderAddr, amount],
    functionName: "approve",
    contractName: "ERC20",
    showNotification: false,
  });

  const {
    writeAsync: writeIncreaseAllowanceAsync,
    transactionStatus: increaseTransactionStatus,
    error: increaseAllowanceError,
  } = useContractWriteWithConfirmations({
    address: token?.address as Address,
    abi: increaseAllowanceAbi,
    functionName: "increaseAllowance",
    contractName: "ERC20",
    showNotification: false,
  });

  const handleAllowance = async (args?: {
    formAmount?: bigint;
    covenantSignature?: `0x${string}`;
  }) => {
    const currentAllowance = await refetchAllowance();

    if (args?.formAmount != null) {
      amount = args.formAmount;
    }
    const currentAllowanceValue = currentAllowance?.data ?? 0n;
    const allowanceShortfall = getAllowanceShortfall(
      currentAllowanceValue,
      amount,
    );
    const increaseAllowanceSupported =
      (
        allowanceShortfall > 0n &&
        currentAllowanceValue > 0n &&
        accountAddr != null &&
        token?.address != null &&
        publicClient != null
      ) ?
        await preflightIncreaseAllowance(() =>
          (publicClient as any).simulateContract({
            account: accountAddr,
            address: token?.address as Address,
            abi: increaseAllowanceAbi,
            functionName: "increaseAllowance",
            args: [spenderAddr, allowanceShortfall],
          }),
        )
      : false;
    const allowanceAction = getAllowanceAction({
      currentAllowance: currentAllowanceValue,
      requiredAllowance: amount,
      increaseAllowanceSupported,
      resetAllowanceIfNeeded: options.resetAllowanceIfNeeded,
    });
    if (allowanceAction === "none") {
      setAllowanceRequired(false);
      await delayAsync(1000);
      setAllowanceTxProps((x) => ({
        ...x,
        message: getTxMessage("success"),
        status: "success",
      }));
      triggerNextTx(args?.covenantSignature);
    } else {
      setAllowanceRequired(true);
      if (allowanceAction === "increase") {
        activeAllowanceMethod.current = "increaseAllowance";
        setOnSuccess(() => () => triggerNextTx(args?.covenantSignature));
        setAllowanceTxProps({
          contractName: `${token?.symbol} allowance increase`,
          message: `Increasing allowance for ${token?.symbol} by ${token ? roundToSignificant(formatUnits(allowanceShortfall, token.decimals), 4) : ""}`,
          status: "waiting",
        });
        await writeIncreaseAllowanceAsync({
          args: [spenderAddr, allowanceShortfall],
        });
        return;
      }
      activeAllowanceMethod.current = "approve";
      if (allowanceAction === "reset-and-approve") {
        // Already found allowance but not enough, need to reset allowance
        setAllowanceTxProps({
          contractName: `${token?.symbol} allowance reset`,
          message: `Resetting allowance for ${token?.symbol} to 0`,
          status: "loading",
        });
        await writeAllowTokenAsync({ args: [spenderAddr, 0n] });
        setAllowanceTxProps({
          contractName:
            options.transactionLabel ?? `${token?.symbol} expenditure approval`,
          message: `Setting allowance for ${token?.symbol} of ${token ? roundToSignificant(formatUnits(amount, token.decimals), 4) : ""}`,
          status: "waiting",
        });
      }
      setOnSuccess(() => () => triggerNextTx(args?.covenantSignature));
      await writeAllowTokenAsync({ args: [spenderAddr, amount] });
    }
  };

  useEffect(() => {
    if (activeAllowanceMethod.current !== "approve") return;
    setAllowanceTxProps((x) => ({
      ...x,
      message: getTxMessage(approveTransactionStatus, approveAllowanceError),
      status: approveTransactionStatus ?? "idle",
    }));
    if (approveTransactionStatus === "success") {
      delayAsync(2000).then(() => onSuccess());
    }
  }, [approveTransactionStatus]);

  useEffect(() => {
    if (activeAllowanceMethod.current !== "increaseAllowance") return;
    setAllowanceTxProps((x) => ({
      ...x,
      message: getTxMessage(increaseTransactionStatus, increaseAllowanceError),
      status: increaseTransactionStatus ?? "idle",
    }));
    if (increaseTransactionStatus === "success") {
      delayAsync(2000).then(() => onSuccess());
    }
  }, [increaseTransactionStatus]);

  const resetState = () => {
    activeAllowanceMethod.current = "approve";
    setAllowanceRequired(undefined);
    setAllowanceTxProps((x) => ({
      ...x,
      message: getTxMessage("idle"),
      status: "idle",
    }));
  };

  return {
    allowanceTxProps,
    allowanceRequired,
    handleAllowance,
    resetState,
  };
}
