"use client";
import { useState } from "react";
import { Button, RegisterMember } from "@/components";
import {
  ChevronDownIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { PoolCard } from "@/components";
import { Address, useAccount } from "wagmi";
import { getCommunityByGardenQuery } from "#/subgraph/.graphclient";
import { formatAddress } from "@/utils/formatAddress";

type CommunityQuery = NonNullable<
  NonNullable<getCommunityByGardenQuery["tokenGarden"]>["communities"]
>[number];
type CommunityCardProps = CommunityQuery & { gardenToken: `0x${string}` };

export function CommunityCard({
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
      <div className="card card-side bg-white shadow-xl">
        <aside className="flex min-h-[300px] w-[280px] flex-col justify-between rounded-xl bg-base-100 p-2">
          {/* <div className=""> */}
          <h3 className="text-center font-press text-xl text-info-content">
            {name}
          </h3>
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <h4>Address:</h4>
            <p className="font-bold">{formatAddress(communityAddress)}</p>
          </div>
          <RegisterMember
            // isMember={isMember}
            communityAddress={communityAddress as Address}
            registerToken={registerToken as Address}
            registerStakeAmount={registerStakeAmount}
          />
          {/* </div> */}
        </aside>
        <main className="card-body">
          <div className="stats flex shadow">
            <div className="stat flex-1">
              <div className="stat-figure text-primary">
                <UserGroupIcon className="inline-block h-8 w-8 text-primary" />
              </div>
              <div className="stat-title">Register Members</div>
              <div className="stat-value text-primary">{members.length}</div>
              <div className="stat-desc">50 token membership</div>
            </div>

            <div className="stat flex-1">
              <div className="stat-figure text-secondary">
                <BuildingOffice2Icon className="inline-block h-8 w-8 text-secondary" />
              </div>
              <div className="stat-title">Pools</div>
              <div className="stat-value text-secondary">{pools.length}</div>
              <div className="stat-desc">2100k in total funds</div>
            </div>
          </div>
          <div className="card-actions mt-10 justify-end">
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
