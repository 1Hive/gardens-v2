// "use client";
import { honeyIcon } from "@/assets";
import Image from "next/image";
import { CommunityCard } from "@/components";
import { getContractsAddrByChain } from "@/constants/contracts";
import { getBuiltGraphSDK } from "#/subgraph/.graphclient";

export const dynamic = "force-dynamic";

export default async function Garden({
  params: { chain, garden },
}: {
  params: { chain: number; garden: string };
}) {
  const addrs = getContractsAddrByChain(chain);
  if (!addrs) {
    return <div>Chain ID: {chain} not supported</div>;
  }
  const sdk = getBuiltGraphSDK();
  const result = await sdk.getCommunityByGarden({ addr: garden });
  const communities = result.tokenGarden?.communities || [];

  // console.log("communities", communities);
  return (
    <div className=" relative mx-auto max-w-5xl space-y-10 rounded-xl border-2 border-black bg-base-100 bg-surface p-8">
      {/* header: honey logo +stats */}
      <header className="flex items-center justify-between gap-4  py-6">
        <div className="flex w-44 items-center justify-center gap-2">
          <Image src={honeyIcon} alt="honey icon" className="h-20 w-20" />
          <span className="text-2xl font-bold">
            {result.tokenGarden?.symbol}
          </span>
        </div>
        <div className="flex flex-1">
          {/* {stats.map((stat, i) => (
            <div
              className="flex w-full flex-col items-center justify-center gap-2"
              key={stat.label + i}
            >
              <span className="text-3xl font-semibold text-info">
                {stat.label}
              </span>
              <span className="text-xl font-bold">{stat.value}</span>
            </div>
          ))} */}
        </div>
      </header>
      <section className="mx-auto flex flex-col gap-8">
        {/* communites */}
        {communities.map((community, i) => (
          <CommunityCard
            gardenToken={garden as `0x${string}`}
            {...community}
            key={`${community.communityName}_${i}`}
          />
        ))}
      </section>
    </div>
  );
}

// const stats = [
//   {
//     label: "Price",
//     value: "11.4",
//   },
//   {
//     label: "Total Supply",
//     value: "49,126",
//   },
//   {
//     label: "Total Support",
//     value: "8,649 ",
//   },
// ];
