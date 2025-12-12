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
    description: (
      <>
        Stay connected with the Gardens community and get updates on proposals
        and activities.{" "}
        <Link
          href="https://farcaster.xyz/gardens"
          target="_blank"
          rel="noreferrer"
          className="text-primary-content underline-offset-2 underline"
        >
          Follow Gardens on Farcaster
        </Link>
        .
      </>
    ),
    icon: <ChatBubbleLeftRightIcon className="h-5 w-5" />,
    activities: ["Farcaster Follow"],
    pointsInfo: "1 point",
  },
  {
    title: "Add Funds into a Funding Pool",
    description:
      "Stream funds into a Funding Pool, or for Pure Super Token Funding Pools, add funds either as a stream or a one-time transfer.",
    icon: <ArrowTrendingUpIcon className="h-5 w-5" />,
    activities: ["Add Funds"],
    pointsInfo: "1 point per $1 added",
  },
  {
    title: "Join a Community & Increase Your Stake",
    description:
      "Become an active member and increase your stake to support the ecosystem.",
    icon: <UsersIcon className="h-5 w-5" />,
    activities: ["Stake & Governance"],
    pointsInfo: "Total community points split based on stake size",
  },
  {
    title: "2x Bonus in Superfluid DAO",
    description: (
      <>
        Join the Superfluid DAO community, stake, and add funds to Funding Pools
        to maximize your rewards with double points.{" "}
        <Link
          href="https://app.gardens.fund/gardens/8453/0xa69f80524381275a7ffdb3ae01c54150644c8792/0xec83d957f8aa4e9601bc74608ebcbc862eca52ab"
          target="_blank"
          rel="noreferrer"
          className="text-primary-content underline underline-offset-2"
        >
          Join Superfluid Community
        </Link>
        .
      </>
    ),
    icon: <CurrencyDollarIcon className="h-5 w-5" />,
    activities: ["Superfluid DAO member"],
    highlighted: true,
    pointsInfo: "x2 points multiplier",
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
  const [openModal, setOpenModal] = useState(false);

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
                {loading ?
                  Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={`step-skeleton-${idx}`}
                      className="border1 rounded-lg bg-neutral dark:bg-[#3c5b4b] p-6 animate-pulse"
                    >
                      <div className="flex gap-4 items-start">
                        <div className="h-10 w-10 rounded-full bg-neutral-soft dark:bg-neutral-soft-content/30" />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="h-5 w-40 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                            <div className="flex gap-2">
                              <div className="h-5 w-16 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                              <div className="h-5 w-16 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                            </div>
                          </div>
                          <div className="h-4 w-full rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                          <div className="h-4 w-2/3 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                        </div>
                      </div>
                    </div>
                  ))
                : participationSteps.map((step) => (
                    <div
                      key={step.title}
                      className={`rounded-lg space-y-6 hover:shadow-md transition-all bg-neutral ${step.highlighted ? "bg-primary-soft border-[1px] border-primary-content dark:bg-[#3c5b4b] dark:border-primary-dark-border" : "border1"}`}
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
                            <p className=" leading-relaxed">
                              {step.description}
                            </p>
                            {step.pointsInfo && (
                              <p className="text-sm text-neutral-soft-content mt-2 text-right">
                                {step.pointsInfo}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* Right Column - Leaderboard */}
          <div className="lg:col-span-1">
            <div className="border1 rounded-lg bg-neutral p-6 sticky top-10 space-y-6">
              {loading ?
                <div className="animate-pulse space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-neutral-soft dark:bg-neutral-soft-content/30" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                      <div className="h-3 w-24 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-neutral-soft dark:bg-neutral-soft-content/20 space-y-3">
                    <div className="h-3 w-20 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                    <div className="flex items-center justify-between">
                      <div className="h-6 w-24 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                      <div className="h-6 w-16 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                    </div>
                  </div>
                  <div className="h-10 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                  <div className="space-y-3">
                    <div className="h-3 w-28 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                    <div className="h-2 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-24 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                      <div className="h-3 w-28 rounded bg-neutral-soft dark:bg-neutral-soft-content/30" />
                    </div>
                  </div>
                </div>
              : <>
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
                          <span className="text-2xl font-bold">
                            #{walletRank}
                          </span>

                          <span className="text-xs">
                            {shortenAddress(connectedAccount ?? "0x")}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className="font-bold text-xl">{walletPoints}</p>
                          <p className="text-xs ">Pts.</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => setOpenModal(true)}
                    >
                      <TrophyIcon className="h-5 w-5 mr-2" />
                      View Leaderboard
                    </Button>

                    <hr className="w-full mt-6 opacity-90 dark:opacity-70" />

                    <SuperfluidLeaderboardModal
                      leaderboardData={wallets}
                      openModal={openModal}
                      setOpenModal={setOpenModal}
                    />
                  </div>
                  {/* Campaign Stats */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between mb-2">
                      <span className="">Tokens Claimed</span>
                      <span className="font-medium">
                        {formatNumber(
                          superfluidStreamsData?.totalStreamedSup ?? 0,
                        )}{" "}
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
                            superfluidStreamsData?.snapshot?.updatedAt ??
                              undefined,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
