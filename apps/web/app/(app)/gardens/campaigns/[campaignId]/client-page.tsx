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
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { SuperBanner, SuperLogo } from "@/assets";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { SuperfluidLeaderboardModal } from "@/components/SuperfluidLeaderboard";

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

type LeaderboardResponse = {
  cid: string;
  snapshot: {
    updatedAt?: string;
    wallets: Array<{
      address: string;
      superfluidActivityPoints?: number;
      governanceStakePoints?: number;
      [key: string]: any;
    }>;
  };
  totalStreamedSup: number;
  targetStreamSup: number;
};

/**
 * Fetch Superfluid leaderboard data from the API.
 * Returns `null` on any failure.
 */
async function fetchSuperfluidLeaderboard(): Promise<LeaderboardResponse | null> {
  try {
    const response = await fetch("/api/superfluid-stack/leaderboard", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error(
        "[fetchSuperfluidLeaderboard] Request failed",
        response.status,
        response.statusText,
      );
      return null;
    }

    const data = (await response.json()) as LeaderboardResponse;
    return data ?? null;
  } catch (error) {
    console.error("[fetchSuperfluidLeaderboard] Unexpected error:", error);
    return null;
  }
}

export default async function GardensGrowthInitiativePage() {
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
                  <UsersIcon className="h-6 w-6 " />
                  <span className="font-semibold">Onbaording participants</span>
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
              <h2 className="text-2xl font-bold mb-6">How to Participate</h2>

              <div className="space-y-4 p-6">
                {participationSteps.map((step) => (
                  <div
                    key={step.title}
                    className={`rounded-xl border-[1px] border-border-neutral  hover:shadow-md transition-all ${step.highlighted ? "border-2  border-primary-content bg-primary-soft" : ""}`}
                  >
                    <div className="p-6">
                      <div className="flex gap-4">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            step.highlighted ?
                              "bg-primary text-primary-foreground"
                            : "bg-muted "
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

            {/* Campaign Stats */}
            <div>
              <div className="section-layout">
                <h3 className="font-semibold text-lg mb-4">
                  Campaign Progress
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="">Tokens Claimed</span>
                    <span className="font-medium">0 / 848K SUP</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: "10%" }}
                    />
                  </div>
                  <p className="text-xs ">
                    oNBAORD participants earning rewards by contributing to the
                    Gardens ecosystem.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Leaderboard */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 section-layout">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrophyIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Leaderboard</h3>
                    <p className="text-sm ">Top contributors</p>
                  </div>
                </div>

                {/* Connected Account Section */}
                <div className="mb-6 py-2 rounded-lg bg-primary/10 border border-primary/20 border2">
                  <p className="text-xs  mb-2">Your Position</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">#12</span>
                      <span className="font-mono text-sm">0xmati...0x37</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">3k </p>
                      <p className="text-xs ">Points</p>
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
                <div className="space-y-3 mb-6">
                  {[
                    { rank: 1, address: "0x593c...5bB5", points: "55,047.295" },
                    { rank: 2, address: "0x3c8d...B4ae", points: "6,007.791" },
                    { rank: 3, address: "0xcBE3...2178", points: "4,603.527" },
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
                </div>

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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
