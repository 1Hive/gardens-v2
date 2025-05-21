import { useState, useEffect, useCallback } from "react";
import { Address } from "wagmi";
import { TransactionProps } from "@/components/TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useDivviContractWrite } from "@/hooks/useDivviContractWrite";
import { registryCommunityABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abi";
import { getTxMessage } from "@/utils/transactionMessages";
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

export function useHandleRegistration(
  communityAddress: Address,
  communityName: string,
  urlChainId: number | undefined,
): {
  registrationTxProps: TransactionProps;
  handleRegistration: () => void;
  resetState: () => void;
} {
  const [registrationTxProps, setRegistrationTxProps] =
    useState<TransactionProps>(() => ({
      contractName: `Register in ${communityName}`,
      message: getTxMessage("idle"),
      status: "idle",
    }));
  const { publish } = usePubSubContext();
  
  const {
    write: writeRegisterMember,
    transactionStatus: registerMemberTxStatus,
    error: registerMemberTxError,
    transactionData,
  } = useDivviContractWrite({
    address: communityAddress,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "stakeAndRegisterMember",
    contractName: "Registry Community",
    chainId: urlChainId,
    showNotification: false,
    onConfirmations: useCallback(() => {
      publish({
        topic: "member",
        type: "add",
        containerId: communityAddress,
        function: "stakeAndRegisterMember",
        id: communityAddress,
        chainId: urlChainId,
      });
    }, [publish, communityAddress, urlChainId]),
  });
  
  useEffect(() => {
    setRegistrationTxProps((prev) => ({
      ...prev,
      message: getTxMessage(registerMemberTxStatus, registerMemberTxError),
      status: registerMemberTxStatus ?? "idle",
      txHash: transactionData?.hash,
    }));
    
    // Track the transaction with Divvi if this is the user's first transaction and transaction is successful
    if (registerMemberTxStatus === "success" && transactionData?.hash && !isUserTrackedWithDivvi() && urlChainId) {
      trackDivviReferral(transactionData.hash, urlChainId);
    }
  }, [registerMemberTxStatus, registerMemberTxError, transactionData?.hash, urlChainId]);
  
  const handleRegistration = useCallback(() => {
    writeRegisterMember();
  }, [writeRegisterMember]);
  
  const resetState = useCallback(() => {
    setRegistrationTxProps({
      contractName: `Register in ${communityName}`,
      message: getTxMessage("idle"),
      status: "idle",
    });
  }, [communityName]);
  
  return {
    registrationTxProps,
    handleRegistration,
    resetState,
  };
}
