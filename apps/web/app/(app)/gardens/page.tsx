"use client";

import React, { useMemo } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import {
  getCommunitiesDocument,
  getCommunitiesQuery,
} from "#/subgraph/.graphclient";
import { clouds1, clouds2, grassLarge, tree2, tree3 } from "@/assets";
import { Button, Communities } from "@/components";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useSubgraphQueryMultiChain } from "@/hooks/useSubgraphQueryMultiChain";

// Components
const Header = () => (
  <header className="flex flex-col items-center gap-8">
    <div className="flex items-center text-center">
      <div className="relative flex-1">
        <Image src={clouds1} alt="clouds" width={205} height={205} />
      </div>
      <div className="mx-10 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center">
          <h1 className="max-w-xl text-center text-neutral-content">
            Welcome to Gardens
          </h1>
          <p className="text-xl text-primary-content text-center">
            A place where communities grow through collective decision-making
          </p>
        </div>
      </div>
      <div className="relative flex-1">
        <Image src={clouds2} alt="clouds" width={205} height={205} />
      </div>
    </div>
  </header>
);

const Footer = () => {
  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons();

  return (
    <section className="section-layout">
      <div className="flex flex-col gap-10 overflow-x-hidden">
        <header>
          <h4 className="text-neutral-content">Create your own community</h4>
        </header>
        <div className="relative flex h-[219px] justify-center">
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
  const {
    data: communitiesSections,
    // fetching
  } = useSubgraphQueryMultiChain<getCommunitiesQuery>({
    query: getCommunitiesDocument,
    changeScope: [
      {
        topic: "community",
      },
    ],
  });

  // Combine all communities into a single array
  const allCommunities = useMemo(() => {
    if (!communitiesSections || communitiesSections.length === 0) return [];

    return communitiesSections.flatMap(
      (section) => section.registryCommunities || [],
    );
  }, [communitiesSections]);

  return (
    <div className="page-layout">
      <Header />
      <Communities communities={allCommunities} />
      <Footer />
    </div>
  );
}
