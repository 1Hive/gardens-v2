"use client";
import React, { FC } from "react";
import { StatusBadge } from "./Badge";
import { ActivatePoints } from "./ActivatePoints";
import { Strategy } from "./Proposals";
import { useTotalVoterStakedPct } from "@/hooks/useTotalVoterStakedPct";
import { useIsMemberActivated } from "@/hooks/useIsMemberActivated";
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
  const { isMemberActived } = useIsMemberActivated(strategy);
  const { address: connectedAccount } = useAccount();

  const { isConnected } = useAccount();

  const { data: memberPointsVotingPower } = useContractRead({
    address: communityAddress as Address,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "getMemberPowerInStrategy",
    args: [connectedAccount as Address, strategyAddress],
    watch: true,
  });

  const memberPointsInPool = (
    ((memberPointsVotingPower as bigint) ?? 0n) / PRECISION_SCALE
  ).toString();

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
    <section className="border2 flex  w-full flex-col rounded-xl bg-white px-12 py-4">
      <h3 className="font-semibold">Your Points</h3>
      <div className="flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-10">
            <span className="text-4xl">
              {isConnected
                ? isMemberActived
                  ? `${memberPointsInPool} pts`
                  : "0 pts"
                : ""}
            </span>

            <div className="flex flex-col items-center">
              <StatusBadge status={isMemberActived ? 1 : 0} classNames="" />
            </div>
          </div>
          <ActivatePoints
            strategyAddress={strategyAddress}
            isMemberActived={isMemberActived}
            communityAddress={communityAddress}
            isMember={isMember}
            // errorMemberActivated={errorMemberActivated}
          />
        </div>
      </div>
    </section>
  );
};
