"use client";

import React, { useState } from "react";
import {
  ChevronUpIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import cn from "classnames";
import { Dnum } from "dnum";
import { Address, useAccount } from "wagmi";

import {
  CVStrategy,
  CVStrategyConfig,
  getMembersStrategyQuery,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { MemberStrategyData } from "./Proposals";
import {
  ActivatePoints,
  Badge,
  DisplayNumber,
  CheckSybil,
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
  strategy: Pick<CVStrategy, "id" | "sybil" | "poolId"> & {
    registryCommunity: { garden: Pick<TokenGarden, "symbol"> };
    config: Pick<CVStrategyConfig, "pointSystem" | "allowlist">;
  };
  communityAddress: Address;
  memberTokensInCommunity: bigint;
  isMemberCommunity: boolean;
  memberActivatedStrategy: boolean;
  membersStrategyData: getMembersStrategyQuery | undefined;
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
  const [triggerSybilCheckModalClose, setTriggerSybilCheckModalClose] =
    useState(false);

  const poolSystemDefinition: { [key: number]: string } = {
    0: "Fixed voting system. Every member has the same voting power, limited to their registration stake.",

    1: "Capped voting system. Your voting power increases with more tokens staked, but only up to a limit.",

    2: "Unlimited voting system. Your voting power is equal to your total staked tokens in the community.",

    3: "Quadratic voting system. Your voting power is equal to the square root of your total staked tokens in the community.",
  };

  return (
    <>
      <div className="-z-50">
        <div className="backdrop-blur-sm rounded-lg flex flex-col gap-2">
          <section className={"section-layout flex flex-wrap flex-col gap-4"}>
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
                      compact={true}
                      number={
                        [BigInt(memberTokensInCommunity), tokenDecimals] as Dnum
                      }
                    />
                    <InfoWrapper
                      tooltip={`${poolSystem > 0 ? "Stake more tokens to increase your\voting power in this pool." : "Fixed voting power"}`}
                      className="hidden md:block text-black"
                      size="sm"
                    />
                  </div>
                </div>

                {showPoolGovernanceData && (
                  <div className="w-full flex items-center justify-between">
                    <h4 className="subtitle2">Voting power:</h4>
                    <div className="flex items-center gap-1">
                      <p className="text-xl font-bold text-primary-content">
                        {memberPoolWeight?.toFixed(2)} %
                      </p>
                      <a
                        href="https://docs.gardens.fund/start-here/voting-power"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md hover:bg-neutral-soft dark:hover:bg-primary p-2"
                      >
                        <QuestionMarkCircleIcon className="h-6 w-6 text-primary-content" />
                      </a>
                    </div>
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
            <div className="flex items-center flex-col gap-2">
              <CheckSybil
                strategy={strategy}
                enableCheck={!memberActivatedStrategy}
                triggerClose={triggerSybilCheckModalClose}
              >
                <ActivatePoints
                  strategy={strategy}
                  communityAddress={communityAddress}
                  isMemberActivated={memberActivatedStrategy}
                  isMember={isMemberCommunity}
                  handleTxSuccess={() => setTriggerSybilCheckModalClose(true)}
                />
              </CheckSybil>
            </div>
            <Button
              onClick={() => setOpenGovDetails(!openGovDetails)}
              btnStyle="link"
              color="tertiary"
              icon={
                <ChevronUpIcon
                  className={`h-4 w-4 font-bold transition-transform duration-200 ease-in-out ${cn(
                    {
                      "rotate-180": !openGovDetails,
                    },
                  )} `}
                />
              }
            >
              {openGovDetails ? "Hide" : "View"} governance details
            </Button>
            {openGovDetails && membersStrategyData && (
              <PoolGovernanceDetails
                membersStrategyData={membersStrategyData}
              />
            )}
          </section>
        </div>
      </div>
    </>
  );
};

type MemberColumn = Column<getMembersStrategyQuery["memberStrategies"][0]>;

const PoolGovernanceDetails: React.FC<{
  membersStrategyData: getMembersStrategyQuery;
}> = ({ membersStrategyData }) => {
  const columns: MemberColumn[] = [
    {
      header: "Member",
      render: (member) => (
        <EthAddress
          address={
            Array.isArray(member?.member.memberCommunity) ?
              (member.member.memberCommunity[0]?.memberAddress as Address)
            : undefined
          }
          shortenAddress={true}
          actions="none"
          icon="ens"
          textColor="var(--color-grey-900)"
        />
      ),
    },
    {
      header: "Voting power used",
      render: (member) => {
        // Calculate total staked points from active (1) and disputed (5) proposals only
        const activeStakedPoints =
          member?.member.stakes?.reduce((sum, stake) => {
            return sum + BigInt(stake.amount);
          }, 0n) ?? 0n;

        return (
          <span>
            {calculatePercentageBigInt(
              activeStakedPoints,
              BigInt(member.activatedPoints),
            )}{" "}
            %
          </span>
        );
      },
      className: "flex justify-end",
    },
  ];

  return (
    <DataTable
      description="A list of all the community members and their activity in this pool."
      data={membersStrategyData.memberStrategies}
      columns={columns}
    />
  );
};
