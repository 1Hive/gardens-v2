"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  TrophyIcon,
  SparklesIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { Address, useAccount } from "wagmi";
import { SuperBanner, SuperLogo } from "@/assets";
import { EthAddress } from "@/components";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { SuperfluidLeaderboardModal } from "@/components/SuperfluidLeaderboard";
import { fetchSuperfluidLeaderboard, LeaderboardResponse } from "@/types";
import { shortenAddress } from "@/utils/text";
import { formatNumber, timeAgo } from "@/utils/time";

const participationSteps = [
  {
    title: "Follow Gardens on Farcaster",
    description:
      "Stay connected with the Gardens community and get updates on proposals and activities.",
    icon: <ChatBubbleLeftRightIcon className="h-5 w-5" />,
    activities: ["Farcaster Follow"],
  },
  {
    title: "Stream Funds into a Funding Pool",
    description:
      "Stream funds into a Funding Pool, or for Pure Super Token Funding Pools, add funds either as a stream or a one-time transfer.",
    icon: <ArrowTrendingUpIcon className="h-5 w-5" />,
    activities: ["Stream Funds"],
  },
  {
    title: "Join a Community & Increase Your Stake",
    description:
      "Become an active member and increase your stake to support the ecosystem.",
    icon: <UsersIcon className="h-5 w-5" />,
    activities: ["Stake & Governance"],
  },
  {
    title: "Encourage Community Participation",
    description:
      "Help grow the ecosystem by encouraging your community to stream funds or add funds to Super Token Funding Pools.",
    icon: <SparklesIcon className="h-5 w-5" />,
    activities: ["Add Funds", "Stream Funds"],
  },
  {
    title: "2x Bonus in Superfluid DAO",
    description:
      "Join the Superfluid DAO community, stake, and add funds to Funding Pools to maximize your rewards with double points.",
    icon: <CurrencyDollarIcon className="h-5 w-5" />,
    activities: ["Superfluid DAO member"],
    highlighted: true,
  },
];

type WalletEntry = {
  address: string;
  totalPoints?: number;
  [key: string]: any;
};

function getWalletRankAndPoints(
  address: string,
  rankingWallets: WalletEntry[],
): { rank: number; totalPoints: number } | null {
  const index = rankingWallets.findIndex(
    (w) => w.address.toLowerCase() === address.toLowerCase(),
  );

  if (index === -1) return null;

  return {
    rank: index + 1,
    totalPoints: rankingWallets[index].totalPoints ?? 0,
  };
}

