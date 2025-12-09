"use client";

import { useState } from "react";
import {
  CalendarIcon,
  UserGroupIcon,
  TrophyIcon,
  ArrowRightIcon,
  SparklesIcon,
  GiftIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { SuperfluidLeaderboardModal } from "@/components/SuperfluidLeaderboard";

const STATUS_FILTERS = ["Ongoing", "Ended"];
const CATEGORIES = ["All", "Rewards", "Grants", "Airdrops"];

interface Campaign {
  id: string;
  name: string;
  description: string;
  category: "Rewards" | "Grants" | "Airdrops";
  status: "ongoing" | "ended";
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
  image?: string;
  logo?: string;
}

const campaigns: Campaign[] = [
  {
    id: "1",
    name: "Superfluid Ecosystem Rewards",
    description:
      "Earn SUP rewards by staking governance tokens, adding funds to pools, and following Gardens on Farcaster.",
    category: "Rewards",
    status: "ongoing",
    endDate: "25 Feb 2025",
    tokenAllocated: 847676,
    tokenClaimed: 89543,
    tokenSymbol: "SUP",
    participants: 1243,
    ctaText: "Start Earning",
    ctaLink: "/gardens",
    icon: <SparklesIcon className="h-6 w-6" />,
    color: "bg-primary",
    showStats: true,
    image: "/superfluid-streams-green-flow.jpg",
    logo: "/superfluid-logo.jpg",
  },
  {
    id: "2",
    name: "Spinach.fi – USDGLO on Celo",
    description:
      "Join the liquidity race! 14 teams competing for $100 USDGLO daily rewards at 31% APR.",
    category: "Rewards",
    status: "ongoing",
    endDate: "31 Dec 2024",
    tokenAllocated: 100,
    tokenClaimed: 0,
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

function formatNumber(num: number) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(0) + "K";
  return num.toString();
}

export default function CampaignsPage() {
  const [activeStatus, setActiveStatus] = useState("Ongoing");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredCampaigns = campaigns.filter((c) => {
    const statusMatch =
      activeStatus === "Ongoing" ?
        c.status === "ongoing"
      : c.status === "ended";
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
            src="/gardens-hero-lush-landscape.jpg"
            alt="Gardens landscape"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24">
          <h1 className="text-center font-bold mb-4">
            Gardens Ecosystem Campaigns
          </h1>
          <p className="mx-auto text-center text-xl">
            Get rewarded for supporting your favorite communities on Gardens.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-10">
          {/* Status */}
          <div className="flex gap-2">
            {STATUS_FILTERS.map((status) => (
              <Button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`rounded-full ${
                  activeStatus === status ? "bg-primary text-white" : ""
                }`}
              >
                {status}
                {status === "Ongoing" && (
                  <span className="ml-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </Button>
            ))}
          </div>

          {/* Categories */}
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={
                  activeCategory === cat ? "bg-primary text-white" : ""
                }
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrophyIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm ">Active Campaigns</p>
              <p className="text-xl font-semibold">
                {campaigns.filter((c) => c.status === "ongoing").length}
              </p>
            </div>
          </div>

          <div className=" rounded-xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-5 w-5 " />
            </div>
            <div>
              <p className="text-sm ">Total Rewards</p>
              <p className="text-xl font-semibold">
                {formatNumber(
                  campaigns.reduce((acc, c) => acc + c.tokenAllocated, 0),
                )}
                +
              </p>
            </div>
          </div>
        </div>

        {/* Campaigns */}
        {filteredCampaigns.length > 0 ?
          <div className="grid md:grid-cols-2 gap-6">
            {filteredCampaigns.map((c) => (
              <div
                key={c.id}
                className="section-layout rounded-xl overflow-hidden hover:shadow-lg transition"
              >
                {/* Image */}
                <div className="relative h-48 w-full">
                  <Image
                    src={c.image ?? "/placeholder.svg"}
                    alt={c.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

                  {c.logo && (
                    <div className="absolute top-4 left-4 h-12 w-12 bg-background/90 rounded-xl p-2 shadow-md backdrop-blur">
                      <Image
                        src={c.logo}
                        alt={`${c.name} logo`}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                  )}

                  <Badge className="absolute top-4 right-4 bg-background/80 backdrop-blur">
                    {c.category}
                  </Badge>

                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-bold text-xl text-foreground drop-shadow">
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm  mt-1">
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
                      <div className="flex justify-between text-sm mb-2">
                        <span className="">Claimed</span>
                        <span className="font-medium">
                          {formatNumber(c.tokenClaimed)} /{" "}
                          {formatNumber(c.tokenAllocated)} {c.tokenSymbol}
                        </span>
                      </div>

                      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${
                              (c.tokenClaimed / c.tokenAllocated) * 100
                            }%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-2 text-sm mb-4">
                        <UserGroupIcon className="h-4 w-4" />
                        {formatNumber(c.participants)} participants
                      </div>

                      <Link href={c.ctaLink} className="block">
                        <Button className="w-full">
                          {c.ctaText}
                          <ArrowRightIcon className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                      <SuperfluidLeaderboardModal
                        campaignName={c.name}
                        tokenSymbol={c.tokenSymbol}
                        trigger={
                          <Button btnStyle="outline">
                            <TrophyIcon className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </>
                  : <>
                      <div className="flex gap-2 flex-wrap mb-4">
                        <Badge color="info">
                          <CurrencyDollarIcon className="h-4 w-4" />
                          {c.tokenAllocated} {c.tokenSymbol}
                        </Badge>
                        {/* <Badge className="text-sm">31% APR</Badge>
                        <Badge className="text-sm">$117K+ Liquidity</Badge> */}
                      </div>

                      <Link
                        href={c.ctaLink}
                        target={
                          c.ctaLink.startsWith("http") ? "_blank" : undefined
                        }
                        className="block"
                      >
                        <Button className="w-full">
                          {c.ctaText}
                          <ArrowRightIcon className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </>
                  }
                </div>
              </div>
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
