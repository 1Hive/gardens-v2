"use client";

import React from "react";
import { Address } from "viem";
import {
  getPoolCreationDataDocument,
  getPoolCreationDataQuery,
} from "#/subgraph/.graphclient";
import { PoolForm } from "@/components/Forms/PoolForm";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";

export default function Page({
  params: { garden, community },
}: {
  params: { garden: string; community: string };
}) {
  const { data: result } = useSubgraphQuery<getPoolCreationDataQuery>({
    query: getPoolCreationDataDocument,
    variables: {
      communityAddr: community.toLowerCase(),
      tokenAddr: garden.toLowerCase(),
    },
  });
  let token = result?.tokenGarden;
  let alloAddr = result?.allos[0]?.id as Address;
  let communityName = result?.registryCommunity?.communityName as string;

  if (!token) {
    return (
      <div className="my-40 col-span-12">
        <LoadingSpinner />
      </div>
    );
  }

  return result ?
      <div className="page-layout">
        <section className="section-layout">
          <div className="text-center sm:mt-5 mb-12">
            <h2 className="">Create a Pool in {communityName} community</h2>
          </div>
          <PoolForm
            alloAddr={alloAddr}
            governanceToken={token}
            communityAddr={community as Address}
          />
        </section>
      </div>
    : <div className="mt-96 col-span-12">
        <LoadingSpinner />
      </div>;
}
