"use client";

import { useEffect, useState } from "react";
import {
  CalendarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  SparklesIcon,
  GiftIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { SuperBanner, SuperLogo, PlantBanner } from "@/assets";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { fetchSuperfluidLeaderboard } from "@/types";
import { formatNumber, timeAgo } from "@/utils/time";

interface Campaign {
  id: string;
  name: string;
  description: string;
  category: "Rewards" | "Grants" | "Airdrops";
  status: "active" | "ended";
  endDate: string;
  tokenAllocated?: number;
  tokenClaimed?: number;
  tokenSymbol?: string;
  participants?: number;
  ctaText: string;
  ctaLink: string;
  icon: React.ReactNode;
  color: string;
  showStats?: boolean;
  image?: string | StaticImageData;
  logo?: string;
}

const campaigns: Campaign[] = [
  {
    id: "1",
    name: "Superfluid Ecosystem Rewards",
    description:
      "Earn SUP rewards by staking governance tokens, adding funds to pools, and following Gardens on Farcaster.",
    category: "Rewards",
    status: "active",
    endDate: "25 Feb 2026",
    tokenAllocated: 847000,
    tokenClaimed: 0,
    tokenSymbol: "SUP",
    participants: 1243,
    ctaText: "How to participate",
    ctaLink: "/gardens/campaigns/1",
    icon: <SparklesIcon className="h-6 w-6" />,
    color: "bg-primary",
    showStats: true,
    image: SuperBanner,
    logo: SuperLogo,
  },
  // {
  //   id: "2",
  //   name: "Spinach.fi – USDGLO on Celo",
  //   description:
  //     "Join the liquidity race! 14 teams competing for $100 USDGLO daily rewards at 31% APR.",
  //   category: "Rewards",
  //   status: "active",
  //   endDate: "31 Dec 2024",
  //   tokenAllocated: 100,
  //   tokenClaimed: 0,
  //   tokenSymbol: "USDGLO/day",
  //   participants: 14,
  //   ctaText: "Add Liquidity",
  //   ctaLink: "https://www.spinach.fi/celo",
  //   icon: <CurrencyDollarIcon className="h-6 w-6" />,
  //   color: "bg-emerald-500",
  //   showStats: false,
  //   image: "/spinach-celo-liquidity-green.jpg",
  //   logo: "/spinach-logo.jpg",
  // },
  {
    id: "3",
    name: "Celo Ended example",
    description:
      "Join the liquidity race! 14 teams competing for $100 USDGLO daily rewards at 31% APR.",
    category: "Rewards",
    status: "ended",
    endDate: "31 Dec 2024",
    tokenSymbol: "USDGLO/day",
    participants: 14,
    ctaText: "Add Liquidity",
    ctaLink: "https://www.spinach.fi/celo",
    icon: <CurrencyDollarIcon className="h-6 w-6" />,
    color: "bg-emerald-500",
    showStats: false,
    image: "/spinach-celo-liquidity-green.jpg",
    logo: "/spinach-logo.jpg",
  },
];

export default function CampaignsPage() {
  const [totalStreamedSup, setTotalStreamedSup] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [walletCount, setWalletCount] = useState<number | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const res = await fetchSuperfluidLeaderboard();

      if (res) {
        setTotalStreamedSup(res.totalStreamedSup);
        setWalletCount(res.snapshot.wallets.length);

        setLastUpdated(res.snapshot.updatedAt ?? null);
      } else {
        setTotalStreamedSup(null);
        setLastUpdated(null);
      }

      setLoading(false);
    }

    load();
  }, []);

  const [activeStatus, setActiveStatus] = useState("active");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredCampaigns = campaigns.filter((c) => {
    const statusMatch =
      activeStatus === "active" ? c.status === "active" : c.status === "ended";
    const categoryMatch =
      activeCategory === "All" || c.category === activeCategory;
    return statusMatch && categoryMatch;
  });

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={PlantBanner}
            alt="Gardens landscape"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-neutral/5 via-neutral to-neutral/5 dark:from-neutral/30 dark:to-neutral/30" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-32">
          <h1 className="text-center font-bold mb-4">
            Gardens Ecosystem Campaigns
          </h1>
          <p className="mx-auto text-center text-lg ">
            Get rewarded for supporting your favorite communities on Gardens.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4">
        {/* Filters */}

        {/* Campaigns */}
        {filteredCampaigns.length > 0 ?
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-2 mb-12">
              <Button>Active</Button>
              <Button disabled>Ended</Button>
            </div>

            {filteredCampaigns.map((c) => (
              <Link
                key={c.id}
                href={c.ctaLink}
                target={c.ctaLink.startsWith("http") ? "_blank" : undefined}
                rel={c.ctaLink.startsWith("http") ? "noreferrer" : undefined}
                className="block section-layout !p-0 max-w-2xl rounded-xl overflow-hidden hover:shadow-lg transition group"
              >
                {/* Image */}
                <div className="relative h-48 w-full">
                  <Image
                    src={c.image ?? "/placeholder.svg"}
                    alt={c.name}
                    fill
                    className="object-cover !rounded-lg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral to-transparent" />

                  {c.logo && (
                    <div className="absolute top-4 left-4 h-12 w-12  rounded-xl p-2 shadow-md backdrop-blur">
                      <Image
                        src={c.logo}
                        alt={`${c.name} logo`}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-bold drop-shadow">{c.name}</h3>
                    <div className="flex items-center gap-2 text-sm mt-1 ">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Ends {c.endDate}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-sm  mb-4 line-clamp-3">{c.description}</p>

                  {c.showStats ?
                    <>
                      <Skeleton isLoading={loading} className="h-5 w-full mb-2">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="">Claimed</span>
                          <span className="font-medium">
                            {formatNumber(totalStreamedSup ?? 0)} /{" "}
                            {formatNumber(c.tokenAllocated ?? 0)}{" "}
                            {c.tokenSymbol}
                          </span>
                        </div>
                      </Skeleton>

                      <Skeleton
                        isLoading={loading}
                        className="h-2 w-full rounded-full mb-4"
                      >
                        <div className="h-2 bg-neutral-soft dark:bg-neutral-soft-content rounded-full overflow-hidden mb-4">
                          <div
                            className="h-full bg-primary-content transition-all"
                            style={{
                              width: `${
                                ((totalStreamedSup ?? 0) /
                                  (c.tokenAllocated ?? 10)) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <UserGroupIcon className="h-5 w-5 text-neutral-soft-content" />
                            <span className="text-neutral-soft-content text-sm">
                              {walletCount} participants
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-soft-content text-sm">
                              {" "}
                              Last updated: {timeAgo(lastUpdated ?? undefined)}
                            </span>
                          </div>
                        </div>
                      </Skeleton>
                    </>
                  : <div className="flex gap-2 flex-wrap mb-4">
                      <Badge color="info">
                        <CurrencyDollarIcon className="h-4 w-4" />
                        {c.tokenAllocated} {c.tokenSymbol}
                      </Badge>
                    </div>
                  }
                </div>
              </Link>
            ))}
          </div>
        : <div className="border border-border rounded-xl p-12 text-center">
            <GiftIcon className="h-12 w-12 mx-auto  mb-4" />
            <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
            <p className="">
              Try adjusting your filters to see available campaigns.
            </p>
          </div>
        }
      </div>
    </div>
  );
}
