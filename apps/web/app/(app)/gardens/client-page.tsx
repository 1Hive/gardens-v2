"use client";

import React, { useEffect, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Address, readContract } from "@wagmi/core";
import Image from "next/image";
import Link from "next/link";
import {
  getCommunitiesDocument,
  getCommunitiesQuery,
} from "#/subgraph/.graphclient";
import {
  clouds1,
  clouds2,
  grassLarge,
  tree2,
  tree3,
  gardensNight,
} from "@/assets";
import { Button, Communities } from "@/components";
import { LightCommunity } from "@/components/Communities";
import MarkeeSign from "@/components/MarkeeSign";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useFlag } from "@/hooks/useFlag";
import { useSubgraphQueryMultiChain } from "@/hooks/useSubgraphQueryMultiChain";
import { useTheme } from "@/providers/ThemeProvider";
import { getProtopiansOwners } from "@/services/alchemy";
import { safeABI } from "@/src/customAbis";

const Header = () => {
  const { tooltipMessage, isConnected } = useDisableButtons();
  const { resolvedTheme } = useTheme();
  return (
    <header className="flex flex-col items-center gap-8 ">
      <div className="flex items-center text-center">
        <div className="relative flex-1">
          <Image
            src={resolvedTheme === "lightTheme" ? clouds1 : gardensNight}
            alt="clouds"
            width={175}
            height={175}
          />
        </div>
        <div className="mx-10 flex flex-col items-center gap-5">
          <div className="flex flex-col items-center">
            <h1 className="max-w-xl text-center text-neutral-content">
              Welcome to Gardens
            </h1>
            <p className="text-xl text-center">
              Where communities grow through collective decision-making
            </p>
            <MarkeeSign />
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
            className="absolute bottom-0 -left-10 h-32 sm:h-52"
          />
          <Image
            src={tree3}
            alt="tree"
            className="absolute bottom-0 -right-10 h-40 sm:h-60"
          />
          <Image
            src={grassLarge}
            alt="grass"
            className="absolute bottom-0 min-w-[600px] sm:min-w-[1080px]"
          />
        </div>
      </div>
    </section>
  );
};

export default function ClientPage() {
  const [protopianOwners, setProtopianOwners] = useState<Address[] | undefined>(
    undefined,
  );

  const showArchived = useFlag("showArchived");

  useEffect(() => {
    getProtopiansOwners()
      .then((owners) => {
        setProtopianOwners(owners);
      })
      .catch((err) => {
        console.error("Error fetching Protopian community data:", err);
        setProtopianOwners([]);
      });
  }, []);

  const { data: communitiesSections, fetching: isFetching } =
    useSubgraphQueryMultiChain<getCommunitiesQuery>({
      query: getCommunitiesDocument,
      enabled: !!protopianOwners,
      modifier: async (data) => {
        return Promise.all(
          data
            .flatMap((section) =>
              section.registryCommunities.map((x) => ({
                ...x,
                chain: section.chain,
              })),
            )
            .filter((x) => !x.archived || showArchived)
            .map(async (x) => {
              if (
                protopianOwners &&
                protopianOwners.length > 0 &&
                x.chain.safePrefix
              ) {
                const councilSafeAddress = x.councilSafe as Address;
                try {
                  const communityCouncil = await readContract({
                    address: councilSafeAddress,
                    abi: safeABI,
                    functionName: "getOwners",
                    chainId: x.chain.id,
                  });

                  return {
                    ...x,
                    isProtopian: !![
                      ...communityCouncil,
                      councilSafeAddress,
                    ].find(
                      (owner) =>
                        !!protopianOwners!.find(
                          (p) => owner.toLowerCase() === p.toLowerCase(),
                        ),
                    ),
                  };
                } catch (error) {
                  console.error(
                    `Error reading council safe for community ${x.communityName}:`,
                    error,
                  );
                  return x;
                }
              }

              return x;
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
