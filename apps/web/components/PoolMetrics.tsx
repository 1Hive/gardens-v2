"use client";
import React, { FC, useState, useRef, useEffect } from "react";
import {
  Address,
  useAccount,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { MAX_RATIO_CONSTANT, formatTokenAmount } from "@/utils/numbers";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { alloABI, erc20ABI, registryCommunityABI } from "@/src/generated";
import { Button } from "./Button";
import { Allo, CVStrategy, TokenGarden } from "#/subgraph/.graphclient";
import { parseUnits } from "viem";
import { FormInput } from "./Forms";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { TransactionModal, TransactionStep } from "./TransactionModal";
import { chainDataMap } from "@/configs/chainServer";

const InitialTransactionSteps: TransactionStep[] = [
  {
    transaction: "Approve token expenditure",
    message: "waiting for signature",
    current: true,
    dataContent: "1",
    loading: false,
    stepClassName: "idle",
    messageClassName: "",
  },
  {
    transaction: "Add funds to pool ",
    message: "waiting for approval",
    dataContent: "2",
    current: false,
    stepClassName: "idle",
    messageClassName: "",
  },
];

type PoolStatsProps = {
  balance: string | number;
  strategyAddress: Address;
  strategy: CVStrategy;
  communityAddress: Address;
  tokenGarden: TokenGarden;
  pointSystem: string;
  spendingLimitPct?: number;
  alloInfo: Allo;
  poolId: number;
  chainId: number;
};

export const PoolMetrics: FC<PoolStatsProps> = ({
  alloInfo,
  balance,
  strategy,
  communityAddress,
  tokenGarden,
  spendingLimitPct,
  poolId,
  chainId,
}) => {
  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** tokenGarden?.decimals;

  const [amount, setAmount] = useState<number | string>();
  const { address: connectedAccount } = useAccount();
  const tokenSymbol = tokenGarden?.symbol;

  //modal ref
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const openModal = () => modalRef.current?.showModal();
  const closeModal = () => modalRef.current?.close();
  //

  const [pendingAllowance, setPendingAllowance] = useState<boolean | undefined>(
    false,
  );

  const requestedAmount = parseUnits(
    (amount ?? 0).toString(),
    tokenGarden?.decimals,
  );

  const { data: allowance } = useContractRead({
    address: tokenGarden.address as Address,
    abi: abiWithErrors2<typeof erc20ABI>(erc20ABI),
    args: [connectedAccount as Address, alloInfo?.id as Address],
    functionName: "allowance",
    watch: true,
  });

  const {
    data: allowTokenData,
    write: writeAllowToken,
    error: allowTokenError,
    status: allowTokenStatus,
  } = useContractWrite({
    address: tokenGarden.address as Address,
    abi: abiWithErrors(erc20ABI),
    functionName: "approve",
  });

  const { isSuccess: isWaitAllowanceSuccess, status: waitAllowTokenStatus } =
    useWaitForTransaction({
      confirmations: chainDataMap[chainId].confirmations,
      hash: allowTokenData?.hash,
    });

  useEffect(() => {
    if (isWaitAllowanceSuccess) {
      writeFundPool({
        args: [poolId, requestedAmount],
      });
    }
  }, [isWaitAllowanceSuccess]);

  const {
    data: fundPool,
    write: writeFundPool,
    status: fundPoolStatus,
  } = useContractWrite({
    address: alloInfo?.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "fundPool",
  });

  const writeContract = () => {
    writeAllowToken({
      args: [alloInfo?.id, requestedAmount],
    });
  };

  const handleFundPool = () => {
    openModal();
    if (requestedAmount <= (allowance ?? 0n)) {
      writeFundPool({
        args: [poolId, requestedAmount],
      }),
        setPendingAllowance(true);
    } else {
      writeContract?.();
      openModal();
    }
  };

  useEffect(() => {
    if (fundPoolStatus === "success") {
      closeModal();
      setAmount(0);
      setPendingAllowance(false);
    }
  }, [fundPoolStatus]);

  //disable button condition
  const requestesMoreThanAllowance =
    (allowance ?? 0n) > 0n && requestedAmount > (allowance ?? 0n);

  const disableIncPowerBtnCondition: ConditionObject[] = [
    {
      condition: requestesMoreThanAllowance,
      message: `You have a pending allowance of ${formatTokenAmount(allowance ?? 0n, tokenGarden?.decimals)} ${tokenSymbol}. In order to add more funds , plaese fund with pending allowance first`,
    },
  ];
  const { tooltipMessage, missmatchUrl } = useDisableButtons(
    disableIncPowerBtnCondition,
  );

  return (
    <>
      <TransactionModal
        ref={modalRef}
        label={`Add funds to pool`}
        initialTransactionSteps={InitialTransactionSteps}
        allowTokenStatus={allowTokenStatus}
        stepTwoStatus={fundPoolStatus}
        token={tokenSymbol}
        pendingAllowance={pendingAllowance}
        setPendingAllowance={setPendingAllowance}
      ></TransactionModal>
      <section className="border2 flex w-full justify-between rounded-xl bg-white px-12 py-8">
        <div className="flex flex-col">
          <h3 className="mb-6 font-semibold">Pool Metrics</h3>
          <div className="flex justify-between">
            <div className="flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-10">
                  <div className="flex w-full items-baseline gap-8">
                    <h4 className="stat-title text-center text-xl font-bold">
                      Funds Available:
                    </h4>
                    <span className="stat-value text-center text-2xl font-bold">
                      {balance
                        ? formatTokenAmount(balance, tokenGarden?.decimals)
                        : "0"}{" "}
                      {tokenGarden?.symbol}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex w-full items-baseline gap-8">
                <h4 className="stat-title text-center text-lg font-bold">
                  Spending Limit:
                </h4>
                <span className="stat-value ml-8 text-center text-xl">
                  {`${((spendingLimitPct || 0) * MAX_RATIO_CONSTANT).toFixed(2)} %`}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <FormInput
            type="number"
            placeholder="0"
            required
            className="pr-14"
            step={INPUT_TOKEN_MIN_VALUE}
            onChange={(e) => setAmount(Number(e.target.value))}
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
            disabled={
              missmatchUrl || !connectedAccount || requestesMoreThanAllowance
            }
            tooltip={tooltipMessage}
            onClick={handleFundPool}
          >
            Fund pool
          </Button>
        </div>
      </section>
    </>
  );
};
