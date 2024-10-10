"use client";

import { FC, useEffect, useState } from "react";
import { FetchTokenResult } from "@wagmi/core";
import { parseUnits } from "viem";
import { Address, useAccount } from "wagmi";
import { Allo } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { FormInput } from "./Forms";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { alloABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { getTxMessage } from "@/utils/transactionMessages";

interface PoolMetricsProps {
  poolAmount: number;
  communityAddress: Address;
  poolToken: FetchTokenResult;
  alloInfo: Allo;
  poolId: number;
  chainId: string;
}

export const PoolMetrics: FC<PoolMetricsProps> = ({
  alloInfo,
  poolAmount,
  communityAddress,
  poolToken,
  poolId,
  chainId,
}) => {
  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** poolToken.decimals;

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const { address: accountAddress } = useAccount();
  const { publish } = usePubSubContext();

  const requestedAmount = parseUnits(amount, poolToken.decimals);

  const {
    write: writeFundPool,
    transactionStatus: fundPoolStatus,
    error: fundPoolError,
  } = useContractWriteWithConfirmations({
    address: alloInfo.id as Address,
    abi: abiWithErrors(alloABI),
    args: [BigInt(poolId), requestedAmount],
    functionName: "fundPool",
    contractName: "Allo",
    showNotification: false,
    onConfirmations: () => {
      publish({
        topic: "pool",
        type: "update",
        function: "fundPool",
        id: poolId,
        containerId: communityAddress,
        chainId,
      });
    },
  });

  const { allowanceTxProps: allowanceTx, handleAllowance } = useHandleAllowance(
    accountAddress,
    poolToken.address as Address,
    poolToken.symbol,
    alloInfo.id as Address,
    requestedAmount,
    writeFundPool,
  );

  const { tooltipMessage, missmatchUrl } = useDisableButtons();

  const [addFundsTx, setAddFundsTx] = useState<TransactionProps>({
    contractName: "Add funds",
    message: getTxMessage("idle"),
    status: "idle",
  });

  useEffect(() => {
    setAddFundsTx((prev) => ({
      ...prev,
      message: getTxMessage(fundPoolStatus, fundPoolError),
      status: fundPoolStatus ?? "idle",
    }));
  }, [fundPoolStatus]);

  const handleFundPool = () => {
    setIsOpenModal(true);
    setAddFundsTx((prev) => ({
      ...prev,
      message: getTxMessage("idle"),
      status: "idle",
    }));
    handleAllowance();
  };

  return (
    <>
      <TransactionModal
        label={`Add funds in pool #${poolId}`}
        transactions={[allowanceTx, addFundsTx]}
        isOpen={isOpenModal}
        onClose={() => setIsOpenModal(false)}
      >
        <div className="flex gap-2">
          <p>Adding:</p>
          <DisplayNumber number={amount} tokenSymbol={poolToken.symbol} />
        </div>
      </TransactionModal>
      <section className="section-layout gap-4 flex flex-col">
        <h2>Pool Funds</h2>
        <div className="flex justify-between items-center flex-wrap">
          <div className="flex gap-3 items-baseline">
            <p className="subtitle2">Funds available:</p>
            <DisplayNumber
              number={[BigInt(poolAmount), poolToken.decimals]}
              tokenSymbol={poolToken.symbol}
              compact={true}
              className="subtitle2 text-primary-content"
            />
          </div>
          <form
            className="flex gap-2 flex-wrap"
            onSubmit={(e) => {
              e.preventDefault();
              handleFundPool();
            }}
          >
            <FormInput
              type="number"
              placeholder="0"
              required
              step={INPUT_TOKEN_MIN_VALUE}
              onChange={(e) => setAmount(e.target.value)}
              value={amount}
              otherProps={{
                step: INPUT_TOKEN_MIN_VALUE,
                min: INPUT_TOKEN_MIN_VALUE,
              }}
              suffix={poolToken.symbol}
            />
            <Button
              type="submit"
              disabled={missmatchUrl || !accountAddress}
              tooltip={tooltipMessage}
              className="min-w-[200px]"
            >
              Add Funds
            </Button>
          </form>
        </div>
      </section>
    </>
  );
};
