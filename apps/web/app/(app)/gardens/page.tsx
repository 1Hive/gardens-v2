"use client";

import React from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Address, readContract } from "@wagmi/core";
import Image from "next/image";
import Link from "next/link";
import {
  getCommunitiesDocument,
  getCommunitiesQuery,
} from "#/subgraph/.graphclient";
import { clouds1, clouds2, grassLarge, tree2, tree3 } from "@/assets";
import { Button, Communities } from "@/components";
import { LightCommunity } from "@/components/Communities";
import { FAKE_PROTOPIAN_COMMUNITIES } from "@/globals";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useSubgraphQueryMultiChain } from "@/hooks/useSubgraphQueryMultiChain";
import { safeABI } from "@/src/generated";

// Components
const Header = () => {
  const { tooltipMessage, isConnected } = useDisableButtons();
  return (
    <header className="flex flex-col items-center gap-8 ">
      <div className="flex items-center text-center">
        <div className="relative flex-1">
          <Image src={clouds1} alt="clouds" width={175} height={175} />
        </div>
        <div className="mx-10 flex flex-col items-center gap-5">
          <div className="flex flex-col items-center">
            <h1 className="max-w-xl text-center text-neutral-content">
              Welcome to Gardens
            </h1>
            <p className="text-xl text-primary-content text-center">
              Where communities grow through collective decision-making
            </p>
            <Link href="/gardens/create-community" className="mt-6 z-10">
              <Button
                btnStyle="filled"
                disabled={!isConnected}
                tooltip={tooltipMessage}
                icon={<PlusIcon height={24} width={24} />}
              >
                Create a community
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative flex-1">
          <Image src={clouds2} alt="clouds" width={175} height={175} />
        </div>
      </div>
    </header>
  );
};

const Footer = () => {
  const { tooltipMessage, isConnected } = useDisableButtons();

  return (
    <section>
      <div className="flex flex-col gap-10 overflow-x-hidden ">
        <div className="relative flex h-[240px] justify-center">
          <Link href="/gardens/create-community" className="mt-10 z-10">
            <Button
              btnStyle="filled"
              disabled={!isConnected}
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
            className="absolute bottom-0 -right-10 h-60"
          />
          <Image
            src={grassLarge}
            alt="grass"
            className="absolute bottom-0 min-w-[1080px]"
          />
        </div>
      </div>
    </section>
  );
};

// Main component
export default function GardensPage() {
  const chain = useChainFromPath();
  const { data: communitiesSections, fetching: isFetching } =
    useSubgraphQueryMultiChain<getCommunitiesQuery>({
      query: getCommunitiesDocument,
      modifier: async (data) => {
        return Promise.all(
          data
            .flatMap((section) => section.registryCommunities || [])
            .map(async (x) => {
              const protopianMembers = x.members?.filter(
                (m) => m.member.isProtopian,
              );
              if (protopianMembers?.length && chain?.safePrefix) {
                // Council Safe supported
                const councilSafeAddress = x.councilSafe as Address;
                const communityCouncil = await readContract({
                  address: councilSafeAddress,
                  abi: safeABI,
                  functionName: "getOwners",
                });

                return {
                  ...x,
                  // Consider Protopian can be transferred to councilSafe
                  isProtopian: !![...communityCouncil, councilSafeAddress].find(
                    (owner) =>
                      protopianMembers
                        .map((p) => p.memberAddress?.toLowerCase())
                        .includes(owner.toLowerCase()),
                  ),
                };
              }

              return {
                ...x,
                isProtopian: !!FAKE_PROTOPIAN_COMMUNITIES.find(
                  (add) => add.toLowerCase() === x.id,
                ),
              };
            }),
        );
      },
      changeScope: [
        {
          topic: "community",
        },
      ],
    });

  return (
    <div className="page-layout max-w-7xl mx-auto">
      <Header />
      <Communities
        communities={(communitiesSections as unknown as LightCommunity[]) ?? []}
        isFetching={isFetching}
      />
      <Footer />
    </div>
  );
}
