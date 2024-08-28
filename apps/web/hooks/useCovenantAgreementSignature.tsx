import { useEffect, useState, useCallback } from "react";
import { useSignMessage } from "wagmi";
import { TransactionProps } from "@/components/TransactionModal";
import { getTxMessage } from "@/utils/transactionMessages";

interface CustomError extends Error {
  details?: string;
}

export function useCovenantAgreementSignature(
  message: string,
  triggerNextTx: () => void,
): {
  covenantAgreementTxProps: TransactionProps;
  handleSignature: () => void;
} {
  const [covenantAgreementTxProps, setCovenantAgreementTxProps] =
    useState<TransactionProps>(() => ({
      contractName: "Covenant Agreement",
      message: getTxMessage("idle"),
      status: "idle",
    }));

  const {
    signMessage,
    isLoading,
    isSuccess,
    isError,
    error: covenantAgreementTxError,
  } = useSignMessage({
    message: message,
    onSettled(data, error) {
      const customError = error as CustomError;
      if (error) {
        setCovenantAgreementTxProps({
          contractName: "Covenant Agreement",
          message: getTxMessage("error", error, customError?.details),
          status: "error",
        });
      } else if (data) {
        setCovenantAgreementTxProps({
          contractName: "Covenant Agreement",
          message: getTxMessage("success"),
          status: "success",
        });
        triggerNextTx();
      }
    },
  });

  useEffect(() => {
    if (isLoading) {
      setCovenantAgreementTxProps({
        contractName: "Covenant Agreement",
        message: getTxMessage("loading"),
        status: "loading",
      });
    }
  }, [isLoading]);

  const handleSignature = useCallback(() => {
    signMessage();
  }, [signMessage]);

  return {
    covenantAgreementTxProps,
    handleSignature,
  };
}
