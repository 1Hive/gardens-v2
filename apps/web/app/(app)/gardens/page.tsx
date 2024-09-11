"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import {
  getTokenGardensDocument,
  getTokenGardensQuery,
} from "#/subgraph/.graphclient";
import { clouds1, clouds2, groupFlowers } from "@/assets";
import { GardenCard } from "@/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSubgraphQueryMultiChain } from "@/hooks/useSubgraphQueryMultiChain";

export default function Page() {
  const { data: gardens, fetching } =
    useSubgraphQueryMultiChain<getTokenGardensQuery>({
      query: getTokenGardensDocument,
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
            .sort(
              (a, b) =>
                (a.communities?.length ?? 0) - (b.communities?.length ?? 0),
            )
            .map((garden) => (
              <div key={garden.id}>
                <GardenCard garden={garden} />
              </div>
            ))}
        </>
      );
    } else {
      return <div className="text-center">No Gardens</div>;
    }
  }, [fetching, tokenGardens?.length]);

  return (
    <>
      <div className="flex flex-col items-center justify-center gap-8 relative z-10">
        <header className="flex flex-col items-center gap-8 2xl:mt-20">
          <div className="flex items-center text-center">
            <div className="relative flex-1">
              <Image src={clouds1} alt="clouds" />
            </div>
            <div className="mx-10 flex flex-col items-center gap-5">
              <div className="flex flex-col items-center">
                <h1 className="max-w-xl text-center text-neutral-content">
                  Gardens
                </h1>
                <p className="text-xl text-primary-content text-center">
                  A place to grow communities via collective decision-making
                </p>
              </div>
            </div>
            <div className="relative flex-1">
              <Image src={clouds2} alt="clouds" />
            </div>
          </div>
          <div className="relative" />
        </header>
        <section className="my-2 flex w-full max-w-2xl flex-col items-center justify-center gap-8 2xl:mt-10">
          <div className="grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(310px,1fr))] gap-6 md:grid-cols-[repeat(auto-fit,320px)] z-10">
            {GardenList}
          </div>
        </section>
        <Image src={groupFlowers} alt="flowers" />
      </div>
    </>
  );
}
