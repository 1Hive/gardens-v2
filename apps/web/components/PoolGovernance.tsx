"use client";

import React, { useState } from "react";
import { Dnum } from "dnum";
import { Address, useAccount } from "wagmi";
import {
  CVStrategy,
  CVStrategyConfig,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { MemberStrategyData } from "./Proposals";
import {
  ActivatePoints,
  Badge,
  DisplayNumber,
  CheckPassport,
  InfoBox,
  Button,
  EthAddress,
  DataTable,
  InfoWrapper,
} from "@/components/";
import { Column } from "@/types";
import { calculatePercentageBigInt } from "@/utils/numbers";

export type PoolGovernanceProps = {
  memberPoolWeight: number | undefined;
  tokenDecimals: number;
  strategy: Pick<CVStrategy, "id" | "sybilScorer" | "poolId"> & {
    registryCommunity: { garden: Pick<TokenGarden, "symbol"> };
    config: Pick<CVStrategyConfig, "pointSystem" | "allowlist">;
  };
  communityAddress: Address;
  memberTokensInCommunity: bigint;
  isMemberCommunity: boolean;
  memberActivatedStrategy: boolean;
  membersStrategyData: any;
};

export const PoolGovernance: React.FC<PoolGovernanceProps> = ({
  memberPoolWeight,
  tokenDecimals,
  strategy,
  communityAddress,
  memberTokensInCommunity,
  isMemberCommunity,
  memberActivatedStrategy,
  membersStrategyData,
}) => {
  const showPoolGovernanceData = isMemberCommunity && memberActivatedStrategy;
  const poolSystem = strategy.config.pointSystem;
  const [openGovDetails, setOpenGovDetails] = useState(false);
  const { address } = useAccount();

  const poolSystemDefinition: { [key: number]: string } = {
    0: "Fixed voting system. Every member has the same governance weight, limited to their registration stake.",

    1: "Capped voting system. Your governance weight increase with more tokens staked, but only up to a limit.",

    2: "Unlimited voting system. Your governance weight is equal to your tokens staked tokens in the community.",

    3: "Quadratic voting system. Your governance weight is equal to the square root of your stake in the community.",
  };

  return (
    <>
      <section className="section-layout flex flex-col gap-4 mb-10 ">
        <header className="flex justify-between flex-wrap">
          <h3>Governance</h3>
          <Badge status={memberActivatedStrategy ? 1 : 0} />
        </header>
        {address && (
          <div className="flex-1 flex flex-col items-start gap-1">
            <div className="w-full flex items-center justify-between">
              <h4 className="subtitle2">Your stake: </h4>
              <div className="flex items-center gap-1">
                <DisplayNumber
                  tokenSymbol={strategy.registryCommunity.garden.symbol}
                  valueClassName="text-primary-content"
                  symbolClassName="text-primary-content"
                  compact={true}
                  number={
                    [BigInt(memberTokensInCommunity), tokenDecimals] as Dnum
                  }
                />
                <InfoWrapper
                  tooltip={`${poolSystem > 0 ? "Stake more tokens to increase your\ngovernance weight in this pool." : "Fixed voting weight"}`}
                  className="hidden md:block text-black"
                  size="sm"
                />
              </div>

              {/* <Badge status={memberActivatedStrategy ? 1 : 0} /> */}
            </div>

            {showPoolGovernanceData && (
              <div className="w-full flex items-center justify-between">
                <h4 className="subtitle2">Voting weight:</h4>
                <p className="text-xl font-bold text-primary-content">
                  {memberPoolWeight?.toFixed(2)} %
                </p>
              </div>
            )}
          </div>
        )}
        <InfoBox
          title="Pool Voting System"
          content={poolSystemDefinition[poolSystem]}
          infoBoxType="info"
          className="flex-1 w-full"
        />

        {/* Activate-Deactivate Button */}
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
        {/* <Button
          btnStyle="outline"
          onClick={() => setOpenGovDetails(!openGovDetails)}
          disabled={membersStrategyData?.length === 0 ? true : false}
          tooltip="No activity in this pool yet."
          className="w-full"
        >
          {openGovDetails ? "Close" : "View"} Governance Details
        </Button>
        {openGovDetails && (
          <PoolGovernanceDetails membersStrategyData={membersStrategyData} />
        )} */}
      </section>
    </>
  );
};

type MemberColumn = Column<MemberStrategyData>;

const PoolGovernanceDetails: React.FC<{
  membersStrategyData: {
    id: string;
    activatedPoints: string;
    totalStakedPoints: string;
    member: {
      memberCommunity: {
        memberAddress: string;
      }[];
    };
  }[];
}> = ({ membersStrategyData }) => {
  const columns: MemberColumn[] = [
    {
      header: "Member",
      render: (member) => (
        <EthAddress
          address={
            Array.isArray(member?.member?.memberCommunity) ?
              (member?.member?.memberCommunity[0]?.memberAddress as Address)
            : undefined
          }
          actions="copy"
          shortenAddress={false}
          icon="ens"
        />
      ),
    },
    {
      header: "Voting weight used",
      render: (member) => (
        <span>
          {calculatePercentageBigInt(
            BigInt(member.totalStakedPoints),
            BigInt(member.activatedPoints),
          )}{" "}
          %
        </span>
      ),
      className: "flex justify-end pr-4",
    },
  ];

  return (
    <DataTable
      title="Pool Governance Details"
      description="A list of all the community members and their activity in the pool."
      data={membersStrategyData}
      columns={columns}
    />
  );
};
