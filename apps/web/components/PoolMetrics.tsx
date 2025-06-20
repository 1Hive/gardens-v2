"use client";

import { FC, FormEvent, useEffect, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { FetchTokenResult } from "@wagmi/core";
import Image from "next/image";
import { parseUnits } from "viem";
import { Address, useAccount, useBalance } from "wagmi";
import { Allo } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { FormInput } from "./Forms";
import { Skeleton } from "./Skeleton";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { GitcoinMatchingLogo } from "@/assets";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { alloABI } from "@/src/generated";
import { elegibleGG23pools } from "@/utils/matchingPools";
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
  const [amount, setAmount] = useState(0);

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
      <div className="col-span-12 lg:col-span-3 h-fit">
        <div className="backdrop-blur-sm rounded-lg">
          <section className="section-layout gap-2 flex flex-col">
            <h3>Pool Funds</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center gap-3">
                <p className="subtitle2">Funds in pool:</p>
                <DisplayNumber
                  number={[BigInt(poolAmount), poolToken.decimals]}
                  tokenSymbol={poolToken.symbol}
                  compact={true}
                  valueClassName="text-2xl mr-1 font-bold text-primary-content"
                  symbolClassName="text-primary-content"
                />
              </div>
              {accountAddress && (
                <div className="flex justify-between items-center ">
                  <p className="text-sm">Wallet balance:</p>
                  <Skeleton isLoading={!balance}>
                    <DisplayNumber
                      number={[balance?.value ?? BigInt(0), poolToken.decimals]}
                      tokenSymbol={poolToken.symbol}
                      compact={true}
                      valueClassName="text-black text-lg"
                      symbolClassName="text-sm text-black"
                    />
                  </Skeleton>
                </div>
              )}
            </div>

            {/* Input + Add funds Button */}
            <form
              className="flex gap-2 flex-wrap w-full"
              onSubmit={handleFundPool}
            >
              <FormInput
                type="number"
                placeholder="0"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                suffix={poolToken.symbol}
                step={0.000000000000000001}
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
              <div className="w-full">
                <Button
                  type="submit"
                  btnStyle="outline"
                  color="primary"
                  disabled={isButtonDisabled}
                  tooltip={tooltipMessage}
                  icon={<PlusIcon className="w-5 h-5" />}
                  className="w-full"
                >
                  Add Funds
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  );
};
