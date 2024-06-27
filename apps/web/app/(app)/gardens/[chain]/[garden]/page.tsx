import { tree2, tree3, grassLarge } from "@/assets";
import Image from "next/image";
import {
  CommunityCard,
  EthAddress,
  Statistic,
  TokenLabel,
} from "@/components";
import {
  RegistryCommunity,
  TokenGarden,
  getCommunitiesByGardenDocument,
  getCommunitiesByGardenQuery,
} from "#/subgraph/.graphclient";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import { FormLink } from "@/components";
import { Address } from "viem";
import React from "react";

export const dynamic = "force-dynamic";

const { urqlClient } = initUrqlClient();

export default async function Garden({
  params: { chain, garden },
}: {
  params: { chain: number; garden: string };
}) {
  const { data: result, error: error } =
    await queryByChain<getCommunitiesByGardenQuery>(
      urqlClient,
      chain,
      getCommunitiesByGardenDocument,
      { addr: garden },
    );

  let communities = result?.tokenGarden?.communities || [];

  communities = communities.filter((com) => com.isValid);

  const tokenGarden = result?.tokenGarden as TokenGarden;

  const gardenTotalMembers = communities.reduce(
    (acc, community) => acc + (community?.members?.length ?? 0),
    0,
  );

  return (
    <div className="flex w-full max-w-6xl flex-col gap-10 p-8">
      <header className="section-layout flex gap-10 p-10">
        <div className="flex h-[280px] w-[300px] items-center justify-center rounded-2xl bg-slate-200">
          Token Image
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-2 flex flex-col">
              <div className="flex items-center gap-4">
                <h2>{tokenGarden?.name}</h2> <TokenLabel chainId={chain} />
              </div>
              <EthAddress address={tokenGarden?.id as Address} />
            </div>
            <p className="max-w-lg">
              Discover communities in the
              <span className="font-bold"> {tokenGarden?.name} Garden</span>,
              where you connect with people and support proposals bounded by a
              shared
              <span className="font-bold"> covenant.</span>
            </p>
          </div>
          <div>
            <Statistic label="communities" count={communities?.length ?? 0} />
            <Statistic label="members" count={gardenTotalMembers} />
          </div>
        </div>
      </header>
      <section className="section-layout flex flex-col gap-10">
        <h2>Communities</h2>
        <div className=" flex flex-row flex-wrap gap-10">
          {communities.map(({ communityName, id, members, strategies }) => (
            <React.Fragment key={`${id}`}>
              <CommunityCard
                name={communityName ?? ""}
                members={members?.length ?? 0}
                pools={strategies?.length ?? 0}
                id={id}
              />
            </React.Fragment>
          ))}
        </div>
      </section>
      <section className="section-layout ">
        <div className="flex flex-col gap-10 overflow-x-hidden">
          <h4 className="text-secondary-content">Create your own community</h4>
          <div className="relative flex h-[219px] justify-center">
            <FormLink
              label="Create a community"
              href={`/gardens/${chain}/${garden}/create-community`}
              className="mt-6"
            />

            <Image
              src={tree2}
              alt="tree"
              className="absolute bottom-0 left-5"
            />
            <Image
              src={tree3}
              alt="tree"
              className="absolute bottom-0 right-5"
            />
            <Image
              src={grassLarge}
              alt="grass"
              className="absolute bottom-0 min-w-[1080px]"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
