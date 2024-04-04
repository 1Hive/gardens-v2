import {
  getPoolCreationDataDocument,
  getPoolCreationDataQuery,
} from "#/subgraph/.graphclient";
import PoolForm from "@/components/Forms/PoolForm";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import React from "react";
import { Address } from "viem";

export default async function CreatePool({
  params: { chain, garden, community },
}: {
  params: { chain: number; garden: string; community: string };
}) {
  const { urqlClient } = initUrqlClient();

  const { data: result, error: error } =
    await queryByChain<getPoolCreationDataQuery>(
      urqlClient,
      chain,
      getPoolCreationDataDocument,
      { communityAddr: community },
    );

  let alloAddr = result?.allos[0]?.id as Address;
  let communityName = result?.registryCommunity?.communityName as string;

  return (
    <>
      <PoolForm
        alloAddr={alloAddr}
        communityName={communityName}
        tokenAddr={garden as Address}
        communityAddr={community as Address}
      />
    </>
  );
}
