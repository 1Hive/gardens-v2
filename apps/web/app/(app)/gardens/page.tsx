import React from "react";
import Image from "next/image";
import { clouds1, clouds2, gardenHeader } from "@/assets";
import { GardenCard } from "@/components";
import {
  TokenGarden,
  getTokenGardensDocument,
  getTokenGardensQuery,
} from "#/subgraph/.graphclient";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import {
  localhost,
  arbitrumSepolia,
  optimismSepolia,
  sepolia,
} from "viem/chains";
export const dynamic = "force-dynamic";

const { urqlClient } = initUrqlClient();

export default async function Gardens() {
  const chainsId = [
    localhost.id,
    arbitrumSepolia.id,
    optimismSepolia.id,
    sepolia.id,
  ];
  let gardens: getTokenGardensQuery | null = null;
  gardens = {
    tokenGardens: [],
  };

  try {
    if (!!process.env.NEXT_PUBLIC_SUBGRAPH_URL_ETH_SEP) {
      const r = await getTokenGardens(sepolia.id);
      gardens?.tokenGardens.push(...r.data.tokenGardens);
    } else {
      const r1 = await getTokenGardens(arbitrumSepolia.id);
      const r2 = await getTokenGardens(localhost.id);
      const r3 = await getTokenGardens(optimismSepolia.id);

      const queryArray = [r1, r2, r3];

      queryArray.forEach((r) => {
        if (r.data) {
          gardens?.tokenGardens.push(...r.data.tokenGardens);
        }
      });
    }
  } catch (error) {
    console.error("Error fetching token gardens:", error);
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
