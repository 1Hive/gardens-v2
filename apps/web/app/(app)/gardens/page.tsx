import React from "react";
import Image from "next/image";
import { clouds1, clouds2, gardenHeader } from "@/assets";
import Link from "next/link";
import { Button, GardenCard } from "@/components";
import { getBuiltGraphSDK } from "#/subgraph/.graphclient";

export default async function Gardens() {
  const sdk = getBuiltGraphSDK();
  const gardens = await sdk.getTokenGardens();

  return (
    <div className="flex flex-col items-center justify-center gap-12">
      <header className="flex flex-col items-center gap-12">
        <div className="flex items-center text-center">
          <div className="relative flex-1">
            <Image src={clouds1} alt="clouds" />
          </div>
          <div className="mx-10 flex flex-col gap-14">
            <div>
              <h1 className="text-[#084D21]">Find your tribe</h1>
              <p className="text-[18px]">
                Gardens are digital economies that anyone can help shape
              </p>
            </div>
            <div className="flex justify-center gap-6">
              <Link href="/create-garden">
                <Button className="bg-primary">Create a Garden</Button>
              </Link>
              <Link href="/docs">
                <Button className="bg-secondary">Documentation</Button>
              </Link>
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
          {gardens.tokenGardens.map((garden, id) => (
            <div key={id}>
              <GardenCard garden={garden} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
