"use client";
import React, { FC } from "react";
import { Strategy } from "./Proposals";
import { Address, useAccount, useContractRead } from "wagmi";
import { formatTokenAmount } from "@/utils/numbers";
import { abiWithErrors2 } from "@/utils/abiWithErrors";
import { registryCommunityABI } from "@/src/generated";

type PoolStatsProps = {
  balance: string | number;
  strategyAddress: Address;
  strategy: Strategy;
  communityAddress: Address;
  tokenGarden: any;
  pointSystem: string;
  spendingLimit?: number;
};

export const PoolMetrics: FC<PoolStatsProps> = ({
  balance,
  strategy,
  communityAddress,
  tokenGarden,
  spendingLimit,
}) => {
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

  return (
    <>
      <section className="border2 flex  w-full flex-col rounded-xl bg-white px-12 py-4">
        <h3 className="font-semibold">Metrics</h3>
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
                    : "0"}
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
      </section>
    </>
  );
};
