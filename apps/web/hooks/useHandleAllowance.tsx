import { useEffect, useState } from "react";
import { Address, useContractRead } from "wagmi";
import {
  ComputedStatus,
  useContractWriteWithConfirmations,
} from "./useContractWriteWithConfirmations";
import { TransactionProps } from "@/components/TransactionModal";
import { erc20ABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abiWithErrors";

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
} {
  const [allowanceTxProps, setAllowanceTxProps] = useState<TransactionProps>({
    contractName: `${tokenSymbol} expenditure approval`,
    message: "",
    status: "idle",
  });

  const { refetch: refetchAllowance } = useContractRead({
    address: tokenAddr,
    abi: abiWithErrors(erc20ABI),
    args: [accountAddr, spenderAddr],
    functionName: "allowance",
    enabled: accountAddr !== undefined,
  });

  const { write: writeAllowToken, transactionStatus } =
    useContractWriteWithConfirmations({
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
      message: getTxMessage(transactionStatus),
      status: (transactionStatus as ComputedStatus) ?? "idle",
    });
    if (transactionStatus === "success") {
      triggerNextTx();
    }
  }, [transactionStatus]);

  return {
    allowanceTxProps,
    handleAllowance,
  };
}

export const getTxMessage = (transactionStatus: string | undefined) => {
  let message = "";
  switch (transactionStatus) {
    case "idle":
      message = "";
      break;
    case "waiting":
      message = "Waiting for signature...";
      break;
    case "loading":
      message = "Transaction in progress...";
      break;
    case "success":
      message = "Approved";
      break;
    case "error":
      message = "User rejected the request";
      break;
  }
  return message;
};
