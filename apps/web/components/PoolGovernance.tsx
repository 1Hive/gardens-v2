"use client";

import React from "react";
import { Dnum } from "dnum";
import { Address, useAccount, useContractRead } from "wagmi";
import { ActivatePoints } from "./ActivatePoints";
import { Badge } from "./Badge";
import { DisplayNumber } from "./DisplayNumber";
import { registryCommunityABI } from "@/src/generated";
import { LightCVStrategy } from "@/types";
import { abiWithErrors2 } from "@/utils/abiWithErrors";

type PoolGovernanceProps = {
  memberPoolWeight: number;
  tokenDecimals: number;
  strategy: LightCVStrategy;
  communityAddress: Address;
  memberTokensInCommunity: number;
};

export const PoolGovernance = ({
  memberPoolWeight,
  tokenDecimals,
  strategy,
  communityAddress,
  memberTokensInCommunity,
}: PoolGovernanceProps) => {
  const { address: connectedAccount } = useAccount();

  const registryContractCallConfig = {
    address: communityAddress,
    abi: abiWithErrors2(registryCommunityABI),
  };

  const { data: isMemberActivated } = useContractRead({
    ...registryContractCallConfig,
    functionName: "memberActivatedInStrategies",
    args: [connectedAccount as Address, strategy.id as Address],
    watch: true,
    enabled: !!connectedAccount,
  });

  const { data: isMember } = useContractRead({
    ...registryContractCallConfig,
    functionName: "isMember",
    args: [connectedAccount as Address],
    watch: true,
    enabled: !!connectedAccount,
  });

  const showPoolGovernanceData =
    isMember && isMemberActivated !== undefined && isMemberActivated;
  return (
    <section className="section-layout">
      <header>
        <h2>Pool Governance</h2>
      </header>
      <div className="mt-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-10">
            <div className="flex w-full max-w-xl flex-col items-center gap-2 font-semibold">
              {showPoolGovernanceData ? (
                <>
                  <div className="flex w-full items-center gap-6">
                    <h5 className="">Total staked in community:</h5>
                    <DisplayNumber
                      tokenSymbol={strategy.registryCommunity.garden.symbol}
                      className="text-2xl"
                      number={
                        [BigInt(memberTokensInCommunity), tokenDecimals] as Dnum
                      }
                    />
                    {/* <span className="px-2 text-lg">
                        {strategy.registryCommunity.garden.symbol}
                      </span> */}
                  </div>
                  <div className="flex w-full items-center gap-6">
                    <h5 className="">Status:</h5>
                    <div>
                      <Badge status={isMemberActivated ? 1 : 0} />
                    </div>
                  </div>
                  <div className="flex w-full items-baseline gap-6">
                    <h5 className="">Your governance weight:</h5>
                    <p className="text-3xl text-info">
                      {memberPoolWeight.toFixed(2)} %
                      <span className="text-lg text-black"> of the pool</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex w-full items-center gap-6">
                  <h5 className="">Status:</h5>
                  <div>
                    <Badge status={isMemberActivated ? 1 : 0} />
                  </div>
                </div>
              )}
            </div>
          </div>
          <ActivatePoints
            strategyAddress={strategy.id as Address}
            communityAddress={communityAddress}
            isMemberActivated={isMemberActivated as boolean | undefined}
            isMember={isMember}
          />
        </div>
      </div>
    </section>
  );
};
