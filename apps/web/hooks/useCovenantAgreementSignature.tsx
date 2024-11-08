import { useEffect, useState } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
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
  covenantSignature: `0x${string}` | undefined;
  handleSignature: () => void;
} {
  const [covenantSignatureState, setCovenantSignature] =
    useState<`0x${string}`>();
  const path = usePathname();
  const CovenantTitle = (
    <div className="flex gap-2">
      <a
        href={`${path}?covenant`}
        target="_blank"
        rel="noreferrer"
        className="text-primary-content subtitle2 flex items-center gap-1 hover:opacity-90"
      >
        Covenant Agreement
        <ArrowTopRightOnSquareIcon
          width={16}
          height={16}
          className="text-primary-content"
        />
      </a>
    </div>
  );
  const [covenantAgreementTxProps, setCovenantAgreementTxProps] =
    useState<TransactionProps>(() => ({
      contractName: CovenantTitle,
      message: getTxMessage("idle"),
      status: "idle",
    }));

  const { signMessage, isLoading } = useSignMessage({
    message: message,
    onSettled(data, error) {
      const customError = error as CustomError;
      if (error) {
        setCovenantAgreementTxProps({
          contractName: CovenantTitle,
          message: getTxMessage("error", error, customError?.details),
          status: "error",
        });
      } else if (data) {
        setCovenantAgreementTxProps({
          contractName: CovenantTitle,
          message: getTxMessage("success"),
          status: "success",
        });
        setCovenantSignature(data);
        triggerNextTx();
      }
    },
  });

  useEffect(() => {
    if (isLoading) {
      setCovenantAgreementTxProps({
        contractName: CovenantTitle,
        message: getTxMessage("loading"),
        status: "loading",
      });
    }
  }, [isLoading]);

  return {
    covenantAgreementTxProps,
    covenantSignature: covenantSignatureState,
    handleSignature: signMessage,
  };
}
