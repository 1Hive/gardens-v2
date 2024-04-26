"use client";
import React, { FC, useState } from "react";
import { Strategy } from "./Proposals";
import { Address, useAccount, useContractRead, useContractWrite } from "wagmi";
import { formatTokenAmount } from "@/utils/numbers";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { alloABI, erc20ABI, registryCommunityABI } from "@/src/generated";
import { Button } from "./Button";
import { Allo, TokenGarden } from "#/subgraph/.graphclient";
import { parseUnits } from "viem";
import { FormInput } from "./Forms";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";

type PoolStatsProps = {
  balance: string | number;
  strategyAddress: Address;
  strategy: Strategy;
  communityAddress: Address;
  tokenGarden: TokenGarden;
  pointSystem: string;
  spendingLimit?: number;
  alloInfo: Allo;
  poolId: number;
};

const MIN_VALUE = 0.000000000001;

export const PoolMetrics: FC<PoolStatsProps> = ({
  alloInfo,
  balance,
  strategy,
  communityAddress,
  tokenGarden,
  spendingLimit,
  poolId,
}) => {
  const [amount, setAmount] = useState<number | string>();
  const { address: connectedAccount } = useAccount();

  const registryContractCallConfig = {
    address: communityAddress,
    abi: abiWithErrors2(registryCommunityABI),
  };

  //TODO: create a hook for this
  const {
    data: isMember,
    error,
    isSuccess,
  } = useContractRead({
    ...registryContractCallConfig,
    functionName: "isMember",
    args: [connectedAccount as Address],
    watch: true,
  });

  const { data: fundPool, write: writeFundPool } = useContractWrite({
    address: alloInfo?.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "fundPool",
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
    onSuccess: () =>
      writeFundPool({
        args: [
          poolId,
          parseUnits(amount ? amount.toString() : "0", tokenGarden?.decimals),
        ],
      }),
  });

  const writeContract = () => {
    writeAllowToken({
      args: [
        alloInfo?.id,
        parseUnits(amount ? amount.toString() : "0", tokenGarden?.decimals),
      ],
    });
  };

  const { tooltipMessage, missmatchUrl } = useDisableButtons();

  return (
    <>
      <section className="border2 flex w-full justify-between rounded-xl bg-white px-12 py-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">Metrics</h3>
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
                  Spendig Limit:
                </h4>
                <span className="stat-value ml-8 text-center text-xl">
                  {`${spendingLimit} %`}
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
            step={MIN_VALUE}
            onChange={(e) => setAmount(Number(e.target.value))}
            otherProps={{ step: MIN_VALUE, min: MIN_VALUE }}
          >
            <span className="absolute right-4 top-4 text-black">
              {tokenGarden.symbol}
            </span>
          </FormInput>
          <Button
            disabled={missmatchUrl || !connectedAccount}
            tooltip={tooltipMessage}
            onClick={() => writeContract()}
          >
            Fund pool
          </Button>
        </div>
      </section>
    </>
  );
};
