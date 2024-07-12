"use client";

import { FC, useEffect, useRef, useState } from "react";
import { parseUnits } from "viem";
import { Address, useAccount, useContractRead } from "wagmi";
import { Button } from "./Button";
import { FormInput } from "./Forms";
import { TransactionModal, TransactionStep } from "./TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import useContractWriteWithConfirmations from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { alloABI, erc20ABI } from "@/src/generated";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { formatTokenAmount, MAX_RATIO_CONSTANT } from "@/utils/numbers";
import { Allo, getPoolDataQuery, TokenGarden } from "#/subgraph/.graphclient";

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

type LightCVStrategy = getPoolDataQuery["cvstrategies"][0];

type PoolStatsProps = {
  balance: string | number;
  strategyAddress: Address;
  strategy: LightCVStrategy;
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
  communityAddress,
  tokenGarden,
  spendingLimitPct,
  poolId,
}) => {
  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** tokenGarden?.decimals;

  const [amount, setAmount] = useState<number | string>();
  const { address: connectedAccount } = useAccount();
  const tokenSymbol = tokenGarden?.symbol;

  const { publish } = usePubSubContext();

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
    enabled: !!connectedAccount,
  });

  const { write: writeAllowToken, status: allowTokenStatus } =
    useContractWriteWithConfirmations({
      address: tokenGarden.address as Address,
      abi: abiWithErrors(erc20ABI),
      functionName: "approve",
    });

  useEffect(() => {
    if (allowTokenStatus === "success") {
      writeFundPool({
        args: [poolId, requestedAmount],
      });
    }
  }, [allowTokenStatus]);

  const { write: writeFundPool, status: fundPoolStatus } =
    useContractWriteWithConfirmations({
      address: alloInfo?.id as Address,
      abi: abiWithErrors(alloABI),
      functionName: "fundPool",
      onConfirmations: () => {
        publish({
          topic: "pool",
          type: "update",
          function: "fundPool",
          id: poolId,
          containerId: communityAddress,
          chainId: tokenGarden.chainId,
        });
      },
      onSuccess: () => {
        closeModal();
        setAmount(0);
        setPendingAllowance(false);
      },
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
      });
      setPendingAllowance(true);
    } else {
      writeContract?.();
      openModal();
    }
  };

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
      />
      <section className="section-layout ">
        <header>
          <h2>Pool Metrics</h2>
        </header>
        <div className="mt-4 flex justify-between">
          <div className="flex flex-col">
            <div className="flex justify-between">
              <div className="flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-10">
                    <div className="flex w-full items-baseline gap-8">
                      <h4 className="stat-title text-center text-xl font-bold">
                        Funds Available:
                      </h4>
                      <span className="stat-value text-center text-2xl font-bold">
                        {balance ?
                          formatTokenAmount(balance, tokenGarden?.decimals)
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
                    {`${((spendingLimitPct ?? 0) * MAX_RATIO_CONSTANT).toFixed(2)} %`}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start justify-center gap-4">
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
        </div>
      </section>
    </>
  );
};
