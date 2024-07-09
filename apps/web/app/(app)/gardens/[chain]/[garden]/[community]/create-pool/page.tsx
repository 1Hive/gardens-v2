"use client";

import {
  TokenGarden,
  getPoolCreationDataDocument,
  getPoolCreationDataQuery,
} from "#/subgraph/.graphclient";
import PoolForm from "@/components/Forms/PoolForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import useSubgraphQuery from "@/hooks/useSubgraphQuery";
import React from "react";
import { Address } from "viem";

export default function CreatePool({
  params: { chain, garden, community },
}: {
  params: { chain: number; garden: string; community: string };
}) {
  const { data: result, error: error } =
    useSubgraphQuery<getPoolCreationDataQuery>({
      query: getPoolCreationDataDocument,
      variables: { communityAddr: community, tokenAddr: garden },
    });
  let token = result?.tokenGarden;
  let alloAddr = result?.allos[0]?.id as Address;
  let communityName = result?.registryCommunity?.communityName as string;

  return result ? (
    <div className="mx-auto flex max-w-[820px] flex-col items-center justify-center gap-4">
      <div className="text-center sm:mt-5">
        <h2 className="text-xl font-semibold leading-6 text-gray-900">
          Create a Pool in {communityName} community
        </h2>
        {/* <div className="mt-1">
          <p className="text-sm">subtitle for pool form creation...</p>
        </div> */}
      </div>
      <PoolForm
        alloAddr={alloAddr}
        token={token as TokenGarden}
        communityAddr={community as Address}
        chainId={chain}
      />
    </div>
  ) : (
    <div className="mt-96">
      <LoadingSpinner />
    </div>
  );
}
