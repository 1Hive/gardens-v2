import { useEffect, useState } from "react";
import { Address, useContractRead } from "wagmi";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { useContractWriteWithConfirmations } from "./useContractWriteWithConfirmations";
import { TransactionProps } from "@/components/TransactionModal";
import { erc20ABI } from "@/src/generated";
import { delayAsync } from "@/utils/delayAsync";
import { getTxMessage } from "@/utils/transactionMessages";

export function useHandleAllowance(
  accountAddr: Address | undefined,
  tokenAddr: Address | undefined,
  tokenSymbol: string,
  spenderAddr: Address,
  amount: bigint,
  triggerNextTx: () => void,
): {
  allowanceTxProps: TransactionProps;
  handleAllowance: (formAmount?: bigint) => void;
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
    abi: erc20ABI,
    args: [accountAddr as Address, spenderAddr],
    functionName: "allowance",
    enabled: !!tokenAddr && accountAddr !== undefined,
  });

  const {
    write: writeAllowToken,
    transactionStatus,
    error: allowanceError,
  } = useContractWriteWithConfirmations({
    address: tokenAddr,
    abi: erc20ABI,
    // args: [spenderAddr, amount],
    functionName: "approve",
    contractName: "ERC20",
    showNotification: false,
  });

  const handleAllowance = async (formAmount?: bigint) => {
    const currentAllowance = await refetchAllowance();
    if (formAmount) {
      amount = formAmount;
    }
    if (!currentAllowance?.data || currentAllowance.data < amount) {
      writeAllowToken({ args: [spenderAddr, amount] });
    } else {
      await delayAsync(1000);
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
