"use client";

import { FC, useEffect, useState } from "react";
import { parseUnits } from "viem";
import { Address, useAccount } from "wagmi";
import { Allo, TokenGarden } from "#/subgraph/.graphclient";
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
import { formatTokenAmount, MAX_RATIO_CONSTANT } from "@/utils/numbers";
import { getTxMessage } from "@/utils/transactionMessages";

interface PoolMetricsProps {
  poolAmount: number;
  communityAddress: Address;
  tokenGarden: Pick<TokenGarden, "symbol" | "decimals" | "address">;
  spendingLimitPct: number;
  alloInfo: Allo;
  poolId: number;
  chainId: string;
}

export const PoolMetrics: FC<PoolMetricsProps> = ({
  alloInfo,
  poolAmount,
  communityAddress,
  tokenGarden,
  spendingLimitPct,
  poolId,
  chainId,
}) => {
  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** tokenGarden.decimals;

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const { address: accountAddress } = useAccount();
  const { publish } = usePubSubContext();

  const requestedAmount = parseUnits(amount || "0", tokenGarden.decimals);

  const {
    write: writeFundPool,
    transactionStatus: fundPoolStatus,
    error: fundPoolError,
  } = useContractWriteWithConfirmations({
    address: alloInfo.id as Address,
    abi: abiWithErrors(alloABI),
    args: [BigInt(poolId), BigInt(amount)],
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
    tokenGarden.address as Address,
    tokenGarden.symbol,
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
          <DisplayNumber number={amount} tokenSymbol={tokenGarden.symbol} />
        </div>
      </TransactionModal>
      <section className="section-layout gap-8 flex flex-col">
        <header>
          <h2>Pool Metrics</h2>
        </header>
        <div className="flex justify-between">
          <div className="flex flex-col gap-6">
            <div className="flex gap-3 items-baseline">
              <h5>Funds Available:</h5>
              <p className="">
                {formatTokenAmount(poolAmount, tokenGarden.decimals)}{" "}
                {tokenGarden.symbol}
              </p>
            </div>
            <div className="flex gap-3 items-baseline">
              <h5>Spending Limit:</h5>
              <p className="">
                {`${(spendingLimitPct * MAX_RATIO_CONSTANT).toFixed(2)} %`}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <FormInput
              type="number"
              placeholder="0"
              required
              className="pr-14"
              step={INPUT_TOKEN_MIN_VALUE}
              onChange={(e) => setAmount(e.target.value)}
              otherProps={{
                step: INPUT_TOKEN_MIN_VALUE,
                min: INPUT_TOKEN_MIN_VALUE,
              }}
            >
              <span className="absolute right-4 top-4 text-black">
                {tokenGarden.symbol}
              </span>
            </FormInput>
            <Button
              disabled={missmatchUrl || !accountAddress}
              tooltip={tooltipMessage}
              onClick={handleFundPool}
            >
              Fund pool
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};
