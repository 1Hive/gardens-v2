"use client";
import React, { FC } from "react";
import { StatusBadge } from "./Badge";
import { ActivatePoints } from "./ActivatePoints";
import { Strategy } from "./Proposals";
import { Address, useAccount, useContractRead } from "wagmi";
import { formatTokenAmount, PRECISION_SCALE } from "@/utils/numbers";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { registryCommunityABI } from "@/src/generated";

type PoolStatsProps = {
  strategyAddress: Address;
  strategy: Strategy;
  communityAddress: Address;
};

export const PointsComponent: FC<PoolStatsProps> = ({
  strategyAddress,
  strategy,
  communityAddress,
}) => {
  const { address: connectedAccount } = useAccount();

  const { data: memberPointsVotingPower } = useContractRead({
    address: communityAddress as Address,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "getMemberPowerInStrategy",
    args: [connectedAccount as Address, strategyAddress],
    watch: true,
  });

  const isValidAccount =
    connectedAccount !== undefined && connectedAccount !== null;

  const { data: isMemberActivated } = useContractRead({
    address: communityAddress as Address,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "memberActivatedInStrategies",
    args: [connectedAccount as Address, strategyAddress],
    watch: true,
  });

  console.log(isMemberActivated, "isMemberActivated");

  const memberPointsInPool = (
    ((memberPointsVotingPower as bigint) ?? 0n) / PRECISION_SCALE
  ).toString();

  //TODO: create a hook for this
  const registryContractCallConfig = {
    address: communityAddress,
    abi: abiWithErrors2(registryCommunityABI),
  };

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

  const showTokensValue =
    isMember && isMemberActivated !== undefined && isMemberActivated;

  return (
    <section className="border2 flex  w-full flex-col rounded-xl bg-white px-12 py-4">
      <h3 className="font-semibold">Your Tokens</h3>
      <div className="flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-10">
            <div className="flex items-center gap-2 font-semibold">
              {showTokensValue && (
                <>
                  <p
                    className={`text-4xl ${!isMemberActivated && "text-gray-300"}`}
                  >
                    {formatTokenAmount(
                      memberPointsInPool,
                      strategy.registryCommunity.garden.decimals,
                    )}
                  </p>
                  <span
                    className={`text-lg ${!isMemberActivated && "text-gray-300"}`}
                  >
                    {strategy.registryCommunity.garden.symbol}
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-col items-center">
              <StatusBadge status={isMemberActivated ? 1 : 0} classNames="" />
            </div>
          </div>
          <ActivatePoints
            strategyAddress={strategyAddress}
            isMemberActivated={isMemberActivated as boolean | undefined}
            isMember={isMember}
            // errorMemberActivated={errorMemberActivated}
          />
        </div>
      </div>
    </section>
  );
};
