"use client";

import React from "react";
import { Dnum } from "dnum";
import { Address } from "wagmi";
import {
  ActivatePoints,
  Badge,
  DisplayNumber,
  CheckPassport,
  InfoBox,
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

  const poolSystem = strategy.config.pointSystem;

  const poolSystemDefinition: { [key: number]: string } = {
    0: "This pool has a fixed points system, meaning every member has the same governance weight, limited to their registration stake.",
    1: "This pool has a capped points system, meaning your governance weight will increase but capped based to maximum of tokens you have staked.",
    2: "This pool has an unlimited points system, allowing you to increase your governance weight without restrictions as you stake more tokens.",
    3: "This pool has a quadratic points system, meaning your governance weight grows at a squared rate relative to the tokens you have staked.",
  };

  return (
    <section className="section-layout">
      <header className="flex justify-between">
        <h2>Pool Governance</h2>
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
      </header>
      <div className="mt-4 flex flex-col justify-between items-start">
        <div className="flex flex-1 gap-10">
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-6">
              <p className="subtitle2">Your stake in the community:</p>
              <DisplayNumber
                tokenSymbol={strategy.registryCommunity.garden.symbol}
                className="subtitle2 text-primary-content"
                number={
                  [BigInt(memberTokensInCommunity), tokenDecimals] as Dnum
                }
              />
              <Badge status={memberActivatedStrategy ? 1 : 0} />
            </div>
            {showPoolGovernanceData && (
              <div className="flex gap-6">
                <div className="flex flex-col items-start gap-1">
                  <p className="subtitle2">Your governance weight:</p>
                  <h2 className="text-primary-content">
                    {memberPoolWeight.toFixed(2)} %
                  </h2>
                </div>

                <InfoBox
                  content={poolSystemDefinition[poolSystem]}
                  infoBoxType="info"
                  classNames="flex-1 w-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
