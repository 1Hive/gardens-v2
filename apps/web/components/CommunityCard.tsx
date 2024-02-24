"use client";
import { useState } from "react";
import { Button, RegisterMember } from "@/components";
import {
  ChevronDownIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { PoolCard } from "@/components";
import { CommunityProfile } from "@/components";
import { Address, useAccount } from "wagmi";
import { getCommunitiesByGardenQuery } from "#/subgraph/.graphclient";
import { formatAddress } from "@/utils/formatAddress";

type CommunityQuery = NonNullable<
  NonNullable<getCommunitiesByGardenQuery["tokenGarden"]>["communities"]
>[number];
type CommunityCardProps = CommunityQuery & { gardenToken: Address };

export function CommunityCard({
  covenantIpfsHash,
  communityName: name,
  id: communityAddress,
  strategies,
  members,
  registerToken,
  registerStakeAmount,
}: CommunityQuery) {
  const [open, setOpen] = useState(false);
  const { address: accountAddress } = useAccount();
  // const [isMember, setIsMember] = useState<boolean>(false);

  // useEffect(() => {
  //   if (accountAddress && members) {
  //     const findMember = members.some(
  //       (m) => m.memberAddress == accountAddress.toLowerCase(),
  //     );
  //     setIsMember(findMember);
  //   } else {
  //     setIsMember(false);
  //   }
  // }, []);

  const pools = strategies ?? [];
  members = members ?? [];
  registerToken = registerToken ?? "0x0";
  registerStakeAmount = registerStakeAmount ?? 0;

  return (
    <>
      <div className="border2 card card-side bg-white">
        {/* aside:  community name + btn to access profile */}
        <aside className="flex min-h-[300px] w-[280px] flex-col items-center justify-center gap-10 rounded-xl bg-base-100 p-2">
          <h3 className="text-center font-press text-xl text-info-content">
            {name}
          </h3>
          <CommunityProfile
            communityAddress={communityAddress as Address}
            name={name}
          />
        </aside>

        {/* main: stats, action buttons, dsiplay pools */}
        <main className="card-body space-y-10">
          <div className="stats flex">
            <div className="stat flex-1">
              <div className="stat-figure text-primary">
                <UserGroupIcon className="inline-block h-8 w-8 text-primary" />
              </div>
              <div className="stat-title">Members</div>
              <div className="stat-value text-primary">{members.length}</div>
              <div className="stat-desc">
                {registerStakeAmount} stake token membership
              </div>
            </div>

            <div className="stat flex-1">
              <div className="stat-figure text-secondary">
                <BuildingOffice2Icon className="inline-block h-8 w-8 text-secondary" />
              </div>
              <div className="stat-title">Pools</div>
              <div className="stat-value text-secondary">{pools.length}</div>
              {/* TODO: add this parameter */}
              <div className="stat-desc"> # in total funds</div>
            </div>
          </div>
          <h5>{covenantIpfsHash}</h5>
          <div className="flex w-fit gap-4">
            <RegisterMember
              communityAddress={communityAddress as Address}
              registerToken={registerToken as Address}
              registerStakeAmount={registerStakeAmount}
            />

            <div className="flex-1"> {/* TODO: add pool btn here ???*/}</div>
          </div>
          <div className=" justify-end">
            <div
              className={`flex w-full transform flex-wrap gap-4 overflow-hidden transition-height duration-200 ease-in-out ${
                !open && "max-h-[290px]"
              } `}
            >
              {pools.map((pool, i) => (
                <PoolCard {...pool} key={i} />
              ))}
              {pools.length > 2 && (
                <Button
                  // style="outline"
                  className="!rounded-full bg-white !p-3"
                  onClick={() => setOpen((prev) => !prev)}
                >
                  <ChevronDownIcon
                    className={`block h-6 w-6 stroke-2 ${open && "rotate-180"}`}
                    aria-hidden="true"
                  />
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
