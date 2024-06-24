"use client";
import React from "react";
import { ActivatePoints } from "./ActivatePoints";
import { Address, useAccount, useContractRead } from "wagmi";
import { abiWithErrors2 } from "@/utils/abiWithErrors";
import { registryCommunityABI } from "@/src/generated";
import { CVStrategy } from "#/subgraph/.graphclient";
import { DisplayNumber } from "./DisplayNumber";
import { Dnum } from "dnum";
import { Badge } from "./Badge";

type PoolGovernanceProps = {
  memberPoolWeight: number;
  tokenDecimals: number;
  strategy: CVStrategy;
  communityAddress: Address;
  memberTokensInCommunity: string;
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
    <section className="section-layout">
      <div className="flex flex-col justify-between">
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
