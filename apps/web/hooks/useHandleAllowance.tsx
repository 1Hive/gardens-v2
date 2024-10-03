import { useEffect, useState } from "react";
import { Address, useContractRead } from "wagmi";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { useContractWriteWithConfirmations } from "./useContractWriteWithConfirmations";
import { TransactionProps } from "@/components/TransactionModal";
import { erc20ABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abi";
import { getTxMessage } from "@/utils/transactionMessages";

export function useHandleAllowance(
  accountAddr: Address | undefined,
  tokenAddr: Address,
  tokenSymbol: string,
  spenderAddr: Address,
  amount: bigint,
  triggerNextTx: () => void,
): {
  allowanceTxProps: TransactionProps;
  handleAllowance: () => void;
  resetState: () => void;
} {
  const chainId = useChainIdFromPath();
  const [allowanceTxProps, setAllowanceTxProps] = useState<TransactionProps>({
    contractName: `${tokenSymbol} expenditure approval`,
    message: "",
    status: "idle",
  });

  const { refetch: refetchAllowance } = useContractRead({
    chainId,
    address: tokenAddr,
    abi: abiWithErrors(erc20ABI),
    args: [accountAddr as Address, spenderAddr],
    functionName: "allowance",
    enabled: accountAddr !== undefined,
  });

  const {
    write: writeAllowToken,
    transactionStatus,
    error: allowanceError,
  } = useContractWriteWithConfirmations({
    address: tokenAddr,
    abi: abiWithErrors(erc20ABI),
    args: [spenderAddr, amount],
    functionName: "approve",
    contractName: "ERC20",
    showNotification: false,
  });

  const handleAllowance = async () => {
    const newAllowance = await refetchAllowance();
    if (
      newAllowance.data === undefined ||
      (newAllowance.data as bigint) < amount
    ) {
      writeAllowToken();
    } else {
      setAllowanceTxProps({
        contractName: `${tokenSymbol} expenditure approval`,
        message: getTxMessage("success"),
        status: "success",
      });
      triggerNextTx();
    }
  };

  useEffect(() => {
    setAllowanceTxProps({
      contractName: `${tokenSymbol} expenditure approval`,
      message: getTxMessage(transactionStatus, allowanceError),
      status: transactionStatus ?? "idle",
    });
    if (transactionStatus === "success") {
      triggerNextTx();
    }
  }, [transactionStatus]);

  const resetState = () =>
    setAllowanceTxProps({
      contractName: `${tokenSymbol} expenditure approval`,
      message: getTxMessage("idle"),
      status: "idle",
    });

  return {
    allowanceTxProps,
    handleAllowance,
    resetState,
  };
}
