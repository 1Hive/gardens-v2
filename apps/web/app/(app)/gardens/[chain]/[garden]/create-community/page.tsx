"use client";

import React, { useEffect } from "react";
import { Address } from "viem";
import { useToken } from "wagmi";
import {
  getCommunityCreationDataDocument,
  getCommunityCreationDataQuery,
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
      variables: { addr: garden.toLowerCase() },
    });

  useEffect(() => {
    if (getCommunityCreationDataQueryError) {
      console.error(
        "Error while fetching community creation data: ",
        getCommunityCreationDataQueryError,
      );
    }
  }, [getCommunityCreationDataQueryError]);

  const { data: tokenInfo } = useToken({
    address: garden as Address,
    chainId: +chain,
  });

  const registryFactoryAddr = result?.registryFactories?.[0].id as Address;

  return tokenInfo ?
      <div className="page-layout">
        <section className="section-layout">
          <div className="text-center sm:mt-5 mb-12">
            <h2 className="mb-2">
              Welcome to the {tokenInfo.symbol} Community Form!
            </h2>
            <div className="">
              <p className="">
                Create a vibrant community around the {tokenInfo.name} by
                providing the necessary details below.
              </p>
            </div>
          </div>
          <CommunityForm
            chainId={chain}
            tokenGarden={tokenInfo}
            registryFactoryAddr={registryFactoryAddr}
          />
        </section>
      </div>
    : <div className="mt-96">
        <LoadingSpinner />
      </div>;
}
