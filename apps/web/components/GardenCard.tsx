"use client";

import { BuildingStorefrontIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { getTokenGardensQuery } from "#/subgraph/.graphclient";
import { Statistic, TokenLabel } from ".";
import { gardenLand } from "@/assets";
import { Card } from "@/components/Card";
import { getChain } from "@/configs/chainServer";

type TokenGarden = getTokenGardensQuery["tokenGardens"][number];

export function GardenCard({ garden }: { garden: TokenGarden }) {
  const { id, name, chainId } = garden;
  const link = `/gardens/${chainId}/${id}`;
  const communities = garden.communities?.filter((comm) => comm.isValid);
  const commLength = communities?.length ?? 0;
  const totalMembers =
    communities
      ?.map((comm) => comm.members?.length ?? 0)
      .reduce((a, b) => a + b, 0) ?? 0; //@todo temporary, that can be take from the subgraph
  return (
    <Card href={link} >
      <div className="flex flex-col gap-7">
        <div className="flex items-center justify-center gap-2">
          {/* TODO: find appropiate token image */}
          <TokenLabel chainId={chainId} noSymbol />
          <h3 className="text-neutral-content">{name}</h3>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <div className="align-start flex flex-col justify-start">
              <p className="text-neutral-content text-sm">Network:</p>
              <div className="flex gap-2.5 items-center">
                <h5 className="text-neutral-content">{getChain(chainId)?.name}</h5>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Statistic label={`Communit${commLength > 1 ? "ies" : "y"}`} count={commLength} icon={<BuildingStorefrontIcon />} />
            <Statistic label={"Members"} count={totalMembers} />
          </div>
        </div>
        <Image src={gardenLand} alt="garden land" className="rounded-xl" />
      </div>
    </Card>
  );
}

