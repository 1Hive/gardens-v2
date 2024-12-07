"use client";

import { FC, useEffect, useState } from "react";
import { FetchTokenResult } from "@wagmi/core";
import { useForm } from "react-hook-form";
import { parseUnits } from "viem";
import { Address, useAccount, useBalance } from "wagmi";
import { Allo } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { FormInput } from "./Forms";
import { Skeleton } from "./Skeleton";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { alloABI } from "@/src/generated";
import { getTxMessage } from "@/utils/transactionMessages";

interface PoolMetricsProps {
  poolAmount: number;
  communityAddress: Address;
  poolToken: FetchTokenResult;
  alloInfo: Allo;
  poolId: number;
  chainId: string;
}
type FormInputs = { amount: number };

export const PoolMetrics: FC<PoolMetricsProps> = ({
  alloInfo,
  poolAmount,
  communityAddress,
  poolToken,
  poolId,
  chainId,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormInputs>();

  const [isOpenModal, setIsOpenModal] = useState(false);
  const { address: accountAddress } = useAccount();
  const { publish } = usePubSubContext();
  const { data: balance } = useBalance({
    address: accountAddress,
    formatUnits: poolToken.decimals,
    token: poolToken.address,
    watch: true,
    chainId: Number(chainId),
  });

  const amount = +(watch("amount") ?? 0);
  const requestedAmount = parseUnits(amount.toString(), poolToken.decimals);
  const {
    write: writeFundPool,
    transactionStatus: fundPoolStatus,
    error: fundPoolError,
  } = useContractWriteWithConfirmations({
    address: alloInfo.id as Address,
    abi: alloABI,
    functionName: "fundPool",
    contractName: "Allo",
    showNotification: false,
    args: [BigInt(poolId), requestedAmount],
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
    () => writeFundPool(),
  );

  const { tooltipMessage, isButtonDisabled } = useDisableButtons([
    {
      message: "Connected account has insufficient balance",
      condition: balance && balance.value < requestedAmount,
    },
    {
      message: "Amount must be greater than 0",
      condition: amount <= 0,
    },
  ]);

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

  const handleFundPool = (data: FormInputs) => {
    setAddFundsTx((prev) => ({
      ...prev,
      message: getTxMessage("idle"),
      status: "idle",
    }));
    setIsOpenModal(true);
    handleAllowance({
      formAmount: parseUnits(data.amount.toString(), poolToken.decimals),
    });
  };
  return (
    <>
      <TransactionModal
        label={`Add funds in pool #${poolId}`}
        transactions={[allowanceTx, addFundsTx]}
        isOpen={isOpenModal}
        onClose={() => setIsOpenModal(false)}
      >
        <div className="flex gap-2 mb-4">
          <p>Adding:</p>
          <DisplayNumber
            number={amount.toString()}
            tokenSymbol={poolToken.symbol}
          />
        </div>
      </TransactionModal>
      <section className="section-layout gap-4 flex flex-col">
        <h2>Pool Funds</h2>
        <div className="flex justify-between items-center flex-wrap">
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              <p className="subtitle2">Funds in pool:</p>
              <DisplayNumber
                number={[BigInt(poolAmount), poolToken.decimals]}
                tokenSymbol={poolToken.symbol}
                compact={true}
                className="subtitle2 text-primary-content"
              />
            </div>
            {accountAddress && (
              <div className="flex gap-3">
                <p className="subtitle2">Wallet balance:</p>
                <Skeleton isLoading={!balance}>
                  <DisplayNumber
                    number={[balance?.value ?? BigInt(0), poolToken.decimals]}
                    tokenSymbol={poolToken.symbol}
                    compact={true}
                    className="subtitle2 text-primary-content"
                  />
                </Skeleton>
              </div>
            )}
          </div>
          <form
            className="flex gap-2 flex-wrap"
            onSubmit={handleSubmit(handleFundPool)}
          >
            <FormInput
              type="number"
              placeholder="0"
              required
              register={register}
              registerKey="amount"
              errors={errors}
              suffix={poolToken.symbol}
              otherProps={{
                max: balance?.formatted,
              }}
              registerOptions={{
                max: {
                  value: balance?.formatted ?? 0,
                  message: "Insufficient balance",
                },
              }}
            />
            <Button
              type="submit"
              disabled={isButtonDisabled}
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
