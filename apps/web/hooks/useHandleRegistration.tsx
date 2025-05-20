import { useState, useEffect, useCallback } from "react";
import { Address } from "wagmi";
import { TransactionProps } from "@/components/TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useDivviContractWrite } from "@/hooks/useDivviContractWrite"; 
import { registryCommunityABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abi";
import { getTxMessage } from "@/utils/transactionMessages";

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
      txHash: transactionData?.hash, // Add transaction hash to props
    }));
  }, [registerMemberTxStatus, registerMemberTxError, transactionData?.hash]);
  
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
