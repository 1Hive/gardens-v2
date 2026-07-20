import { useCallback, useState } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { TransactionProps } from "@/components/TransactionModal";
import { getTxMessage } from "@/utils/transactionMessages";
import { signMessageWithProvider } from "@/utils/signMessageWithProvider";

interface CustomError extends Error {
  details?: string;
}

export function useCovenantAgreementSignature(
  message: string,
  triggerNextTx: (args: { covenantSignature: `0x${string}` }) => void,
): {
  covenantAgreementTxProps: TransactionProps;
  handleSignature: () => void;
} {
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

  const { address, connector } = useAccount();
  const [isSigning, setIsSigning] = useState(false);

  const handleSignature = useCallback(async () => {
    if (isSigning) return;

    setCovenantAgreementTxProps({
      contractName: CovenantTitle,
      message: getTxMessage("loading"),
      status: "loading",
    });
    setIsSigning(true);

    try {
      if (!address || !connector) {
        throw new Error("Connect your wallet before signing the covenant.");
      }

      const signature = await signMessageWithProvider({
        connector,
        account: address,
        message,
      });

      setCovenantAgreementTxProps({
        contractName: CovenantTitle,
        message: getTxMessage("success"),
        status: "success",
      });
      triggerNextTx({ covenantSignature: signature });
    } catch (error) {
      const customError = error as CustomError;
      if (error instanceof Error) {
        setCovenantAgreementTxProps({
          contractName: CovenantTitle,
          message: getTxMessage("error", error, customError?.details),
          status: "error",
        });
      }
    } finally {
      setIsSigning(false);
    }
  }, [address, connector, isSigning, message, triggerNextTx]);

  return {
    covenantAgreementTxProps,
    handleSignature,
  };
}
