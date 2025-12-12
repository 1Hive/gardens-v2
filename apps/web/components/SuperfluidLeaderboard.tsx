"use client";

import type React from "react";
import { useState, useRef } from "react";
import { Dialog } from "@headlessui/react";
import {
  TrophyIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useAccount } from "wagmi";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { FormInput } from "@/components/Forms";
import { Modal } from "@/components/Modal";

interface LeaderboardEntry {
  address: string;
  fundUsd: number;
  streamUsd: number;
  fundPoints: number;
  streamPoints: number;
  superfluidActivityPoints: number;
  governanceStakePoints: number;
  farcasterPoints: number;
  totalPoints: number;
  farcasterUsername: string | null;
  ensName: string | null;
}

interface CampaignLeaderboardModalProps {
  openModal: boolean;
  setOpenModal: (_: boolean) => void;
  leaderboardData: LeaderboardEntry[];
}

function formatNumber(num: number): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function RankBadge({ rank }: { rank: number }) {
  const baseClasses =
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";

  if (rank === 1) {
    return (
      <span className={`${baseClasses} bg-yellow-100 text-yellow-700`}>
        <TrophyIcon className="h-3 w-3" />#{rank}
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className={`${baseClasses} bg-gray-200 text-gray-600`}>
        <TrophyIcon className="h-3 w-3" />#{rank}
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className={`${baseClasses} bg-amber-100 text-amber-700`}>
        <TrophyIcon className="h-3 w-3" />#{rank}
      </span>
    );
  }
  if (rank <= 5) {
    return (
      <span className={`${baseClasses} bg-gray-100 text-gray-600`}>
        <span className="h-2 w-2 rounded-full bg-gray-400" />#{rank}
      </span>
    );
  }
  return (
    <span className={`${baseClasses} bg-gray-100 text-gray-500`}>#{rank}</span>
  );
}

function getActivities(entry: LeaderboardEntry): string[] {
  const activities: string[] = [];
  if (entry.fundPoints >= 1) activities.push("Add Funds");
  if (entry.streamPoints >= 1) activities.push("Stream Funds");
  if (entry.governanceStakePoints >= 1) activities.push("Governance Stake");
  if (entry.farcasterPoints >= 1) activities.push("Farcaster");
  if (entry.superfluidActivityPoints >= 1)
    activities.push("Superfluid Activity");
  return activities;
}

function ScrollableActivities({ activities }: { activities: string[] }) {
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
            <Badge key={activity}>{activity}</Badge>
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
      entry.address.toLowerCase().includes(searchQuery.toLowerCase()) ??
      entry.ensName?.toLowerCase().includes(searchQuery.toLowerCase()) ??
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

  return (
    <Modal
      title="Superfluid Ecosystem Rewards"
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
      size="extra-large"
    >
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {currentUser && currentUserRank && (
          <div className="py-3 px-4 bg-primary/10 border-b border-primary/20 rounded-lg my-3">
            <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wide">
              Your Position
            </p>
            <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold">
                  #{currentUserRank}
                </div>
                <div>
                  <p className="font-semibold font-mono text-sm">
                    {currentUser.ensName ??
                      currentUser.farcasterUsername ??
                      currentUser.address}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Connected Wallet
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold font-mono text-sm">
                    {formatNumber(currentUser.totalPoints)}
                  </p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
                <div className="max-w-[200px]">
                  <ScrollableActivities
                    activities={getActivities(currentUser)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

          <FormInput
            // label="Search"
            type="text"
            value={searchQuery}
            onChange={(e: {
              target: { value: React.SetStateAction<string> };
            }) => setSearchQuery(e.target.value)}
            placeholder="Search by address, Ens"
            className="w-full h-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto rounded-lg border bg-card min-w-0">
          <table className="w-full table-fixed">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-3 px-3 font-medium w-[80px]">
                  Rank
                </th>
                <th className="text-left py-3 px-3 font-medium">Address</th>
                <th className="text-right py-3 px-3 font-medium w-[120px]">
                  Points
                </th>
                <th className="text-left py-3 px-3 font-medium w-[200px] hidden sm:table-cell">
                  Activities
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData?.map((entry, index) => {
                const rank = leaderboardData.indexOf(entry) + 1;
                const activities = getActivities(entry);
                const displayName =
                  entry.ensName ?? entry.farcasterUsername ?? entry.address;

                return (
                  <tr
                    key={entry.address}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="py-3 px-3">
                      <RankBadge rank={rank} />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-sm truncate">
                          {displayName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-mono font-semibold text-sm">
                        {formatNumber(entry.totalPoints)}
                      </span>
                    </td>
                    <td className="py-3 px-3 hidden sm:table-cell">
                      <ScrollableActivities activities={activities} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
