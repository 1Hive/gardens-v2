"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Address } from "viem";
import {
  getPoolCreationDataDocument,
  getPoolCreationDataQuery,
} from "#/subgraph/.graphclient";
import { blueLand, grass, StreamingPool } from "@/assets";
import { Badge } from "@/components";
import { Button } from "@/components/Button";
import { PoolForm } from "@/components/Forms/PoolForm";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useStreamingPoolsAccess } from "@/hooks/useStreamingPoolsAccess";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { logOnce } from "@/utils/log";

type ClientPageProps = {
  params: { chain: string; community: string };
};

export default function ClientPage({ params: { community } }: ClientPageProps) {
  const canAccessStreamingPools = useStreamingPoolsAccess(community);

  useEffect(() => {
    logOnce(
      "debug",
      "Loading page: (app)/gardens/[chain]/[community]/create-pool/page.tsx",
    );
  }, []);
  const [selectedPoolType, setSelectedPoolType] = useState<number | null>(null);

  useEffect(() => {
    if (!canAccessStreamingPools && selectedPoolType === 2) {
      setSelectedPoolType(null);
    }
  }, [canAccessStreamingPools, selectedPoolType]);

  const { data: result } = useSubgraphQuery<getPoolCreationDataQuery>({
    query: getPoolCreationDataDocument,
    variables: {
      communityAddr: community.toLowerCase(),
    },
  });
  const token = result?.registryCommunity?.garden;
  const alloAddr = result?.allos[0]?.id as Address;
  const communityName = result?.registryCommunity?.communityName as string;
  const poolTypeOptions = [
    {
      type: 1,
      title: "Funding",
      description:
        "Add tokens for a community cause that can be requested in discrete amounts.",
      image: blueLand,
    },
    {
      type: 2,
      title: "Streaming",
      description:
        "Add tokens for a community cause that can be requested in streams.",
      image: StreamingPool,
    },
    {
      type: 0,
      title: "Signaling",
      description:
        "Source a decision from the community with no funding attached.",
      image: grass,
    },
  ];
  const visiblePoolTypeOptions = poolTypeOptions.filter(
    (option) => canAccessStreamingPools || option.type !== 2,
  );

  if (!token || result == null) {
    return (
      <div className="my-40 col-span-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page-layout mx-auto col-span-12">
      <section className="section-layout">
        <div className="text-center sm:mt-5 mb-8">
          <h2 className="">Create a Pool in {communityName} community</h2>
        </div>
        {selectedPoolType == null ?
          <div className="w-full">
            <p className="text-center text-neutral-soft-content mb-6">
              Choose a pool type to continue.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {visiblePoolTypeOptions.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  className="border1 rounded-2xl bg-primary p-5 text-left transition-all duration-200 hover:border-secondary-content hover:bg-secondary-soft dark:hover:bg-secondary-soft-dark"
                  onClick={() => setSelectedPoolType(option.type)}
                  data-testid={`pool-type-option-${option.type}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h4>{option.title}</h4>
                    <Badge type={option.type} />
                  </div>
                  <p className="text-sm text-neutral-soft-content min-h-[58px]">
                    {option.description}
                  </p>
                  <Image
                    src={option.image}
                    alt={`${option.title} pool`}
                    width={640}
                    height={160}
                    className="h-16 w-full rounded-lg object-cover mt-4"
                  />
                </button>
              ))}
            </div>
          </div>
        : <div className="w-full">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-soft-content">
                  Selected pool type:
                </span>
                <Badge type={selectedPoolType} />
              </div>
              <Button
                btnStyle="outline"
                color="secondary"
                className="w-fit"
                onClick={() => setSelectedPoolType(null)}
              >
                Change pool type
              </Button>
            </div>
            <PoolForm
              alloAddr={alloAddr}
              governanceToken={token}
              communityAddr={community as Address}
              initialStrategyType={selectedPoolType}
            />
          </div>
        }
      </section>
    </div>
  );
}
