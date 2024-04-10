import React from "react";
import Image from "next/image";
import { clouds1, clouds2, gardenHeader } from "@/assets";
import { GardenCard } from "@/components";
import {
  getTokenGardensDocument,
  getTokenGardensQuery,
} from "#/subgraph/.graphclient";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import { localhost, arbitrumSepolia } from "viem/chains";
export const dynamic = "force-dynamic";

const { urqlClient } = initUrqlClient();
export default async function Gardens() {
  const r1 = await getTokenGardens(arbitrumSepolia.id);
  const r2 = await getTokenGardens(localhost.id);
  // marge r.data and rl.data to gardens
  let gardens: getTokenGardensQuery | null = null;
  if (r1.data) {
    gardens = {
      tokenGardens: [...r1.data.tokenGardens],
    };
  }

  if (r2.data) {
    if (gardens) {
      gardens.tokenGardens.push(...r2.data.tokenGardens);
    } else {
      gardens = {
        tokenGardens: [...r2.data.tokenGardens],
      };
    }
  }
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
          {gardens ? (
            gardens.tokenGardens.map((garden, id) => (
              <GardenCard garden={garden} key={`${garden.id}-${id}`} />
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

async function getTokenGardens(chainId: string | number) {
  return await queryByChain(urqlClient, chainId, getTokenGardensDocument, {});
}
