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

type ClientPageProps = {
  params: { chain: string; garden: string; community: string };
};

export default function ClientPage({
  params: { garden, community },
}: ClientPageProps) {
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

  if (!token || !result) {
    return (
      <div className="my-40 col-span-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page-layout mx-auto col-span-12">
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
  );
}
