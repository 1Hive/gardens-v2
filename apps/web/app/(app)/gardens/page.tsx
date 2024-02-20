import React from "react";
import Image from "next/image";
import { clouds1, clouds2, gardenHeader } from "@/assets";
import Link from "next/link";
import { Button, GardenCard } from "@/components";
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
          <div className="mx-10 flex flex-col gap-10">
            <div>
              <h1 className="text-[#084D21]">Find your tribe</h1>
              <p className="text-xl">
                Gardens are digital economies that anyone can help shape
              </p>
            </div>
          </div>
          <div className="relative flex-1">
            <Image src={clouds2} alt="clouds" />
          </div>
        </div>
        <div className="relative">
          <Image src={gardenHeader} alt="gardens" />
        </div>
      </header>
      {/* <div>search</div> */}
      <section className="my-10 flex justify-center">
        {/* <div className="grid max-w-[1216px] grid-cols-[repeat(auto-fit,minmax(310px,1fr))] gap-6 md:grid-cols-[repeat(auto-fit,minmax(360px,1fr))]"> */}
        <div className="flex max-w-[1216px] flex-wrap justify-center gap-6">
          {gardens ? (
            gardens.tokenGardens.map((garden, id) => (
              <div key={`${garden.id}-${id}`}>
                <GardenCard garden={garden} />
              </div>
            ))
          ) : (
            <div>{"Can't find token gardens"}</div>
          )}
        </div>
      </section>
    </div>
  );
}

async function getTokenGardens(chainId: string | number) {
  return await queryByChain(urqlClient, chainId, getTokenGardensDocument, {});
}
