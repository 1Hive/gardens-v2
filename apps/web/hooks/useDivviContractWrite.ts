import { useCallback } from 'react';
import { Abi, TransactionReceipt } from 'viem';
import { WriteContractMode } from '@wagmi/core';
import { UseContractWriteConfig } from 'wagmi';
import { useContractWriteWithConfirmations } from '@/hooks/useContractWriteWithConfirmations';
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk';

// Divvi configuration constants
const DIVVI_CONSUMER = '0x809C9f8dd8CA93A41c3adca4972Fa234C28F7714' as `0x${string}`;
const DIVVI_PROVIDERS = [
  '0x0423189886d7966f0dd7e7d256898daeee625dca',
  '0x5f0a55fad9424ac99429f635dfb9bf20c3360ab8'
] as `0x${string}`[];

// Check if a user has already been tracked with Divvi
const isUserTrackedWithDivvi = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('divvi_tracked') === 'true';
};

// Track a transaction with Divvi
const trackDivviReferral = async (txHash: `0x${string}`, chainId: number): Promise<void> => {
  try {
    await submitReferral({
      txHash,
      chainId,
    });
    // Mark user as tracked in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('divvi_tracked', 'true');
    }
    console.log('Successfully tracked referral with Divvi:', txHash);
  } catch (error) {
    console.error('Error tracking referral with Divvi:', error);
  }
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
  chainId?: number;
}) {
  // Wrap the original onConfirmations to add Divvi tracking
  const originalOnConfirmations = props.onConfirmations;
  
  const divviOnConfirmations = useCallback(
    (receipt: TransactionReceipt) => {
      // Call the original onConfirmations callback if provided
      if (originalOnConfirmations) {
        originalOnConfirmations(receipt);
      }
      
      // Track the transaction with Divvi if this is the user's first transaction
      if (!isUserTrackedWithDivvi() && receipt.transactionHash && props.chainId) {
        trackDivviReferral(receipt.transactionHash as `0x${string}`, props.chainId);
      }
    },
    [originalOnConfirmations, props.chainId]
  );
  
  // Use the contract write hook with our enhanced confirmation callback
  const result = useContractWriteWithConfirmations({
    ...props,
    onConfirmations: divviOnConfirmations,
  });
  
  return result;
}