export default function GardensGrowthInitiativePage() {
  const [superfluidStreamsData, setSuperfluidStreamsData] =
    useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [walletRank, setWalletRank] = useState<number | null>(null);
  const [walletPoints, setWalletPoints] = useState<number | null>(null);

  const { address: connectedAccount } = useAccount();

  const wallets = superfluidStreamsData?.snapshot?.wallets;

  //useEffects
  useEffect(() => {
    async function fetchPointsData() {
      setLoading(true);
      const result = await fetchSuperfluidLeaderboard();
      setSuperfluidStreamsData(result);
      setLoading(false);
    }

    fetchPointsData();
  }, [connectedAccount]);

  useEffect(() => {
    if (!connectedAccount) return;
    if (!wallets || wallets.length === 0) return;

    const result = getWalletRankAndPoints(connectedAccount, wallets);

    if (result) {
      setWalletRank(result.rank);
      setWalletPoints(result.totalPoints);
    } else {
      setWalletRank(null);
      setWalletPoints(null);
    }
  }, [connectedAccount, wallets]);

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={SuperBanner}
            alt="Gardens Growth Initiative"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-neutral/5 via-neutral to-neutral/5 dark:from-neutral/30 dark:to-neutral/30" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Link
            href="/gardens/campaigns"
            className="inline-flex items-center gap-2 text-sm  hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Campaigns
          </Link>

          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-2xl bg-background/90 backdrop-blur-sm p-4 shadow-lg flex-shrink-0">
              <Image
                src={SuperLogo}
                alt="Campaign logo"
                fill
                className="object-contain p-1"
              />
            </div>

            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight mb-3">
                Superfluid Ecosystem Rewards
              </h1>
              <p className="text-lg  max-w-3xl mb-6">
                Earn SUP tokens by adding tokens to funding pool, join and stake
                governance tokens in your favorite communities and help shape
                the future of decentralized funding.
              </p>

              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-6 w-6 " />
                  <span className="font-semibold">Ends 25 Feb 2025</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <CurrencyDollarIcon className="h-6 w-6 " />
                  <span className="font-semibold">847K SUP allocated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - How to Participate */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6 ml-6">
                How to Participate
              </h2>

              <div className="space-y-4 p-6">
                {participationSteps.map((step) => (
                  <div
                    key={step.title}
                    className={`rounded-xl border-[1px] border-border-neutral  hover:shadow-md transition-all bg-neutral ${step.highlighted ? "border-2  border-primary-content bg-primary-soft dark:bg-primary-dark-base dark:border-primary-dark-border" : ""}`}
                  >
                    <div className="p-6">
                      <div className="flex gap-4">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            step.highlighted ?
                              "bg-primary-soft dark:bg-primary-dark-base"
                            : ""
                          }`}
                        >
                          {step.icon}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="font-semibold text-lg">
                              {step.title}
                            </h3>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                              {step.activities.map((activity) => (
                                <Badge key={activity}>{activity}</Badge>
                              ))}
                            </div>
                          </div>
                          <p className=" leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Leaderboard */}
          <div className="lg:col-span-1">
            <div className="border1 rounded-lg bg-neutral p-6 sticky top-10 space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary-soft flex items-center justify-center ">
                    <TrophyIcon className="h-7 w-7 text-primary-content" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Leaderboard</h3>
                    <p className="text-sm text-neutral-soft-content ">
                      Top contributors
                    </p>
                  </div>
                </div>

                {/* Connected Account Section */}
                <div className="mb-6 p-4 rounded-lg bg-primary border-[1px]  border-primary-content">
                  <p className="text-xs mb-2">Your Position</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">#{walletRank}</span>

                      <span className="text-xs">
                        {shortenAddress(connectedAccount ?? "0x")}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className="font-bold text-xl">{walletPoints}</p>
                      <p className="text-xs ">Pts.</p>
                    </div>
                  </div>
                  {/* <div className="flex gap-1.5 mt-3 flex-wrap">
                    <Badge className="text-xs bg-blue-500/10 text-blue-700 border-blue-500/20">
                      Add Funds
                    </Badge>
                    <Badge className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                      Stream Funds
                    </Badge>
                    <Badge className="text-xs bg-purple-500/10 text-purple-700 border-purple-500/20">
                      Governance Stake
                    </Badge>
                  </div> */}
                </div>

                {/* Top 3 Preview */}
                {/* <div className="space-y-3 mb-6">
                    {[
                      {
                        rank: 1,
                        address: "0x593c...5bB5",
                        points: "55,047.295",
                      },
                      {
                        rank: 2,
                        address: "0x3c8d...B4ae",
                        points: "6,007.791",
                      },
                      {
                        rank: 3,
                        address: "0xcBE3...2178",
                        points: "4,603.527",
                      },
                    ].map((entry) => (
                      <div
                        key={entry.rank}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium ">#{entry.rank}</span>
                          <span className="font-mono">{entry.address}</span>
                        </div>
                        <span className="font-medium">{entry.points}</span>
                      </div>
                    ))}
                  </div> */}

                <SuperfluidLeaderboardModal
                  campaignName="Gardens Growth Initiative"
                  tokenSymbol="GDN"
                  trigger={
                    <Button className="w-full" size="lg">
                      <TrophyIcon className="h-5 w-5 mr-2" />
                      View Full Leaderboard
                    </Button>
                  }
                />
              </div>

              <div className="border-t border-border-neutral/70 dark:border-border-neutral/40" />

              {/* Campaign Stats */}
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="">Claimed</span>
                  <span className="font-medium">
                    {formatNumber(superfluidStreamsData?.totalStreamedSup ?? 0)}{" "}
                    / {formatNumber(847_000)} SUP
                  </span>
                </div>

                <div className="h-2 bg-neutral-soft dark:bg-neutral-soft-content rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-content transition-all"
                    style={{
                      width: `${
                        ((superfluidStreamsData?.totalStreamedSup ?? 0) /
                          847_000) *
                        100
                      }%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="h-5 w-5 text-neutral-soft-content" />
                    <span className="text-neutral-soft-content text-sm">
                      {superfluidStreamsData?.snapshot?.wallets.length}{" "}
                      participants
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-soft-content text-sm">
                      {" "}
                      Last updated:{" "}
                      {timeAgo(
                        superfluidStreamsData?.snapshot?.updatedAt ?? undefined,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
