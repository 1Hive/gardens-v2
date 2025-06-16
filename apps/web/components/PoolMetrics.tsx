"use client";

import { FC, useEffect, useState } from "react";
import { erc20ABI, FetchTokenResult } from "@wagmi/core";
import { round } from "lodash-es";
import Image from "next/image";
import { parseUnits } from "viem";
import { arbitrum } from "viem/chains";
import { Address, useAccount, useBalance } from "wagmi";
import { Allo, CVStrategy } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { FormInput } from "./Forms";
import { Skeleton } from "./Skeleton";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { SupefluidStream } from "@/assets";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { usePoolAmount } from "@/hooks/usePoolAmount";
import { useSuperfluidStream } from "@/hooks/useSuperfluidStream";
import { getTxMessage } from "@/utils/transactionMessages";
// eslint-disable-next-line import/no-extraneous-dependencies
import sfMeta from "@superfluid-finance/metadata";
import { superTokenABI } from "@/src/generated";
import { superfluidCFAv1ForwarderAbi } from "@/src/customAbis";
import { delayAsync } from "@/utils/delayAsync";

interface PoolMetricsProps {
  strategy: Pick<CVStrategy, "id" | "poolId" | "token"> & {
    config: Pick<CVStrategy["config"], "superfluidToken">;
  };
  poolToken: FetchTokenResult;
  communityAddress: Address;
  alloInfo: Allo;
  chainId: string;
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

  const poolAmount = usePoolAmount({
    poolAddress: poolAddress,
    watch: true,
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
            (currentUserFlowRate ?? 0 - streamingAmountPerSecond).toFixed(0),
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

  const { allowanceTxProps: allowanceTx, handleAllowance } = useHandleAllowance(
    accountAddress,
    poolToken.address as Address,
    poolToken.symbol,
    config.superfluidToken as Address,
    requestedAmountBn,
    () => writeWrapFunds(),
  );

  const { tooltipMessage, isButtonDisabled } = useDisableButtons([
    {
      message: "Connected account has insufficient balance",
      condition: balance && balance.value < requestedAmountBn,
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
    handleAllowance({
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
    handleAllowance({
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
    <>
      <TransactionModal
        label={`Stream funds in pool #${poolId}`}
        transactions={[allowanceTx, wrapFundsTx, streamFundsTx]}
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
      <section className="section-layout gap-2 flex flex-col">
        <div className="flex items-center justify-between">
          <h2>Pool Funds</h2>
          {/* {poolId && elegibleGG23pools.includes(Number(poolId)) && (
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
          )} */}
        </div>
        <div className="flex justify-between items-center flex-wrap">
          <div className="flex flex-col gap-2">
            <div className="flex gap-3 items-center">
              <p className="subtitle2">Funds in pool:</p>
              <div className="flex items-center ">
                <Skeleton className="w-32 h-6" isLoading={poolAmount == null}>
                  <DisplayNumber
                    number={[poolAmount!, poolToken.decimals]}
                    tokenSymbol={poolToken.symbol}
                    compact={true}
                    className="subtitle2 text-primary-content"
                  />
                </Skeleton>
                {currentFlowRate && currentFlowRate > 0n && (
                  <div
                    className="tooltip"
                    data-tip={`Incoming Superfluid stream (+${currentFlowPerMonth}/month)`}
                  >
                    <Image
                      src={SupefluidStream}
                      alt="Incoming Stream"
                      width={40}
                      height={40}
                      className="mb-1"
                    />
                  </div>
                )}
              </div>
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
    </>
  );
};
