"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect } from "react";
import { Button } from ".";
import { gardenLand } from "@/assets";
import { useAccount, useNetwork } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { getTokenGardensQuery } from "#/subgraph/.graphclient";

type TokenGarden = getTokenGardensQuery["tokenGardens"][number];

export function GardenCard({ garden }: { garden: TokenGarden }) {
  const { chain } = useNetwork();

  const currentChainOrDefault =
    chain?.id.toString() || arbitrumSepolia.id.toString();
  // const { imageSrc, title, subtitle, description, link: linkReplace } = garden;
  const { id, name, decimals, symbol, communities } = garden;
  const link = `/gardens/${currentChainOrDefault}/${id}/communities`;
  const commLength = communities?.length ?? 0;
  // const link = linkReplace.replace("[[chain]]", currentChainOrDefault || "");
  return (
    <div className="relative flex max-w-[320px] flex-col overflow-hidden rounded-lg border-2 border-black bg-surface">
      <div className="flex flex-col gap-4 p-4">
        <div className="relative">
          {/* <Image fill src={imageSrc} alt="garden main image" /> */}
        </div>
        <div>
          <h3 className="text-center">{symbol}</h3>
          <p>
            {name} - {decimals} decimals
          </p>
        </div>
        <div>
          {commLength} Communit{commLength > 1 ? "ies" : "y"}
        </div>
        <div className="mb-2 mt-4">
          {/* <Link href={link}> */}
          {/* </Link> */}
          <Link href={link}>
            <Button className="w-full bg-primary">Check Garden</Button>
          </Link>
        </div>
      </div>
      <Image src={gardenLand} alt="garden land" />
    </div>
  );
}
