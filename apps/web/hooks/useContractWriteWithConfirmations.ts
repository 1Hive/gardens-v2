import { chainDataMap } from "@/configs/chainServer";
import { useEffect } from "react";
import { TransactionReceipt } from "viem";
import { useChainId, useContractWrite, useWaitForTransaction } from "wagmi";

export default function useContractWriteWithConfirmations(
  props: Parameters<typeof useContractWrite>[0] & {
    onConfirmations?: (receipt: TransactionReceipt) => void;
    confirmations?: number;
  },
) {
  const chainId = useChainId();
  let propsWithChainId = { ...props, chainId: props.chainId ?? chainId };

  const txResult = useContractWrite(propsWithChainId as any);

  // Hook does not run unless hash is defined.
  const txWaitResult = useWaitForTransaction({
    hash: txResult.data?.hash,
    chainId: +propsWithChainId.chainId,
    confirmations:
      propsWithChainId.confirmations ??
      chainDataMap[+propsWithChainId.chainId].confirmations,
    onSuccess: propsWithChainId.onConfirmations,
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
