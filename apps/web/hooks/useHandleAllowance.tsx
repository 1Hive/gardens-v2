import { useEffect, useState } from "react";
import { noop } from "lodash-es";
import { Address, useContractRead } from "wagmi";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { useContractWriteWithConfirmations } from "./useContractWriteWithConfirmations";
import { TransactionProps } from "@/components/TransactionModal";
import { erc20ABI } from "@/src/generated";
import { delayAsync } from "@/utils/delayAsync";
import { getTxMessage } from "@/utils/transactionMessages";

export function useHandleAllowance(
  accountAddr: Address | undefined,
  token: { address: string; decimals: number; symbol: string } | undefined,
  spenderAddr: Address,
  amount: bigint,
  triggerNextTx: (covenantSignature: `0x${string}` | undefined) => void,
  transactionLabel?: string,
): {
  allowanceTxProps: TransactionProps;
  handleAllowance: (args: {
    formAmount?: bigint;
    covenantSignature?: `0x${string}`;
  }) => void;
  resetState: () => void;
} {
  const chainId = useChainIdFromPath();
  const [allowanceTxProps, setAllowanceTxProps] = useState<TransactionProps>({
    contractName: transactionLabel ?? `${token?.symbol} expenditure approval`,
    message: "",
    status: "idle",
  });
  const [onSuccess, setOnSuccess] = useState<() => void>(noop);

  const { refetch: refetchAllowance } = useContractRead({
    chainId,
    address: token?.address as Address,
    abi: erc20ABI,
    args: [accountAddr as Address, spenderAddr],
    functionName: "allowance",
    enabled: !!token && accountAddr !== undefined,
  });

  const {
    writeAsync: writeAllowTokenAsync,
    transactionStatus,
    error: allowanceError,
  } = useContractWriteWithConfirmations({
    address: token?.address as Address,
    abi: erc20ABI,
    // args: [spenderAddr, amount],
    functionName: "approve",
    contractName: "ERC20",
    showNotification: false,
  });

  const handleAllowance = async (args: {
    formAmount?: bigint;
    covenantSignature?: `0x${string}`;
  }) => {
    const currentAllowance = await refetchAllowance();

    if (args.formAmount) {
      amount = args.formAmount;
    }
    if (currentAllowance?.data && currentAllowance.data > amount) {
      await delayAsync(1000);
      setAllowanceTxProps((x) => ({
        ...x,
        message: getTxMessage("success"),
        status: "success",
      }));
      triggerNextTx(args.covenantSignature);
    } else {
      if (currentAllowance?.data) {
        // Already found allowance but not enough, need to reset allowance
        setAllowanceTxProps({
          contractName: `${token?.symbol} allowance reset`,
          message: `Resetting allowance for ${token?.symbol} to 0`,
          status: "loading",
        });
        await writeAllowTokenAsync({ args: [spenderAddr, 0n] });
        setAllowanceTxProps({
          contractName:
            transactionLabel ?? `${token?.symbol} expenditure approval`,
          message: `Setting allowance for ${token?.symbol} of ${token ? (Number(amount) / 10 ** token.decimals).toPrecision(4) : ""}`,
          status: "idle",
        });
      }
      setOnSuccess(() => () => triggerNextTx(args.covenantSignature));
      await writeAllowTokenAsync({ args: [spenderAddr, amount] });
    }
  };

  useEffect(() => {
    setAllowanceTxProps((x) => ({
      ...x,
      message: getTxMessage(transactionStatus, allowanceError),
      status: transactionStatus ?? "idle",
    }));
    if (transactionStatus === "success") {
      delayAsync(2000).then(() => onSuccess());
    }
  }, [transactionStatus]);

  const resetState = () =>
    setAllowanceTxProps((x) => ({
      ...x,
      message: getTxMessage("idle"),
      status: "idle",
    }));

  return {
    allowanceTxProps,
    handleAllowance,
    resetState,
  };
}
