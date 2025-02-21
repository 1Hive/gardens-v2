"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import {
  getTokenGardensDocument,
  getTokenGardensQuery,
} from "#/subgraph/.graphclient";
import { clouds1, clouds2, groupFlowers } from "@/assets";
import { GardenCard, InfoBox } from "@/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSubgraphQueryMultiChain } from "@/hooks/useSubgraphQueryMultiChain";

export default function Page() {
  const { data: gardens, fetching } =
    useSubgraphQueryMultiChain<getTokenGardensQuery>({
      query: getTokenGardensDocument,
      modifier: (data) =>
        data.sort(
          (a, b) =>
            (a.tokenGardens.length ? a.tokenGardens[0].chainId : 0) -
            (b.tokenGardens.length ? b.tokenGardens[0].chainId : 0),
        ),
      changeScope: [
        {
          topic: "garden",
        },
        {
          topic: "community",
        },
      ],
    });

  const tokenGardens = useMemo(
    () =>
      gardens
        ?.flatMap((g) => g.tokenGardens)
        .filter((x): x is NonNullable<typeof x> => !!x),
    [gardens],
  );

  const GardenList = useMemo(() => {
    if (!tokenGardens) {
      return <LoadingSpinner />;
    }
    if (tokenGardens.length) {
      return (
        <>
          {tokenGardens
            .sort((a, b) => {
              const communitiesDiff =
                (b.communities?.length ?? 0) - (a.communities?.length ?? 0);

              if (communitiesDiff === 0) {
                const aTotalMembers =
                  a.communities?.reduce(
                    (sum, community) => sum + (community.members?.length ?? 0),
                    0,
                  ) ?? 0;
                const bTotalMembers =
                  b.communities?.reduce(
                    (sum, community) => sum + (community.members?.length ?? 0),
                    0,
                  ) ?? 0;
                return bTotalMembers - aTotalMembers;
              }

              return communitiesDiff;
            })
            .map((garden) => (
              <div key={garden.id}>
                <GardenCard garden={garden} />
              </div>
            ))}
        </>
      );
    } else {
      return (
        <>
          <InfoBox infoBoxType="info">
            <span />
            Be the first to create your community 🌱 <br />
            <a
              target="_blank"
              href="https://discord.gg/H8fNyAWSBy"
              className="text-accent"
              rel="noreferrer"
            >
              https://discord.gg/FjEVDqC6EP
            </a>
          </InfoBox>
        </>
      );
    }
  }, [fetching, tokenGardens?.length]);

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-8 relative">
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
                  A place where communities grow through collective
                  decision-making
                </p>
              </div>
            </div>
            <div className="relative flex-1">
              <Image src={clouds2} alt="clouds" width={205} height={205} />
            </div>
          </div>
        </header>
        <section className="my-2 flex w-full max-w-2xl flex-col items-center justify-center gap-8 2xl:mt-10">
          <div className="flex flex-wrap mx-4 sm:grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(310px,1fr))] gap-6 md:grid-cols-[repeat(auto-fit,320px)] z-10">
            {GardenList}
          </div>
        </section>
        <Image src={groupFlowers} alt="flowers" />
      </div>
    </>
  );
}
