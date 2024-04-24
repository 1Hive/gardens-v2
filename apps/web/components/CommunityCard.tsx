"use client";
import { Button, Layout, RegisterMember, Identifier } from "@/components";
import {
  UserGroupIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
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

export function CommunityCard({
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
          <div className="flex flex-col gap-2">
            <Image src={newLogo} height={50} width={50} alt="community logo" />
            <h4>{communityName}</h4>
            <Identifier
              icon={<UserGroupIcon />}
              label="Members"
              count={members.length}
            />
            <Identifier
              icon={<CurrencyDollarIcon />}
              label="Funding Pools"
              count={FundingPools.length}
            />
            <Identifier
              icon={<BuildingOffice2Icon />}
              label="Signaling Pools"
              count={SiganlingPools.length}
            />
          </div>
        </Link>
      </Layout>
    </>
  );
}
