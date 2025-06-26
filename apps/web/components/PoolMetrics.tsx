"use client";

import { FC, useEffect, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
// eslint-disable-next-line import/no-extraneous-dependencies
import sfMeta from "@superfluid-finance/metadata";
import { erc20ABI } from "@wagmi/core";
import { round } from "lodash-es";
import { parseUnits } from "viem";
import { Address, useAccount, useBalance } from "wagmi";
import { CVStrategy } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { FormInput } from "./Forms";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { useSuperfluidStream } from "@/hooks/useSuperfluidStream";
import { superfluidCFAv1ForwarderAbi, superTokenABI } from "@/src/customAbis";
import { delayAsync } from "@/utils/delayAsync";
import { getTxMessage } from "@/utils/transactionMessages";

interface PoolMetricsProps {
  strategy: Pick<CVStrategy, "id" | "poolId" | "token"> & {
    config: Pick<CVStrategy["config"], "superfluidToken">;
  };
  poolToken: {
    address: Address;
    symbol: string;
    decimals: number;
    balance: bigint;
  };
  communityAddress: Address;
  poolId: number;
  chainId: number;
}

const secondsToMonth = 60 * 60 * 24 * 30;
const monthToSeconds = 1 / secondsToMonth;

export const PoolMetrics: FC<PoolMetricsProps> = ({
  strategy,
  poolToken,
  chainId,
}) => {
  const { config, id: poolAddress, poolId } = strategy;
  const [amount, setAmount] = useState(0);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const { address: accountAddress } = useAccount();
  const { data: balance } = useBalance({
    address: accountAddress,
    formatUnits: poolToken.decimals,
    token: poolToken.address,
    watch: true,
    enabled: !!accountAddress,
  });
  const { data: superTokenBalance } = useBalance({
    address: accountAddress,
    formatUnits: poolToken.decimals,
    token: config.superfluidToken as Address,
    watch: true,
    enabled: !!config.superfluidToken && !!accountAddress,
  });
  const requestedAmountBn = BigInt(
    (amount * 10 ** poolToken.decimals).toFixed(0),
  );
  const streamingAmountPerSecond =
    amount * monthToSeconds * 10 ** poolToken.decimals;

  const {
    currentFlowRate,
    currentUserFlowRate,
    setCurrentUserFlowRate,
    setCurrentFlowRate,
  } = useSuperfluidStream({
    receiver: poolAddress,
    superToken: config.superfluidToken as Address,
  });

  const { write: writeFundPool, isLoading: isSendFundsLoading } =
    useContractWriteWithConfirmations({
      address: poolToken.address,
      abi: erc20ABI,
      functionName: "transfer",
      contractName: "ERC20",
      args: [poolAddress as Address, requestedAmountBn],
    });

  const isSuperTokenBalanceSufficient =
    superTokenBalance && superTokenBalance.value >= requestedAmountBn;

  const streamingAmountPerSecondBN = BigInt(
    streamingAmountPerSecond.toFixed(0),
  );

  const {
    write: writeStreamFunds,
    transactionStatus: streamFundsStatus,
    error: streamFundsError,
    isLoading: isStreamFundsLoading,
  } = useContractWriteWithConfirmations({
    address: sfMeta.getNetworkByChainId(+chainId)?.contractsV1
      .cfaV1Forwarder as Address,
    abi: superfluidCFAv1ForwarderAbi,
    functionName: "createFlow",
    contractName: "SuperFluid Constant Flow Agreement",
    showNotification: isSuperTokenBalanceSufficient,
    args: [
      config.superfluidToken as Address,
      accountAddress as Address,
      poolAddress as Address,
      streamingAmountPerSecondBN,
      "0x",
    ],
    onConfirmations: () => {
      setCurrentFlowRate((old) => (old ?? 0n) + streamingAmountPerSecondBN);
      setCurrentUserFlowRate(streamingAmountPerSecond);
    },
  });

  const { writeAsync: writeStopStream, isLoading: isStopStreamLoading } =
    useContractWriteWithConfirmations({
      address: sfMeta.getNetworkByChainId(+chainId)?.contractsV1
        .cfaV1Forwarder as Address,
      abi: superfluidCFAv1ForwarderAbi,
      functionName: "deleteFlow",
      contractName: "SuperFluid Constant Flow Agreement",
      args: [
        config.superfluidToken as Address,
        accountAddress as Address,
        poolAddress as Address,
        "0x",
      ],
      onConfirmations: () => {
        setCurrentFlowRate(
          (old) => (old ?? 0n) - BigInt((currentUserFlowRate ?? 0).toFixed(0)),
        );
        setCurrentUserFlowRate(null);
      },
    });

  const {
    write: writeEditStream,
    transactionStatus: editStreamStatus,
    error: editStreamError,
    isLoading: isEditStreamLoading,
  } = useContractWriteWithConfirmations({
    address: sfMeta.getNetworkByChainId(+chainId)?.contractsV1
      .cfaV1Forwarder as Address,
    abi: superfluidCFAv1ForwarderAbi,
    functionName: "updateFlow",
    contractName: "SuperFluid Constant Flow Agreement",
    showNotification: isSuperTokenBalanceSufficient,
    args: [
      config.superfluidToken as Address,
      accountAddress as Address,
      poolAddress as Address,
      streamingAmountPerSecondBN,
      "0x",
    ],
    onConfirmations: () => {
      setCurrentFlowRate(
        (old) =>
          (old ?? 0n) +
          BigInt(
            ((currentUserFlowRate ?? 0) - streamingAmountPerSecond).toFixed(0),
          ),
      );
      setCurrentUserFlowRate(streamingAmountPerSecond);
    },
  });

  const {
    write: writeWrapFunds,
    transactionStatus: wrapFundsStatus,
    error: wrapFundsError,
  } = useContractWriteWithConfirmations({
    address: config.superfluidToken as Address,
    abi: superTokenABI,
    functionName: "upgrade",
    contractName: "SuperToken",
    showNotification: false,
    args: [requestedAmountBn],
    onConfirmations: async () => {
      await delayAsync(2000);
      if (currentUserFlowRate) {
        writeEditStream();
      } else {
        writeStreamFunds();
      }
    },
  });

  const {
    allowanceTxProps: wrapAllowanceTx,
    handleAllowance: handleWrapAllowance,
  } = useHandleAllowance(
    accountAddress,
    poolToken,
    config.superfluidToken as Address,
    requestedAmountBn,
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

  const [wrapFundsTx, setWrapFundsTx] = useState<TransactionProps>({
    contractName: "Wrap funds",
    message: getTxMessage("idle"),
    status: "idle",
  });

  const [streamFundsTx, setStreamFundsTx] = useState<TransactionProps>({
    contractName: "Stream funds",
    message: getTxMessage("idle"),
    status: "idle",
  });

  useEffect(() => {
    setStreamFundsTx((prev) => ({
      ...prev,
      message: getTxMessage(streamFundsStatus, streamFundsError),
      status: streamFundsStatus ?? "idle",
    }));
  }, [streamFundsStatus, streamFundsError]);

  useEffect(() => {
    setStreamFundsTx((prev) => ({
      ...prev,
      message: getTxMessage(editStreamStatus, editStreamError),
      status: editStreamStatus ?? "idle",
    }));
  }, [editStreamStatus, streamFundsError]);

  useEffect(() => {
    setWrapFundsTx((prev) => ({
      ...prev,
      message: getTxMessage(wrapFundsStatus, wrapFundsError),
      status: wrapFundsStatus ?? "idle",
    }));
  }, [wrapFundsStatus]);

  const handleStreamFunds = async () => {
    // Check if super token balance is already sufficient
    if (isSuperTokenBalanceSufficient) {
      writeStreamFunds();
      return;
    }
    setWrapFundsTx((prev) => ({
      ...prev,
      message: getTxMessage("idle"),
      status: "idle",
    }));
    setIsStreamModalOpen(true);
    handleWrapAllowance({
      formAmount: parseUnits(amount.toString(), poolToken.decimals),
    });
  };

  const handleStreamEdit = async () => {
    // Check if super token balance is already sufficient
    if (isSuperTokenBalanceSufficient) {
      writeEditStream();
      return;
    }
    setWrapFundsTx((prev) => ({
      ...prev,
      message: getTxMessage("idle"),
      status: "idle",
    }));
    setIsStreamModalOpen(true);
    handleWrapAllowance({
      formAmount: parseUnits(amount.toString(), poolToken.decimals),
    });
  };

  const currentFlowPerMonth = round(
    (Number(currentFlowRate) / 10 ** poolToken.decimals) * secondsToMonth,
    4,
  );
  const currentUserFlowPerMonth = round(
    (Number(currentUserFlowRate) / 10 ** poolToken.decimals) * secondsToMonth,
    4,
  );

  return (
    <section>
      <TransactionModal
        label={`Stream funds in pool #${poolId}`}
        transactions={[wrapAllowanceTx, wrapFundsTx, streamFundsTx]}
        isOpen={isStreamModalOpen}
        onClose={() => setIsStreamModalOpen(false)}
      >
        <div className="flex items-center gap-2 mb-4">
          <p>Streaming:</p>
          <DisplayNumber
            number={amount.toString()}
            tokenSymbol={poolToken.symbol}
          />
          <p>for 1 month</p>
        </div>
      </TransactionModal>
      <div className="col-span-12 lg:col-span-3 h-fit">
        <div className="backdrop-blur-sm rounded-lg">
          <h3>Pool Funds</h3>
          {/* Input + Add funds Button */}

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
        </div>
        <div className="flex gap-2 flex-wrap">
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
          <Button
            type="button"
            btnStyle="outline"
            color="primary"
            disabled={isButtonDisabled}
            tooltip={tooltipMessage}
            isLoading={isSendFundsLoading}
            onClick={(ev) => {
              ev.preventDefault();
              writeFundPool();
            }}
          >
            Add Funds
          </Button>
          {config.superfluidToken &&
            (currentUserFlowRate ?
              amount ?
                <Button
                  type="button"
                  btnStyle="outline"
                  color="secondary"
                  disabled={!accountAddress}
                  tooltip={
                    !accountAddress ?
                      "Connect your wallet"
                    : `Connected wallet is already streaming funds to this pool (${currentUserFlowPerMonth}/month). Click to replace stream with new amount.`
                  }
                  showToolTip={true}
                  isLoading={isEditStreamLoading}
                  onClick={async (ev) => {
                    ev.preventDefault();
                    handleStreamEdit();
                  }}
                >
                  Replace stream
                </Button>
              : <Button
                  type="button"
                  btnStyle="outline"
                  color="danger"
                  disabled={!accountAddress}
                  tooltip={
                    !accountAddress ?
                      "Connect your wallet"
                    : `Connected wallet is already streaming funds to this pool (${currentUserFlowPerMonth}/month). Click to stop the stream.`
                  }
                  showToolTip={true}
                  onClick={async (ev) => {
                    ev.preventDefault();
                    writeStopStream();
                  }}
                  isLoading={isStopStreamLoading}
                >
                  Stop stream
                </Button>
            : <Button
                type="button"
                btnStyle="outline"
                color="secondary"
                disabled={isButtonDisabled}
                tooltip={
                  tooltipMessage ??
                  `Click to stream funds to this pool (${amount}/month)`
                }
                showToolTip={true}
                onClick={async (ev) => {
                  ev.preventDefault();
                  handleStreamFunds();
                }}
                isLoading={isStreamFundsLoading}
              >
                Stream funds
              </Button>)}
        </div>
      </div>
    </section>
  );
};
