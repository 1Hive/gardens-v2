"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Address } from "viem";
import {
  getPoolCreationDataDocument,
  getPoolCreationDataQuery,
} from "#/subgraph/.graphclient";
import { blueLand, grass, grassLarge } from "@/assets";
import { Badge } from "@/components";
import { Button } from "@/components/Button";
import { PoolForm } from "@/components/Forms/PoolForm";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StreamingPoolGraphic } from "@/components/StreamingPoolGraphic";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";

type ClientPageProps = {
  params: { chain: string; garden: string; community: string };
};

export default function ClientPage({
  params: { garden, community },
}: ClientPageProps) {
  const [selectedPoolType, setSelectedPoolType] = useState<number | null>(null);
  const { data: result } = useSubgraphQuery<getPoolCreationDataQuery>({
    query: getPoolCreationDataDocument,
    variables: {
      communityAddr: community.toLowerCase(),
      tokenAddr: garden.toLowerCase(),
    },
  });
  const token = result?.tokenGarden;
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
      image: grassLarge,
    },
    {
      type: 0,
      title: "Signaling",
      description:
        "Source a decision from the community with no funding attached.",
      image: grass,
    },
  ];

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
              {poolTypeOptions.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  className="border1 rounded-2xl bg-primary p-5 text-left transition-all duration-200 hover:border-secondary-content hover:bg-secondary-soft dark:hover:bg-secondary-soft-dark"
                  onClick={() => setSelectedPoolType(option.type)}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h4>{option.title}</h4>
                    <Badge type={option.type} />
                  </div>
                  <p className="text-sm text-neutral-soft-content min-h-[58px]">
                    {option.description}
                  </p>
                  {option.type === 2 ?
                    <StreamingPoolGraphic />
                  : <Image
                      src={option.image}
                      alt={`${option.title} pool`}
                      width={640}
                      height={160}
                      className="h-16 w-full rounded-lg object-cover mt-4"
                    />
                  }
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
