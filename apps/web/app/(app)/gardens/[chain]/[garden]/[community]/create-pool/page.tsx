"use client";

import React from "react";
import { Address } from "viem";
import {
  getPoolCreationDataDocument,
  getPoolCreationDataQuery,
  TokenGarden,
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
    variables: { communityAddr: community, tokenAddr: garden },
  });
  let token = result?.tokenGarden;
  let alloAddr = result?.allos[0]?.id as Address;
  let communityName = result?.registryCommunity?.communityName as string;

  return result ?
      <div className="page-layout">
        <section className="section-layout">
          <div className="text-center sm:mt-5 mb-12">
            <h2 className="">Create a Pool in {communityName} community</h2>
          </div>
          <PoolForm
            alloAddr={alloAddr}
            token={token as TokenGarden}
            communityAddr={community as Address}
          />
        </section>
      </div>
    : <div className="mt-96">
        <LoadingSpinner />
      </div>;
}
