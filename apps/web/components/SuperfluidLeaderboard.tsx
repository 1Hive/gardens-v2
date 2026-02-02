"use client";

import type React from "react";
import { useState, useRef } from "react";
import {
  TrophyIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { blo } from "blo";
import Image from "next/image";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { Badge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { WalletEntry } from "@/types";

interface CampaignLeaderboardModalProps {
  openModal: boolean;
  setOpenModal: (_: boolean) => void;
  leaderboardData: WalletEntry[];
}

type ActivityWithPoints = {
  label: string;
  points: number;
};

function RankBadge({ rank }: { rank: number }) {
  const baseClasses =
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";

  if (rank === 1) {
    return (
      <span className={`${baseClasses} bg-yellow-200 text-yellow-700`}>
        <TrophyIcon className="h-4 w-4" />#{rank}
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className={`${baseClasses} bg-gray-200 text-gray-600`}>
        <TrophyIcon className="h-4 w-4" />#{rank}
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className={`${baseClasses} bg-orange-200 text-amber-700`}>
        <TrophyIcon className="h-4 w-4" />#{rank}
      </span>
    );
  }

  return (
    <span
      className={`${baseClasses} bg-neutral-soft-content dark:bg-neutral-content text-neutral`}
    >
      #{rank}
    </span>
  );
}

function getActivities(entry: WalletEntry): ActivityWithPoints[] {
  const activities: ActivityWithPoints[] = [];
  if (entry.fundPoints >= 1)
    activities.push({ label: "Add Funds", points: entry.fundPoints });
  if (entry.streamPoints >= 1)
    activities.push({ label: "Stream Funds", points: entry.streamPoints });
  if (entry.governanceStakePoints >= 1)
    activities.push({
      label: "Governance Stake",
      points: entry.governanceStakePoints,
    });
  if (entry.farcasterPoints >= 1)
    activities.push({ label: "Farcaster", points: entry.farcasterPoints });
  if (entry.superfluidActivityPoints >= 1)
    activities.push({
      label: "Superfluid Activity",
      points: entry.superfluidActivityPoints,
    });
  return activities;
}

function ScrollableActivities({
  activities,
}: {
  activities: ActivityWithPoints[];
}) {
  const [isHovered, setIsHovered] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 120;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (activities.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left Arrow */}
      {isHovered && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border rounded-full p-1 shadow-sm hover:bg-background transition-opacity"
        >
          <ChevronLeftIcon className="h-3 w-3" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-scroll px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <div className="flex flex-row gap-1 flex-nowrap">
          {activities.map((activity) => (
            <Badge key={activity.label} tooltip={activity.points + " pts"}>
              <span className="text-xs font-bold text-nowrap">
                {activity.label}
              </span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Right Arrow */}
      {isHovered && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border rounded-full p-1 shadow-sm hover:bg-background transition-opacity"
        >
          <ChevronRightIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function SuperfluidLeaderboardModal({
  leaderboardData,
  openModal,
  setOpenModal,
}: CampaignLeaderboardModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { address: connectedAccount } = useAccount();

  const filteredData = leaderboardData?.filter(
    (entry) =>
      entry.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      entry.ensName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.farcasterUsername
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const currentUser =
    connectedAccount ?
      leaderboardData?.find(
        (entry) =>
          entry.address.toLowerCase() === connectedAccount.toLowerCase(),
      )
    : null;

  const currentUserRank =
    currentUser ? leaderboardData?.indexOf(currentUser) + 1 : null;

  const activities = currentUser ? getActivities(currentUser) : [];
  const currentAvatarSrc =
    currentUser ?
      currentUser.ensAvatar ?? blo(currentUser.address as Address)
    : null;

  const currentDisplayName =
    currentUser ?
      currentUser.ensName ??
      currentUser.farcasterUsername ??
      currentUser.address
    : "";

  return (
    <Modal
      title="Superfluid Ecosystem Rewards Leaderboard"
      footer={
        <div className="flex items-center justify-center w-full">
          <p className="text-sm text-center">
            Showing {filteredData?.length} of {leaderboardData?.length}{" "}
            participants
          </p>
        </div>
      }
      isOpen={openModal}
      onClose={() => setOpenModal(false)}
      size="ultra-large"
    >
      <div className="flex-1 overflow-visible flex flex-col gap-6 min-w-0">
        {currentUser && currentUserRank != null && (
          <div className="p-4 bg-primary-soft border-[1px] border-primary-content dark:bg-[#3c5b4b] dark:border-primary-dark-border rounded-xl flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-content text-neutral font-bold">
              #{currentUserRank}
            </div>
            <div className="flex items-center gap-4 w-full truncate">
              {currentAvatarSrc && (
                <Image
                  src={currentAvatarSrc}
                  alt={`${currentDisplayName} avatar`}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                />
              )}
              <p className="font-semibold font-mono text-sm w-full truncate">
                {currentDisplayName}
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="font-bold text-xl">{currentUser?.totalPoints}</p>
              <p className="text-xs ">Pts.</p>
            </div>
            <div className="flex gap-1 flex-wrap">
              {activities.map((activity) => (
                <Badge key={activity.label} tooltip={activity.points + " pts"}>
                  <span className="text-xs font-bold text-nowrap">
                    {activity.label}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 " />

          <input
            // label="Search"
            type="text"
            value={searchQuery}
            onChange={(e: {
              target: { value: React.SetStateAction<string> };
            }) => setSearchQuery(e.target.value)}
            placeholder="Search by address, Ens"
            className="border-[1px] border-neutral-content rounded-lg w-full h-10 px-8 bg-primary"
          />
        </div>

        <div className="flex-1 overflow-visible rounded-lg bg-card min-w-0">
          <div className="overflow-auto h-[60vh]">
            <table className="w-full min-w-[900px] table-fixed">
              <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-3 px-3 font-medium w-[80px] bg-card">
                    Rank
                  </th>
                  <th className="text-left py-3 px-3 font-medium max-w-[400px] bg-card">
                    Address
                  </th>
                  <th className="text-right py-3 px-3 font-medium max-w-[120px] bg-card">
                    Points
                  </th>
                  <th className="text-center py-3 px-3 font-medium max-w-[200px] hidden sm:table-cell bg-card">
                    Activities
                  </th>
                </tr>
              </thead>
              <tbody>
                {(filteredData ?? []).map((entry) => {
                  const rank = leaderboardData.indexOf(entry) + 1;
                  const displayName =
                    entry.ensName ?? entry.farcasterUsername ?? entry.address;
                  const ensAvatar = entry.ensAvatar;
                  const avatarSrc = ensAvatar ?? blo(entry.address as Address);
                  const activitiesTooltip = getActivities(entry)
                    .map(
                      (activity) => `${activity.label}: ${activity.points} pts`,
                    )
                    .join("\n");

                  return (
                    <tr
                      key={entry.address}
                      className="hover:bg-muted/30 transition-colors group h-[53px]"
                    >
                      <td className="py-3 px-3">
                        <RankBadge rank={rank} />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {avatarSrc && (
                            <Image
                              src={avatarSrc}
                              alt={`${displayName} avatar`}
                              width={24}
                              height={24}
                              className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                            />
                          )}
                          <span className=" text-sm truncate">
                            {displayName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className="font-semibold text-sm tooltip tooltip-top relative z-20 text-primary-content cursor-pointer"
                          data-tip={activitiesTooltip}
                        >
                          {entry.totalPoints}
                        </span>
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell">
                        <ScrollableActivities
                          activities={getActivities(entry)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
