"use client";

import React, { useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
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
import { ONE_HIVE_COMMUNITY_ADDRESS } from "@/globals";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useFlag } from "@/hooks/useFlag";
import { useSubgraphQueryMultiChain } from "@/hooks/useSubgraphQueryMultiChain";
import { useTheme } from "@/providers/ThemeProvider";
import { logOnce } from "@/utils/log";

const Header = () => {
  const { tooltipMessage, isConnected } = useDisableButtons();
  const { resolvedTheme } = useTheme();
  return (
    <header className="flex flex-col items-center gap-8 w-full">
      <div className="flex items-center text-center w-full">
        <div className="relative shrink-0 w-[175px] hidden sm:block">
          <Image
            src={resolvedTheme === "lightTheme" ? clouds1 : gardensNight}
            alt="clouds"
            width={175}
            height={175}
          />
        </div>
        <div className="sm:mx-10 flex flex-1 min-w-0 flex-col items-center gap-5">
          <div className="flex flex-col items-center w-full">
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
        <div className="relative shrink-0 w-[175px] hidden sm:block">
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
  const showArchived = useFlag("showArchived");

  useEffect(() => {
    logOnce("debug", "Loading page: (app)/gardens/page.tsx");
  }, []);

  const { data: communitiesSections, fetching: isFetching } =
    useSubgraphQueryMultiChain<getCommunitiesQuery>({
      query: getCommunitiesDocument,
      modifier: (data) => {
        return data
          .flatMap((section) =>
            section.registryCommunities.map((x) => ({
              ...x,
              chain: section.chain,
              isProtopian:
                x.id.toLowerCase() === ONE_HIVE_COMMUNITY_ADDRESS ||
                (x as { protopianDelegatedFrom?: string | null })
                  .protopianDelegatedFrom != null,
            })),
          )
          .filter((x) => !x.archived || showArchived);
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
        communities={communitiesSections ?? []}
        isFetching={isFetching}
      />
      <Footer />
    </div>
  );
}
