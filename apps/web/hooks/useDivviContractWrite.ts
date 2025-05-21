import { useCallback } from 'react';
import { Abi, TransactionReceipt } from 'viem';
import { WriteContractMode } from '@wagmi/core';
import { UseContractWriteConfig } from 'wagmi';
import { useContractWriteWithConfirmations } from '@/hooks/useContractWriteWithConfirmations';
import { getDataSuffix } from '@divvi/referral-sdk';

// Check if a user has already been tracked with Divvi
const isUserTrackedWithDivvi = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('divvi_tracked') === 'true';
};

export function useDivviContractWrite
  TAbi extends Abi | readonly unknown[], 
  TFunctionName extends string, 
  TMode extends WriteContractMode = undefined
>(props: UseContractWriteConfig<TAbi, TFunctionName, TMode> & {
  onConfirmations?: (receipt: TransactionReceipt) => void;
  confirmations?: number;
  contractName: string;
  showNotification?: boolean;
  fallbackErrorMessage?: string;
}) {
  // Divvi configuration constants
  const DIVVI_CONSUMER = '0x809C9f8dd8CA93A41c3adca4972Fa234C28F7714' as `0x${string}`;
  const DIVVI_PROVIDERS = [
    '0x0423189886d7966f0dd7e7d256898daeee625dca',
    '0x5f0a55fad9424ac99429f635dfb9bf20c3360ab8'
  ] as `0x${string}`[];
  
  // Use the base contract write hook
  const result = useContractWriteWithConfirmations({
    ...props,
    onConfirmations: props.onConfirmations
  });
  
  // Enhanced write function to add Divvi referral data
  const originalWrite = result.write;
  
  const writeWithDivvi = useCallback(
    (config?: any) => {
      if (originalWrite) {
        // If it's the user's first transaction and they're not already tracked
        if (!isUserTrackedWithDivvi()) {
          // Get Divvi data suffix
          const dataSuffix = getDataSuffix({
            consumer: DIVVI_CONSUMER,
            providers: DIVVI_PROVIDERS,
          });
          
          // This implementation depends on how your contract write function works
          // If it accepts a data parameter, we'd enhance it here
          // For now, we're just calling the original write function
          originalWrite(config);
        } else {
          // User is already tracked, proceed normally
          originalWrite(config);
        }
      }
    },
    [originalWrite]
  );
  
  return {
    ...result,
    write: writeWithDivvi,
  };
}
