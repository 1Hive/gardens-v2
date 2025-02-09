"use client";

import React from "react";
import { Dnum } from "dnum";
import { Address, useAccount } from "wagmi";
import {
  CVStrategy,
  CVStrategyConfig,
  TokenGarden,
} from "#/subgraph/.graphclient";
import {
  ActivatePoints,
  Badge,
  DisplayNumber,
  CheckPassport,
  InfoBox,
} from "@/components/";

export type PoolGovernanceProps = {
  memberPoolWeight: number;
  tokenDecimals: number;
  strategy: Pick<CVStrategy, "id" | "sybilScorer" | "poolId"> & {
    registryCommunity: { garden: Pick<TokenGarden, "symbol"> };
    config: Pick<CVStrategyConfig, "pointSystem" | "allowlist">;
  };
  communityAddress: Address;
  memberTokensInCommunity: number;
  isMemberCommunity: boolean;
  memberActivatedStrategy: boolean;
};

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
  const { address } = useAccount();

  const poolSystemDefinition: { [key: number]: string } = {
    0: "This pool has a fixed voting system, meaning every member has the same governance weight, limited to their registration stake. Changing your stake in the community will not affect your governance weight in this pool.",

    1: "This pool has a capped voting system, allowing your governance weight to increase with more tokens staked, but only up to a limit. If you are below the cap, you can stake more tokens to increase your governance weight in this pool.",

    2: "This pool has an unlimited voting system, meaning your governance weight is equal to your tokens staked tokens in the community. Stake more tokens to increase your governance weight in this pool.",

    3: "This pool has a quadratic voting system, meaning your governance weight is equal to the square root of your stake in the community. Stake more tokens to increase your governance weight in this pool.",
  };

  return (
    <section className="section-layout flex flex-col gap-4">
      <header className="flex justify-between flex-wrap">
        <h2>Pool Governance</h2>
        <div className="flex flex-col gap-2">
          <CheckPassport
            strategy={strategy}
            enableCheck={!memberActivatedStrategy}
          >
            <ActivatePoints
              strategy={strategy}
              communityAddress={communityAddress}
              isMemberActivated={memberActivatedStrategy}
              isMember={isMemberCommunity}
            />
          </CheckPassport>
        </div>
      </header>
      {address && (
        <div className="flex flex-col justify-between items-start">
          <div className="flex flex-1 gap-10 flex-wrap">
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-6 flex-wrap">
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
                <div className="flex items-start gap-6">
                  <p className="subtitle2">Your voting weight:</p>
                  <p className="subtitle2 text-primary-content">
                    {memberPoolWeight.toFixed(2)} %
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <InfoBox
        content={poolSystemDefinition[poolSystem]}
        infoBoxType="info"
        className="flex-1 w-full"
      />
    </section>
  );
};
