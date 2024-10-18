"use client";

import {
  BuildingStorefrontIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { Address } from "viem";
import { getTokenGardensQuery } from "#/subgraph/.graphclient";
import { Statistic, TokenLabel } from ".";
import { gardenLand } from "@/assets";
import { Card } from "@/components/Card";
import { ChainIcon, getConfigByChain } from "@/configs/chains";
import TooltipIfOverflow from "./TooltipIfOverflow";

type TokenGarden = getTokenGardensQuery["tokenGardens"][number];

export function GardenCard({ garden }: { garden: TokenGarden }) {
  const { id, name, chainId } = garden;
  const link = `/gardens/${chainId}/${id}`;
  const communities = garden.communities?.filter((comm) => comm.isValid);
  const commLength = communities?.length ?? 0;

  // TODO: improve the types ?
  function countUniqueMemberAddresses(communitiesArray: any[] | undefined) {
    const uniqueAddresses = new Set();

    communitiesArray?.forEach((community) => {
      if (community.members && Array.isArray(community.members)) {
        community.members.forEach((member: { memberAddress: Address }) => {
          if (member.memberAddress) {
            uniqueAddresses.add(member.memberAddress);
          }
        });
      }
    });
    return uniqueAddresses.size;
  }

  const totalMembers = countUniqueMemberAddresses(communities);

  return (
    <Card href={link}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          {/* TODO: find appropiate token image */}
          <h3 className="text-neutral-content h-14">
            <TooltipIfOverflow lineClamp="line-clamp-2">{name}</TooltipIfOverflow>
          </h3>
          <TokenLabel chainId={chainId} noSymbol />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <div className="align-start flex flex-col justify-start">
              <p className="text-neutral-content text-sm">Network:</p>
              <div className="flex gap-2.5 items-center mt-1">
                <h5 className="text-neutral-content">
                  {getConfigByChain(chainId)?.name}
                </h5>
                <div className="flex content-center justify-center">
                  {/* TODO: change Icon library */}
                  <ChainIcon chain={chainId} height={24} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Statistic
              label={`Communit${commLength > 1 ? "ies" : "y"}`}
              count={commLength}
              icon={<BuildingStorefrontIcon />}
            />
            <Statistic
              label={"Members"}
              count={totalMembers}
              icon={<UserGroupIcon />}
            />
          </div>
        </div>
        <Image src={gardenLand} alt="garden land" className="rounded-xl" />
      </div>
    </Card>
  );
}
