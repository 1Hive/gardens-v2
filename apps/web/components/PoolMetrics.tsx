"use client";

import { FC, FormEvent, useEffect, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { parseUnits } from "viem";
import { Address, useAccount, useBalance } from "wagmi";
import { Allo } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { EthAddress } from "./EthAddress";
import { FormInput } from "./Forms";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { alloABI } from "@/src/generated";
import { getTxMessage } from "@/utils/transactionMessages";

interface PoolMetricsProps {
  poolToken: {
    address: Address;
    symbol: string;
    decimals: number;
    balance: bigint;
    formatted: string;
  };
  alloInfo: Allo;
  poolId: number;
  chainId: number;
}

export const PoolMetrics: FC<PoolMetricsProps> = ({
  alloInfo,
  poolToken,
  poolId,
  chainId,
}) => {
  const [amount, setAmount] = useState(0);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const { address: accountAddress } = useAccount();

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
  });

  const { allowanceTxProps: allowanceTx, handleAllowance } = useHandleAllowance(
    accountAddress,
    poolToken,
    alloInfo.id as Address,
    requestedAmount,
    () => writeFundPool(),
  );

  const { data: walletBalance } = useBalance({
    address: accountAddress,
    formatUnits: poolToken.decimals,
    token: poolToken.address as Address,
    watch: true,
    chainId: chainId,
  });
  const hasInsufficientBalance =
    !!walletBalance?.formatted && +walletBalance.formatted < amount;

  const { tooltipMessage, isButtonDisabled } = useDisableButtons([
    {
      message: "Connected account has insufficient balance",
      condition: hasInsufficientBalance,
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
      <div className="col-span-12 xl:col-span-3 h-fit">
        <div className="backdrop-blur-sm rounded-lg">
          <section className="section-layout gap-2 flex flex-col">
            <h3>Pool Funds</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center gap-3 z-o">
                <p className="subtitle2">Funds in pool:</p>
                <EthAddress
                  address={poolToken.address as Address}
                  shortenAddress={true}
                  actions="none"
                  icon={false}
                  label={
                    <DisplayNumber
                      copiable
                      number={[poolToken.balance, poolToken.decimals]}
                      tokenSymbol={poolToken.symbol}
                      compact={true}
                      valueClassName="text-2xl mr-1 font-bold text-primary-content"
                      symbolClassName="text-primary-content"
                    />
                  }
                />
              </div>
              {accountAddress && (
                <div className="flex justify-between items-center">
                  <p className="text-sm">Wallet balance:</p>
                  <DisplayNumber
                    number={[
                      walletBalance?.value ?? BigInt(0),
                      poolToken.decimals,
                    ]}
                    tokenSymbol={poolToken.symbol}
                    compact={true}
                    valueClassName="text-black text-lg"
                    symbolClassName="text-sm text-black"
                    //tooltipClass="tooltip-left"
                  />
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
                  max: walletBalance?.formatted ? +walletBalance.formatted : 0,
                }}
                registerOptions={{
                  max: {
                    value: +hasInsufficientBalance,
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
                  className="w-full mt-1"
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
