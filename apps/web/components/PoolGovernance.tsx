"use client";

import React, { useState } from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
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
import { Column, PointSystems } from "@/types";
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
  const { address } = useAccount();
  const showVotingPowerBox =
    isMemberCommunity && memberActivatedStrategy && address;
  const poolSystem = strategy.config.pointSystem;
  const [triggerSybilCheckModalClose, setTriggerSybilCheckModalClose] =
    useState(false);

  const [openGovernanceDetailsModal, setOpenGovernanceDetailsModal] =
    useState(false);

  const poolSystemDefinition: { label: string; description: string }[] = [
    {
      label: "Fixed",
      description:
        "Every member has the same voting power, limited to their registration stake.",
    },
    {
      label: "Capped",
      description:
        "Your voting power increases with more tokens staked, but only up to a limit.",
    },
    {
      label: "Unlimited",
      description:
        "Your voting power is equal to your total staked tokens in the community.",
    },
    {
      label: "Quadratic",
      description:
        "Your voting power is equal to the square root of your total staked tokens in the community.",
    },
  ];

  return (
    <>
      <div className="rounded-lg flex flex-col gap-6 xl:max-h-16 ">
        {showVotingPowerBox && (
          <section className="section-layout flex flex-wrap flex-col gap-4 !bg-primary-soft dark:!bg-primary-soft-dark !border-primary-button dark:!border-primary-dark-border">
            <div className="flex justify-between items-center flex-wrap ">
              <h4>Your Voting Power</h4>
              <Badge status={memberActivatedStrategy ? 1 : 0} />

              <div className="flex w-full flex-col gap-1">
                <div className="flex w-full items-center justify-between gap-0">
                  <h4 className="text-3xl text-primary-content">
                    {memberPoolWeight?.toFixed(2)} VP
                  </h4>
                  <a
                    href="https://docs.gardens.fund/start-here/voting-power"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md hover:opacity-70 dark:hover:bg-primary p-2"
                  >
                    <QuestionMarkCircleIcon className="h-6 w-6 text-primary-content" />
                  </a>
                </div>
                <span className="text-xs sm:text-sm text-neutral-soft-content">
                  Your share of the pool’s 100 VP
                </span>
              </div>
            </div>
            {address && (
              <div className="flex-1 flex flex-col items-start gap-4 ">
                <div className="w-full h-[0.10px] bg-neutral-soft-content opacity-30" />
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
                      tooltip={`${poolSystem > 0 ? "Stake more tokens to \nincrease your voting \npower in this pool." : "Fixed voting power"}`}
                      className="hidden md:block text-black"
                      size="sm"
                    />
                  </div>
                </div>
                {/* TODO: add this section data  */}
                {/* <div className=" flex flex-col gap-2 w-full">
                  <div className="flex items-baseline justify-between w-full">
                    <p className="text-neutral-soft-content">Allocated</p>
                    <p>{} 55% (18.3 VP)</p>
                  </div>
                  <div className="flex items-baseline justify-between w-full">
                    <p className="text-neutral-soft-content">Available</p>
                    <p>45% (13.3 VP)</p>
                  </div>
                </div> */}
              </div>
            )}
          </section>
        )}
        {/* Activate-Deactivate Button */}
        <div className="section-layout ">
          <div className="flex items-start flex-col gap-4">
            <div className="flex items-center justify-between w-full gap-2">
              <h4 className="text-left">Governance</h4>
              <Badge color="info" label={PointSystems[poolSystem]} />
            </div>
            <InfoBox
              title={`${poolSystemDefinition[poolSystem].label}`}
              content={poolSystemDefinition[poolSystem].description}
              infoBoxType="info"
              className="flex-1 w-full"
            />
            {isMemberCommunity && memberActivatedStrategy && (
              <>
                <p className="text-xs sm:text-sm text-neutral-soft-content text-justify">
                  You have activated governance in this pool. Deactivate to
                  leave the pool and remove all your voting power.
                </p>

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
                    activate={false}
                  />
                </CheckSybil>
              </>
            )}

            <Button
              onClick={() =>
                setOpenGovernanceDetailsModal(!openGovernanceDetailsModal)
              }
              btnStyle="outline"
              color="tertiary"
              className="!w-full"
              // icon={<ChevronUpIcon className="h-4 w-4" />}
            >
              {openGovernanceDetailsModal ? "Close" : "Show"} Active Members
            </Button>

            {membersStrategyData && (
              <PoolGovernanceDetails
                membersStrategyData={membersStrategyData}
                openGovernanceDetailsModal={openGovernanceDetailsModal}
                setOpenGovernanceDetailsModal={setOpenGovernanceDetailsModal}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

type MemberColumn = Column<getMembersStrategyQuery["memberStrategies"][0]>;

const PoolGovernanceDetails: React.FC<{
  membersStrategyData: getMembersStrategyQuery;
  openGovernanceDetailsModal: boolean;
  setOpenGovernanceDetailsModal: (open: boolean) => void;
}> = ({
  membersStrategyData,
  openGovernanceDetailsModal,
  setOpenGovernanceDetailsModal,
}) => {
  const columns: MemberColumn[] = [
    {
      header: "Member",
      render: (member) => (
        <EthAddress
          address={
            Array.isArray(member.member.memberCommunity) ?
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
      title="Supporters Voting Power"
      setOpenModal={setOpenGovernanceDetailsModal}
      openModal={openGovernanceDetailsModal}
      description="A list of all the community members and their activity in this pool."
      data={membersStrategyData.memberStrategies}
      columns={columns}
    />
  );
};
