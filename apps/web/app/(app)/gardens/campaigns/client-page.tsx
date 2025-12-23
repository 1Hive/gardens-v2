"use client";

import { useEffect, useState } from "react";
import { CalendarIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { PlantBanner } from "@/assets";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { fetchSuperfluidLeaderboard } from "@/types";
import { CAMPAIGNS } from "@/utils/campaigns";
import { formatNumber, timeAgo } from "@/utils/time";

type CampaignStats = {
  totalStreamedSup: number;
  walletCount: number;
  lastUpdated: string | null;
};

export default function CampaignsPage() {
  const [statsByCampaign, setStatsByCampaign] = useState<
    Record<string, CampaignStats>
  >({});

  const [loading, setLoading] = useState<boolean>(true);

  const campaigns = Object.values(CAMPAIGNS);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const entries = await Promise.all(
          Object.values(CAMPAIGNS).map(async (campaign) => {
            const res = await fetchSuperfluidLeaderboard(
              campaign.leaderboardEndpoint,
            );

            if (!res) return null;

            return [
              campaign.id,
              {
                totalStreamedSup: res.totalStreamedSup,
                walletCount: res.snapshot.wallets.length,
                lastUpdated: res.snapshot.updatedAt ?? null,
              },
            ] as const;
          }),
        );

        const statsMap = Object.fromEntries(
          entries.filter(Boolean) as Array<[string, CampaignStats]>,
        );

        setStatsByCampaign(statsMap);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

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
      <div className="mx-auto max-w-7xl px-4 pb-10 flex flex-col gap-10 items-center">
        <div className="flex items-center justify-center gap-2 mt-10">
          <Button>Active</Button>
          <Button disabled>Ended</Button>
        </div>

        {campaigns.map((c) => (
          <Link
            key={c.id}
            href={`/gardens/campaigns/${c.id}`}
            className="section-layout !p-0  rounded-xl overflow-hidden hover:shadow-lg transition group w-full max-w-2xl"
          >
            {/* Image */}
            <div className="relative h-48 w-full">
              <Image
                src={c.banner ?? "/placeholder.svg"}
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
              <>
                <Skeleton isLoading={loading} className="h-5 w-full mb-2">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="">Claimed</span>
                    <span className="font-medium">
                      {formatNumber(
                        statsByCampaign[c.id]?.totalStreamedSup ?? 0,
                      )}{" "}
                      / {formatNumber(c.tokenAllocated ?? 0)} {c.tokenSymbol}
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
                          ((statsByCampaign[c.id]?.totalStreamedSup ?? 0) /
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
                        {statsByCampaign[c.id]?.walletCount} participants
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-soft-content text-sm">
                        {" "}
                        Last updated:{" "}
                        {timeAgo(
                          statsByCampaign[c.id]?.lastUpdated ?? undefined,
                        )}
                      </span>
                    </div>
                  </div>
                </Skeleton>
              </>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
