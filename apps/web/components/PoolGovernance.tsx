"use client";

import React from "react";
import { Dnum } from "dnum";
import { Address } from "wagmi";
import {
  ActivatePoints,
  Badge,
  DisplayNumber,
  CheckPassport,
} from "@/components/";
import { LightCVStrategy } from "@/types";

interface PoolGovernanceProps {
  memberPoolWeight: number;
  tokenDecimals: number;
  strategy: LightCVStrategy;
  communityAddress: Address;
  memberTokensInCommunity: number;
  isMemberCommunity: boolean;
  memberActivatedStrategy: boolean;
}

export const PoolGovernance: React.FC<PoolGovernanceProps> = ({
  memberPoolWeight,
  tokenDecimals,
  strategy,
  communityAddress,
  memberTokensInCommunity,
  isMemberCommunity,
  memberActivatedStrategy,
}) => {
  const showPoolGovernanceData = isMemberCommunity && memberActivatedStrategy;

  return (
    <section className="section-layout">
      <header>
        <h2>Pool Governance</h2>
      </header>
      <div className="mt-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-10">
            <div className="flex w-full max-w-xl flex-col items-center gap-2 font-semibold">
              {showPoolGovernanceData ?
                <>
                  <div className="flex w-full items-center gap-6">
                    <h5>Total staked in community:</h5>
                    <DisplayNumber
                      tokenSymbol={strategy.registryCommunity.garden.symbol}
                      className="text-2xl"
                      number={
                        [BigInt(memberTokensInCommunity), tokenDecimals] as Dnum
                      }
                    />
                  </div>
                  <div className="flex w-full items-center gap-6">
                    <h5>Status:</h5>
                    <div>
                      <Badge status={memberActivatedStrategy ? 1 : 0} />
                    </div>
                  </div>
                  <div className="flex w-full items-baseline gap-6">
                    <h5>Your governance weight:</h5>
                    <p className="text-3xl text-info">
                      {memberPoolWeight.toFixed(2)} %
                      <span className="text-lg text-black"> of the pool</span>
                    </p>
                  </div>
                </>
              : <div className="flex w-full items-center gap-6">
                  <h5>Status:</h5>
                  <div>
                    <Badge status={memberActivatedStrategy ? 1 : 0} />
                  </div>
                </div>
              }
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <CheckPassport
              strategyAddr={strategy.id as Address}
              enableCheck={!memberActivatedStrategy}
            >
              <ActivatePoints
                strategyAddress={strategy.id as Address}
                communityAddress={communityAddress}
                isMemberActivated={memberActivatedStrategy}
                isMember={isMemberCommunity}
              />
            </CheckPassport>
          </div>
        </div>
      </div>
    </section>
  );
};
