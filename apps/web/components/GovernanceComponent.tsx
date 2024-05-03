"use client";
import React, { FC } from "react";
import { StatusBadge } from "./Badge";
import { ActivatePoints } from "./ActivatePoints";
import { Strategy } from "./Proposals";
import { Address, useAccount, useContractRead } from "wagmi";
import { abiWithErrors2 } from "@/utils/abiWithErrors";
import { registryCommunityABI } from "@/src/generated";

type PoolGovernanceStatsProps = {
  strategyAddress: Address;
  strategy: Strategy;
  communityAddress: Address;
  memberPoolWeight: string | number;
  memberTokensInCommunity: string | number;
};

export const GovernanceComponent: FC<PoolGovernanceStatsProps> = ({
  strategyAddress,
  strategy,
  communityAddress,
  memberPoolWeight,
  memberTokensInCommunity,
}) => {
  const { address: connectedAccount } = useAccount();

  const registryContractCallConfig = {
    address: communityAddress,
    abi: abiWithErrors2(registryCommunityABI),
  };

  const { data: isMemberActivated } = useContractRead({
    ...registryContractCallConfig,
    functionName: "memberActivatedInStrategies",
    args: [connectedAccount as Address, strategyAddress],
    watch: true,
  });

  const { data: isMember } = useContractRead({
    ...registryContractCallConfig,
    functionName: "isMember",
    args: [connectedAccount as Address],
    watch: true,
  });

  const showPoolGovernanceData =
    isMember && isMemberActivated !== undefined && isMemberActivated;

  return (
    <section className="border2 flex w-full flex-col rounded-xl bg-white px-12 py-8">
      <h3 className="mb-6 font-semibold">Your Pool Governance</h3>
      <div className="flex flex-col justify-between px-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-10">
            <div className="flex w-full max-w-xl flex-col items-center gap-2 font-semibold">
              {showPoolGovernanceData ? (
                <>
                  <div className="flex w-full items-center gap-6">
                    <h5 className="">Total staked in community:</h5>
                    <p className="text-4xl">
                      {memberTokensInCommunity}
                      <span className="px-2 text-lg">
                        {strategy.registryCommunity.garden.symbol}
                      </span>
                    </p>
                  </div>
                  <div className="flex w-full items-center gap-6">
                    <h5 className="">Status:</h5>
                    <div>
                      <StatusBadge status={isMemberActivated ? 1 : 0} />
                    </div>
                  </div>
                  <div className="flex w-full items-baseline gap-6">
                    <h5 className="">Your governance weight:</h5>
                    <p className="text-4xl">
                      {memberPoolWeight}%{" "}
                      <span className="text-lg">of the pool </span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex w-full items-center gap-6">
                  <h5 className="">Status:</h5>
                  <div>
                    <StatusBadge status={isMemberActivated ? 1 : 0} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <ActivatePoints
            strategyAddress={strategyAddress}
            communityAddress={communityAddress}
            isMemberActivated={isMemberActivated as boolean | undefined}
            isMember={isMember}
          />
        </div>
      </div>
    </section>
  );
};
