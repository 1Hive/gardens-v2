"use client";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Arbitrum, GnosisGno } from "@thirdweb-dev/chain-icons";
import { Button } from ".";
import { gardenLand } from "@/assets";
import { getTokenGardensQuery } from "#/subgraph/.graphclient";
import { getChain, ChainIcon } from "@/configs/chainServer";

type TokenGarden = getTokenGardensQuery["tokenGardens"][number];

export function GardenCard({ garden }: { garden: TokenGarden }) {
  const { id, name, decimals, symbol, totalBalance, chainId } = garden;
  const link = `/gardens/${chainId}/${id}`;
  const communities = garden.communities?.filter((comm) => comm.isValid);
  const commLength = communities?.length ?? 0;
  const totalMembers =
    communities
      ?.map((comm) => comm.members?.length ?? 0)
      .reduce((a, b) => a + b, 0) ?? 0; //@todo temporary, that can be take from the subgraph
  return (
    <div className="border2 relative flex max-w-[320px] flex-col overflow-hidden rounded-lg border-black bg-surface shadow">
      <div className="flex flex-col gap-2 p-2">
        <div className="card relative" />
        <div className="flex flex-col items-center gap-1">
          <h4 className="text-2xl font-bold">{name}</h4>
          <p className="text-center">{symbol}</p>
          <div className="align-center flex justify-center">
            <p className="text-center text-xs">Network:</p>
            <div className="mx-1 content-center justify-center">
              <ChainIcon chain={chainId} height={16} />
            </div>
            <p className="text-center text-xs">{getChain(chainId)?.name}</p>
          </div>
        </div>
        <InfoData
          label={`Communit${commLength > 1 ? "ies" : "y"}`}
          data={commLength}
        />
        <InfoData label={"Members"} data={totalMembers} />

        <div className="mb-2 mt-4">
          <Link href={link}>
            <Button className="w-full">
              View Communities
            </Button>
          </Link>
        </div>
      </div>
      <Image src={gardenLand} alt="garden land" />
    </div>
  );
}

const InfoData = ({ label, data }: { label: string; data: any }) => {
  return (
    <dl className="flex items-center justify-between rounded-xl px-3 shadow">
      <dt className="truncate text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 max-w-10 overflow-hidden truncate text-2xl font-semibold tracking-tight text-gray-900">
        {data}
      </dd>
    </dl>
  );
};
