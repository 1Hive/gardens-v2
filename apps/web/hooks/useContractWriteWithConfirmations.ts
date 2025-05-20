// hooks/useDivviContractWrite.ts
import { useCallback, useEffect } from 'react';
import { Abi, TransactionReceipt } from 'viem';
import { WriteContractMode } from '@wagmi/core';
import { UseContractWriteConfig } from 'wagmi';
import { useContractWriteWithConfirmations, ComputedStatus } from './useContractWriteWithConfirmations';
import { getDivviDataSuffix, trackDivviReferral, isUserTrackedWithDivvi } from '@/utils/divvi';

/**
 * This hook extends useContractWriteWithConfirmations to include Divvi referral tracking
 * for the first transaction a user makes.
 */
export function useDivviContractWrite
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
  // Create a wrapped onConfirmations callback that also tracks with Divvi
  const originalOnConfirmations = props.onConfirmations;
  
  const divviOnConfirmations = useCallback(
    (receipt: TransactionReceipt) => {
      // Call the original callback if it exists
      if (originalOnConfirmations) {
        originalOnConfirmations(receipt);
      }
      
      // Track the transaction with Divvi if this is the user's first transaction
      if (!isUserTrackedWithDivvi() && receipt.transactionHash && props.chainId) {
        trackDivviReferral(receipt.transactionHash as `0x${string}`, +props.chainId);
      }
    },
    [originalOnConfirmations, props.chainId]
  );
  
  // Use the original hook with our enhanced onConfirmations
  const result = useContractWriteWithConfirmations({
    ...props,
    onConfirmations: divviOnConfirmations,
  });
  
  // Enhance the write function to append Divvi referral data for first-time users
  const originalWrite = result.write;
  
  const writeWithDivvi = useCallback(
    (...args: Parameters<typeof originalWrite>) => {
      // Only append Divvi data for users who haven't been tracked yet
      if (!isUserTrackedWithDivvi() && originalWrite) {
        // Unfortunately we can't directly modify the transaction data here
        // because wagmi's useContractWrite doesn't expose that capability
        // We'll track the tx after it's confirmed instead
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
