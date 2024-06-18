"use client"
import {
  TokenGarden,
  getCommunityCreationDataDocument,
  getCommunityCreationDataQuery,
} from "#/subgraph/.graphclient";
import { CommunityForm } from "@/components/Forms";
import useSubgraphQueryByChain from "@/hooks/useSubgraphQueryByChain";
import React from "react";
import { Address } from "viem";

export default async function Page({
  params: { chain, garden },
}: {
  params: { chain: number; garden: string };
}) {
  const { data: result, error: error } =
    useSubgraphQueryByChain<getCommunityCreationDataQuery>(
      chain,
      getCommunityCreationDataDocument,
      { addr: garden },
    );

  const registryFactoryAddr = result?.registryFactories?.[0].id as Address;
  const tokenGarden = result?.tokenGarden as TokenGarden;
  const alloContractAddr = result?.tokenGarden?.communities?.[0]
    .alloAddress as Address;

  return (
    <div className="mx-auto flex max-w-[820px] flex-col items-center justify-center gap-4">
      <div className="text-center sm:mt-5">
        <h2 className="text-xl font-semibold leading-6 text-gray-900">
          Welcome to the {tokenGarden?.symbol} Community Form!
        </h2>
        <div className="mt-1">
          <p className="text-sm">
            Create a vibrant community around the {tokenGarden.name} by
            providing the necessary details below.
          </p>
        </div>
      </div>
      <CommunityForm
        chain={chain}
        tokenGarden={tokenGarden}
        registryFactoryAddr={registryFactoryAddr}
        alloContractAddr={alloContractAddr}
      />
    </div>
  );
}
