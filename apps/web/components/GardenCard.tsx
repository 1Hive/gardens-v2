"use client";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from ".";
import { gardenLand } from "@/assets";
import { getTokenGardensQuery } from "#/subgraph/.graphclient";
import { formatUnits } from "viem/utils";
import { getChain } from "@/configs/chainServer";

type TokenGarden = getTokenGardensQuery["tokenGardens"][number];

export function GardenCard({ garden }: { garden: TokenGarden }) {
  // const { chain } = useNetwork();

  // const { imageSrc, title, subtitle, description, link: linkReplace } = garden;
  const { id, name, decimals, symbol, communities, totalBalance, chainId } =
    garden;
  const link = `/gardens/${chainId}/${id}/communities`;
  const commLength = communities?.length ?? 0;
  const totalMembers =
    communities
      ?.map((comm) => comm.members?.length ?? 0)
      .reduce((a, b) => a + b, 0) ?? 0; //@todo temporary, that can be take from the subgraph
  return (
    <div className="relative flex max-w-[320px] flex-col overflow-hidden rounded-lg border-2 border-black bg-surface">
      <div className="flex flex-col gap-4 p-4">
        <div className="relative">
          {/* <Image fill src={imageSrc} alt="garden main image" /> */}
        </div>
        <div>
          <h3 className="text-center">{symbol}</h3>
          <h4 className="text-center">Network: {getChain(chainId)?.name}</h4>
          <p>
            {name} - {decimals} decimals
          </p>
        </div>
        <div>
          {commLength} Communit{commLength > 1 ? "ies" : "y"}
        </div>
        <div>{formatUnits(totalBalance, decimals)} Tokens Staked</div>
        <div>{totalMembers} Total Members</div>
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
