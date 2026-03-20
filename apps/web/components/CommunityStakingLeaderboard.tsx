"use client";

import { useState } from "react";
import { TrophyIcon } from "@heroicons/react/24/outline";
import { FetchTokenResult } from "@wagmi/core";
import { Address } from "viem";
import { useContractRead } from "wagmi";
import { Button, DataTable, DisplayNumber, EthAddress } from "@/components";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { registryCommunityABI } from "@/src/generated";
import { Column } from "@/types";
import {
  calculatePercentageBigInt,
  formatCountWhenPlus1k,
} from "@/utils/numbers";

type MembersStaked = {
  id: string;
  memberAddress: string;
  stakedTokens: string;
};

type MemberColumn = Column<MembersStaked>;

type Props = {
  membersStaked: MembersStaked[] | undefined;
  tokenGarden: FetchTokenResult;
  communityName: string;
  communityStakedTokens: number | bigint;
  communityAddress: Address;
  isCouncilSafe: boolean;
  isCouncilMember: boolean;
  className?: string;
};

export function CommunityStakingLeaderboard({
  membersStaked,
  tokenGarden,
  communityName,
  communityStakedTokens,
  communityAddress,
  isCouncilSafe,
  isCouncilMember,
  className,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { publish } = usePubSubContext();
  const { tooltipMessage, isButtonDisabled } = useDisableButtons();
  const [kickingMemberAddress, setKickingMemberAddress] = useState<
    string | null
  >(null);
  const kickTooltip =
    isCouncilMember && !isCouncilSafe ? "Connect with Council Safe" : tooltipMessage;
  const canSeeKickControls = isCouncilMember || isCouncilSafe;
  const { data: isKickEnabled } = useContractRead({
    address: communityAddress,
    abi: registryCommunityABI,
    functionName: "isKickEnabled",
    enabled: canSeeKickControls,
  });
  const {
    write: writeKickMember,
    isLoading: isKickMemberLoading,
  } = useContractWriteWithConfirmations({
    address: communityAddress,
    abi: registryCommunityABI,
    contractName: "Registry Community",
    functionName: "kickMember",
    onConfirmations: () => {
      setKickingMemberAddress(null);
      publish({
        topic: "community",
        type: "update",
        id: communityAddress,
        function: "kickMember",
        containerId: communityAddress,
      });
      publish({
        topic: "member",
        type: "update",
        containerId: communityAddress,
      });
    },
    onError: () => {
      setKickingMemberAddress(null);
    },
  });

  const columns: MemberColumn[] = [
    {
      header: `Members (${formatCountWhenPlus1k(membersStaked?.length ?? 0)})`,
      render: (memberData: MembersStaked) => (
        <EthAddress
          address={memberData.memberAddress as Address}
          actions="copy"
          shortenAddress={true}
          icon="ens"
          textColor="var(--color-grey-900)"
        />
      ),
      className: "w-[55%] text-left",
    },
    {
      header: "Staked tokens",
      render: (memberData: MembersStaked) => (
        <div className="flex items-baseline justify-end gap-2">
          <p className="text-xs">
            (
            {calculatePercentageBigInt(
              BigInt(memberData.stakedTokens),
              BigInt(communityStakedTokens),
            )}
            %)
          </p>
          <DisplayNumber
            number={[BigInt(memberData.stakedTokens), tokenGarden.decimals]}
            compact={true}
            tokenSymbol={tokenGarden.symbol}
          />
        </div>
      ),
      className: "w-[25%] text-right [&_h6]:text-right",
    },
  ];

  if (canSeeKickControls) {
    columns.push({
      header: "Actions",
      render: (memberData: MembersStaked) => (
        <div className="flex justify-end">
          <Button
            btnStyle="ghost"
            color="danger"
            disabled={
              isButtonDisabled ||
              (isCouncilMember && !isCouncilSafe) ||
              !isKickEnabled
            }
            tooltip={
              !isKickEnabled ?
                "Kick is disabled for this community"
              : kickTooltip
            }
            tooltipClassName="tooltip-left"
            isLoading={
              isKickMemberLoading &&
              kickingMemberAddress?.toLowerCase() ===
                memberData.memberAddress.toLowerCase()
            }
            className="!w-auto whitespace-nowrap px-3 py-1.5"
            onClick={() => {
              setKickingMemberAddress(memberData.memberAddress);
              writeKickMember({
                args: [
                  memberData.memberAddress as Address,
                  memberData.memberAddress as Address,
                ],
              });
            }}
          >
            Kick
          </Button>
        </div>
      ),
      className: "w-[20%] text-right [&_h6]:text-right",
    });
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        btnStyle="outline"
        color="tertiary"
        icon={<TrophyIcon className="h-4 w-4" />}
        className={className}
      >
        Community Staking Leaderboard
      </Button>
      <DataTable
        openModal={isOpen}
        setOpenModal={setIsOpen}
        title={communityName + " Staking Leaderboard"}
        data={membersStaked as MembersStaked[]}
        description="Overview of all community members and the total amount of tokens they have staked."
        columns={columns}
        className="max-h-screen w-full"
        footer={
          <div className="flex justify-between items-center gap-2 mr-8 sm:mr-12">
            <p className="subtitle">Total Staked: </p>
            <DisplayNumber
              number={[BigInt(communityStakedTokens), tokenGarden.decimals]}
              compact={true}
              tokenSymbol={tokenGarden.symbol}
            />
          </div>
        }
      />
    </>
  );
}
