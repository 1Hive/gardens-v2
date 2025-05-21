import { useCallback } from 'react';
import { Abi, TransactionReceipt } from 'viem';
import { WriteContractMode } from '@wagmi/core';
import { UseContractWriteConfig } from 'wagmi';
import { useContractWriteWithConfirmations } from '@/hooks/useContractWriteWithConfirmations';
import { trackDivviReferral, isUserTrackedWithDivvi } from '@/utils/divvi';

export function useDivviContractWrite <
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
  const originalOnConfirmations = props.onConfirmations;
  
  const divviOnConfirmations = useCallback(
    (receipt: TransactionReceipt) => {
      if (originalOnConfirmations) {
        originalOnConfirmations(receipt);
      }
      
      if (!isUserTrackedWithDivvi() && receipt.transactionHash && props.chainId) {
        trackDivviReferral(receipt.transactionHash as `0x${string}`, +props.chainId);
      }
    },
    [originalOnConfirmations, props.chainId]
  );
  
  const result = useContractWriteWithConfirmations({
    ...props,
    onConfirmations: divviOnConfirmations,
  });
  
  const originalWrite = result.write;
  
  const writeWithDivvi = useCallback(
    (...args: Parameters<typeof originalWrite>) => {
      if (!isUserTrackedWithDivvi() && originalWrite) {
        originalWrite(...args);
      } else if (originalWrite) {
        originalWrite(...args);
      }
    },
    [originalWrite]
  );
  
  return {
    ...result,
    write: writeWithDivvi,
  };
}
