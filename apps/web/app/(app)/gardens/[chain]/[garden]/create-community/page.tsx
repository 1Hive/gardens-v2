"use client";

import React, { useEffect } from "react";
import { Address } from "viem";
import {
  getCommunityCreationDataDocument,
  getCommunityCreationDataQuery,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { CommunityForm } from "@/components/Forms";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";

export default function Page({
  params: { chain, garden },
}: {
  params: { chain: number; garden: string };
}) {
  const { data: result, error: getCommunityCreationDataQueryError } =
    useSubgraphQuery<getCommunityCreationDataQuery>({
      query: getCommunityCreationDataDocument,
      variables: { addr: garden },
    });

  useEffect(() => {
    if (getCommunityCreationDataQueryError) {
      console.error(
        "Error while fetching community creation data: ",
        getCommunityCreationDataQueryError,
      );
    }
  }, [getCommunityCreationDataQueryError]);

  const registryFactoryAddr = result?.registryFactories?.[0].id as Address;
  const tokenGarden = result?.tokenGarden as TokenGarden;
  const alloContractAddr = result?.tokenGarden?.communities?.[0]
    .alloAddress as Address;

  return tokenGarden ?
      <div className="page-layout">
        <section className="section-layout">
          <div className="text-center sm:mt-5">
            <h2 className="text-xl font-semibold leading-6 text-gray-900">
              Welcome to the {tokenGarden.symbol} Community Form!
            </h2>
            <div className="mt-1">
              <p className="text-sm">
                Create a vibrant community around the {tokenGarden.name} by
                providing the necessary details below.
              </p>
            </div>
          </div>
          <CommunityForm
            chainId={chain}
            tokenGarden={tokenGarden}
            registryFactoryAddr={registryFactoryAddr}
            alloContractAddr={alloContractAddr}
          />
        </section>
      </div>
    : <div className="mt-96">
        <LoadingSpinner />
      </div>;
}
