"use client"

import React, { useMemo } from "react";
import Image from "next/image";
import { clouds1, clouds2, gardenHeader } from "@/assets";
import { GardenCard } from "@/components";
import { getTokenGardensQuery, getTokenGardensDocument } from "#/subgraph/.graphclient";
import { isProd } from "@/constants/contracts";
import useSubgraphQueryMultiChain from "@/hooks/useSubgraphQueryMultiChain";
import { arbitrumSepolia } from "viem/chains";
import { sepolia } from "wagmi";

export const dynamic = "force-dynamic";

export default async function Gardens() {
  const { data: gardens } = useSubgraphQueryMultiChain<getTokenGardensQuery>(
    getTokenGardensDocument,
    {},
    {},
    ['community', 'garden'],
    isProd ? [sepolia.id, arbitrumSepolia.id] : undefined
  );

  const tokenGardens = useMemo(() => {
    return gardens?.flatMap((g) => g.tokenGardens).filter((x): x is NonNullable<typeof x> => !!x);
  }, [gardens]);
  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <header className="flex flex-col items-center gap-8">
        <div className="flex items-center text-center">
          <div className="relative flex-1">
            <Image src={clouds1} alt="clouds" />
          </div>
          <div className="mx-10 flex flex-col items-center gap-5">
            <div className="flex flex-col items-center">
              <h1 className="max-w-xl text-center text-[#084D21]">
                Explore and Join Gardens Ecosystems
              </h1>
              <p className="text-xl">
                A place where you help shape digital economies
              </p>
            </div>
          </div>
          <div className="relative flex-1">
            <Image src={clouds2} alt="clouds" />
          </div>
        </div>
        <div className="relative"></div>
      </header>
      <section className="my-2 flex w-full max-w-2xl flex-col items-center justify-center gap-8">
        <div className="grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(310px,1fr))] gap-6 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
          {tokenGardens ? (
            tokenGardens.map((garden, id) => (
              <div key={`${garden.id}-${id}`}>
                <GardenCard garden={garden} />
              </div>
            ))
          ) : (
            <div>{"Can't find token gardens"}</div>
          )}
        </div>
        <Image src={gardenHeader} alt="gardens" />
      </section>
    </div>
  );
}
