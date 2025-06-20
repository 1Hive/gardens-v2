"use client";

import { FC, FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { parseUnits } from "viem";
import { Address, useAccount } from "wagmi";
import { Allo } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { FormInput } from "./Forms";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { GitcoinMatchingLogo } from "@/assets";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { alloABI } from "@/src/generated";
import { elegibleGG23pools } from "@/utils/matchingPools";
import { getTxMessage } from "@/utils/transactionMessages";

interface PoolMetricsProps {
  poolToken: {
    address: Address;
    symbol: string;
    decimals: number;
    balance: bigint;
    formatted: string;
  };
  communityAddress: Address;
  alloInfo: Allo;
  poolId: number;
}

export const PoolMetrics: FC<PoolMetricsProps> = ({
  alloInfo,
  poolToken,
  communityAddress,
  poolId,
}) => {
  const [amount, setAmount] = useState(0);
  const chainId = useChainIdFromPath();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const { address: accountAddress } = useAccount();
  const { publish } = usePubSubContext();

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
      condition: !!poolToken.balance && poolToken.balance < requestedAmount,
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

  const handleFundPool = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setAddFundsTx((prev) => ({
      ...prev,
      message: getTxMessage("idle"),
      status: "idle",
    }));
    setIsOpenModal(true);
    handleAllowance({
      formAmount: parseUnits(amount.toString(), poolToken.decimals),
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
      <section className="section-layout gap-2 flex flex-col">
        <div className="flex items-center justify-between">
          <h2>Pool Funds</h2>
          {poolId && elegibleGG23pools.includes(Number(poolId)) && (
            <div className="flex flex-col items-center gap-2 py-2">
              <Image
                src={GitcoinMatchingLogo}
                alt="Gitcoin Matching Logo"
                width={100}
                height={60}
              />
              <p className="text-primary-content text-md font-bold">
                Eligible for GG23 matching
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center flex-wrap">
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              <p className="subtitle2">Funds in pool:</p>
              <DisplayNumber
                number={[poolToken.balance, poolToken.decimals]}
                tokenSymbol={poolToken.symbol}
                compact={true}
                valueClassName="subtitle2 text-primary-content"
              />
            </div>
            {accountAddress && (
              <div className="flex gap-3">
                <p className="subtitle2">Wallet balance:</p>
                <DisplayNumber
                  number={[poolToken.balance, poolToken.decimals]}
                  tokenSymbol={poolToken.symbol}
                  compact={true}
                  valueClassName="subtitle2 text-primary-content"
                />
              </div>
            )}
          </div>
          <form className="flex gap-2 flex-wrap" onSubmit={handleFundPool}>
            <FormInput
              type="number"
              placeholder="0"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              suffix={poolToken.symbol}
              step={0.000000000000000001}
              otherProps={{
                max: +poolToken.formatted,
              }}
              registerOptions={{
                max: {
                  value: +poolToken.formatted || 0,
                  message: "Insufficient balance",
                },
              }}
            />
            <Button
              type="submit"
              btnStyle="outline"
              color="primary"
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
