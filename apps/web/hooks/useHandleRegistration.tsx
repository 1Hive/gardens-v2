import { useState, useEffect, useCallback } from "react";
import { Address } from "wagmi";
import { useContractWriteWithConfirmations } from "./useContractWriteWithConfirmations";
import { TransactionProps } from "@/components/TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { registryCommunityABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abi";
import { getTxMessage } from "@/utils/transactionMessages";

export function useHandleRegistration(
  communityAddress: Address,
  communityName: string,
  urlChainId: number | undefined,
): {
  registrationTxProps: TransactionProps;
  handleRegistration: (covenantSig?: `0x${string}`) => void;
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
  } = useContractWriteWithConfirmations({
    address: communityAddress,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "stakeAndRegisterMember",
    args: [""], // Empty covenant signature as a default value
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
  }, [registerMemberTxStatus, registerMemberTxError, transactionData?.hash]);

  const handleRegistration = useCallback(
    (covenantSig?: `0x${string}`) => {
      writeRegisterMember({
        args: [covenantSig ?? "0x"], // Use empty string if covenantSig is undefined
      });
    },
    [writeRegisterMember],
  );

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
