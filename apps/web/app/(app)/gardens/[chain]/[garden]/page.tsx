"use client";

import { tree2, tree3, grassLarge, ecosystem } from "@/assets";
import Image from "next/image";
import { Communities, EthAddress, Statistic, TokenLabel } from "@/components";
import { getGardenDocument, getGardenQuery } from "#/subgraph/.graphclient";
import { FormLink } from "@/components";
import React, { useEffect } from "react";
import { CubeTransparentIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from "@/components/LoadingSpinner";
import useSubgraphQuery from "@/hooks/useSubgraphQuery";
import { isProd } from "@/constants/contracts";
import TokenGardenFaucet from "@/components/TokenGardenFaucet";
import { Address } from "viem";

export const dynamic = "force-dynamic";

export default function Garden({
  params: { chain, garden },
}: {
  params: { chain: number; garden: string };
}) {
  const { data: result, error } = useSubgraphQuery<getGardenQuery>({
    query: getGardenDocument,
    variables: { addr: garden },
    changeScope: [
      { topic: "member", chainId: chain },
      {
        topic: "community",

        chainId: chain,
      },
      {
        topic: "garden",
        id: garden,
        chainId: chain,
      },
    ],
  });

  useEffect(() => {
    if (error) {
      console.error("Error while fetching garden data: ", error);
    }
  }, [error]);

  let communities = result?.tokenGarden?.communities || [];

  communities = communities.filter((com) => com.isValid);

  const tokenGarden = result?.tokenGarden;

  if (!tokenGarden) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  const gardenTotalMembers = () => {
    const uniqueMembers = new Set();

    communities.forEach((community) =>
      community.members?.forEach((member) =>
        uniqueMembers.add(member?.memberAddress),
      ),
    );

    return uniqueMembers.size;
  };

  return (
    <div className="page-layout">
      <header className="section-layout flex flex-col gap-10 p-10 md:flex-row ">
        <div className="flex h-[283px] min-h-[283px] w-[311px] min-w-[311px] items-center justify-center overflow-hidden rounded-2xl">
          <Image
            src={ecosystem}
            width={311}
            height={283}
            alt={`${tokenGarden?.name}`}
          />
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
          <div className="flex flex-col gap-2">
            <Statistic
              label="communities"
              icon={<CubeTransparentIcon />}
              count={communities?.length ?? 0}
            />
            <Statistic label="members" count={gardenTotalMembers()} />
          </div>
        </div>
      </header>
      <Communities communities={communities} />
      <section className="section-layout ">
        <div className="flex flex-col gap-10 overflow-x-hidden">
          <header>
            <h4 className="text-secondary-content">
              Create your own community
            </h4>
          </header>
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
      {!isProd && tokenGarden && (
        <TokenGardenFaucet token={tokenGarden}></TokenGardenFaucet>
      )}
    </div>
  );
}
