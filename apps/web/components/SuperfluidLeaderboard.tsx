"use client";

import React, { useState } from "react";

import { Dialog } from "@headlessui/react";
import {
  TrophyIcon,
  StarIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

import { Button } from "@/components/Button";

interface LeaderboardEntry {
  rank: number;
  address: string;
  ensName?: string;
  points: number;
  activities: string[];
}

const leaderboardData: LeaderboardEntry[] = [
  {
    rank: 1,
    address: "0x593c...5bB5",
    points: 55047.295,
    activities: ["Staking", "Voting", "Proposals"],
  },
  {
    rank: 2,
    address: "0x3c8d...B4ae",
    points: 6007.791,
    activities: ["Staking", "Voting", "Referrals"],
  },
  {
    rank: 3,
    address: "0xcBE3...2178",
    points: 4603.527,
    activities: ["Staking", "Proposals"],
  },
  {
    rank: 4,
    address: "0x42ed...CE37",
    ensName: "gardens.eth",
    points: 4334.113,
    activities: ["Staking", "Voting", "Referrals", "Proposals"],
  },
  {
    rank: 5,
    address: "0xd733...d525",
    points: 3379.55,
    activities: ["Staking", "Voting"],
  },
];

const currentUser: LeaderboardEntry | null = {
  rank: 47,
  address: "0xYOUR...ADDR",
  points: 854.23,
  activities: ["Staking", "Voting"],
};

function formatNumber(num: number): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function RankBadge({ rank }: { rank: number }) {
  const base =
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";

  if (rank === 1)
    return (
      <span className={`${base} bg-yellow-100 text-yellow-700`}>
        <TrophyIcon className="h-3 w-3" />#{rank}
      </span>
    );

  if (rank === 2)
    return (
      <span className={`${base} bg-gray-200 text-gray-600`}>
        <StarIcon className="h-3 w-3" />#{rank}
      </span>
    );

  if (rank === 3)
    return (
      <span className={`${base} bg-amber-100 text-amber-700`}>
        <StarIcon className="h-3 w-3" />#{rank}
      </span>
    );

  return <span className={`${base} bg-gray-100 text-gray-500`}>#{rank}</span>;
}

function ActivityBadge({ activity }: { activity: string }) {
  const colors: Record<string, string> = {
    Staking: "bg-blue-50 text-blue-600 border-blue-200",
    Voting: "bg-purple-50 text-purple-600 border-purple-200",
    Proposals: "bg-green-50 text-green-600 border-green-200",
    Referrals: "bg-orange-50 text-orange-600 border-orange-200",
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded border ${colors[activity] || "bg-gray-50 text-gray-600 border-gray-200"}`}
    >
      {activity}
    </span>
  );
}

interface SuperfluidLeaderboardModalProps {
  trigger?: React.ReactNode;
  campaignName?: string;
  tokenSymbol?: string;
}

export function SuperfluidLeaderboardModal({
  trigger,
  campaignName = "Superfluid Ecosystem Rewards",
}: SuperfluidLeaderboardModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button size="sm">
            <TrophyIcon className="h-4 w-4 mr-2" />
            Leaderboard
          </Button>
        )}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="relative z-50"
      >
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-4xl bg-white rounded-xl shadow-xl max-h-[85vh] flex flex-col">
            <div className="border-b p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="text-xl">{campaignName}</Dialog.Title>
                <p className="text-sm text-muted-foreground">
                  Leaderboard Rankings
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Current User */}
              {currentUser && (
                <div className="py-3 px-4 bg-primary/10 border border-primary/20 rounded-lg mb-4">
                  <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wide">
                    Your Position
                  </p>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        #{currentUser.rank}
                      </div>
                      <div>
                        <p className="font-mono text-sm">
                          {currentUser.address}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Connected Wallet
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold font-mono text-sm">
                          {formatNumber(currentUser.points)}
                        </p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                      <div className="flex gap-1">
                        {currentUser.activities.map((a) => (
                          <ActivityBadge key={a} activity={a} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted/40 backdrop-blur">
                    <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-3 px-3 font-medium w-[70px]">
                        Rank
                      </th>
                      <th className="text-left py-3 px-3 font-medium">
                        Address
                      </th>
                      <th className="text-right py-3 px-3 font-medium w-[120px]">
                        Points
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {leaderboardData.map((entry) => (
                      <tr
                        key={entry.rank}
                        className="hover:bg-muted/20 transition"
                      >
                        <td className="py-3 px-3">
                          <RankBadge rank={entry.rank} />
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {entry.ensName ?? entry.address}
                            </span>

                            <a
                              href={`https://etherscan.io/address/${entry.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="opacity-50 hover:opacity-100 transition"
                            >
                              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            </a>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <span className="font-mono font-semibold text-sm">
                            {formatNumber(entry.points)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination (Static in this shortened version) */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">Page 1 of 1</p>

                <div className="flex items-center gap-2">
                  <Button size="sm" disabled>
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button size="sm" disabled>
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
