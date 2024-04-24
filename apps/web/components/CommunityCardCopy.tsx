"use client";
import { Button, Layout, RegisterMember } from "@/components";
import {
  UserGroupIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import {
  PoolCard,
  IncreasePower,
  CommunityProfile,
  FormLink,
} from "@/components";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { usePathname } from "next/navigation";
import { Address, useAccount } from "wagmi";
import {
  TokenGarden,
  getCommunitiesByGardenQuery,
} from "#/subgraph/.graphclient";
import { formatTokenAmount } from "@/utils/numbers";
import Link from "next/link";
import { newLogo } from "@/assets";
import Image from "next/image";

type CommunityQuery = NonNullable<
  NonNullable<getCommunitiesByGardenQuery["tokenGarden"]>["communities"]
>[number];

type CommunityCardProps = CommunityQuery & {
  tokenGarden: TokenGarden | undefined;
} & {
  covenantData?: { logo: string; covenant: string };
};

export function CommunityCardCopy({
  covenantData,
  communityName,
  id: communityAddress,
  strategies,
  members,
  registerStakeAmount,
  protocolFee,
  communityFee,
  tokenGarden,
}: CommunityCardProps) {
  const { address: accountAddress } = useAccount();
  const pathname = usePathname();

  const pools = strategies ?? [];
  members = members ?? [];
  let registerToken = tokenGarden?.id ?? "0x0";
  registerStakeAmount = registerStakeAmount ?? 0;

  const SiganlingPools = pools.filter(
    (pool) => pool.config?.proposalType === "0",
  );

  const FundingPools = pools.filter(
    (pool) => pool.config?.proposalType === "1",
  );

  return (
    <>
      <Layout hover className="w-fit border-4">
        <Link href={`${pathname}/community/${communityAddress}`}>
          <div className="flex flex-col gap-1">
            <Image src={newLogo} height={50} width={50} alt="community logo" />
            <h4>{communityName}</h4>
            <p>Members: {members.length}</p>
            <p>Siganling Pools: {SiganlingPools.length}</p>
            <p>Funding Pools: {FundingPools.length}</p>
          </div>
        </Link>
      </Layout>
    </>
  );
}
