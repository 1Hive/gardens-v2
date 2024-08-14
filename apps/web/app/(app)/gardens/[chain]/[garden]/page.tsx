"use client";

import React, { useEffect } from "react";
import {
  CubeTransparentIcon,
  PlusIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { Address } from "viem";
import { getGardenDocument, getGardenQuery } from "#/subgraph/.graphclient";
import { ecosystem, grassLarge, tree2, tree3 } from "@/assets";
import {
  Button,
  Communities,
  EthAddress,
  Statistic,
  TokenLabel,
} from "@/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { TokenGardenFaucet } from "@/components/TokenGardenFaucet";
import { isProd } from "@/constants/contracts";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/hooks/useCollectQueryParams";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";

export const dynamic = "force-dynamic";

export default function Page({
  params: { chain, garden },
}: {
  params: { chain: number; garden: string };
}) {
  const searchParams = useCollectQueryParams();
  const {
    data: result,
    error,
    refetch,
  } = useSubgraphQuery<getGardenQuery>({
    query: getGardenDocument,
    variables: { addr: garden },
    changeScope: [
      { topic: "member" },
      {
        topic: "community",
      },
      {
        topic: "garden",
        id: garden,
      },
    ],
  });

  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons();

  useEffect(() => {
    if (error) {
      console.error("Error while fetching garden data: ", error);
    }
  }, [error]);

  let communities =
    result?.tokenGarden?.communities?.filter((com) => com.isValid) ?? [];

  useEffect(() => {
    const newCommunityId =
      searchParams[QUERY_PARAMS.gardenPage.newCommunity]?.toLowerCase();

    if (
      newCommunityId &&
      result &&
      !communities.some((c) => c.id.toLowerCase() === newCommunityId)
    ) {
      refetch();
    }
  }, [searchParams, result]);

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
                <h2>{tokenGarden?.name}</h2>{" "}
                <TokenLabel chainId={chain} classNames="bg-neutral-soft" />
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
            <Statistic
              label="members"
              count={gardenTotalMembers()}
              icon={<UserGroupIcon />}
            />
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
            <Link
              href={`/gardens/${chain}/${garden}/create-community`}
              className="mt-6"
            >
              <Button
                btnStyle="filled"
                disabled={!isConnected || missmatchUrl}
                tooltip={tooltipMessage}
                icon={<PlusIcon height={24} width={24} />}
              >
                Create a community
              </Button>
            </Link>
            <Image
              src={tree2}
              alt="tree"
              className="absolute bottom-0 -left-10 h-52"
            />
            <Image
              src={tree3}
              alt="tree"
              className="absolute bottom-0 -right-10 h-60 "
            />
            <Image
              src={grassLarge}
              alt="grass"
              className="absolute bottom-0 min-w-[1080px]"
            />
          </div>
        </div>
      </section>
      {!isProd && tokenGarden && <TokenGardenFaucet token={tokenGarden} />}
    </div>
  );
}
