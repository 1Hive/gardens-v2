"use client";
import { honeyIcon } from "@/assets";
import Image from "next/image";
import { CommunityCard } from "@/components";
import { useContractReads } from "wagmi";
import { Abi } from "viem";
import { contractsAddresses } from "@/constants/contracts";
import { alloABI } from "@/src/generated";

export default function Garden() {
  const alloContractReads = {
    address: contractsAddresses.allo,
    abi: alloABI as Abi,
    onError: (error: any) => {
      console.log(error);
    },
    onSettled: (data: any) => {
      console.log(data);
    },
  };
  const { data, isLoading, isError, error } = useContractReads({
    contracts: [
      {
        ...alloContractReads,
        functionName: "getPool",
        args: [1],
      },
      {
        ...alloContractReads,
        functionName: "getPool",
        args: [2],
      },
    ],
  });

  // Check if there is data available for the first community
  if (data && data.length > 0) {
    // Merge the data into the first community - 1hive
    const firstCommunity = conmmunities[0];
    firstCommunity.pools.forEach((pool, poolIndex) => {
      if (data[poolIndex]) {
        pool.result = data[poolIndex].result;
        pool.status = data[poolIndex].status;
      }
    });
  }

  return (
    <div className=" relative mx-auto max-w-5xl space-y-10 rounded-xl border-2 border-black bg-base-100 bg-surface p-8">
      {/* header: honey logo +stats */}
      <header className="flex items-center justify-between gap-4  py-6">
        <div className="flex w-44 items-center justify-center gap-2">
          <Image src={honeyIcon} alt="honey icon" className="h-20 w-20" />
          <span className="text-2xl font-bold">HNY</span>
        </div>
        <div className="flex flex-1">
          {stats.map((stat, i) => (
            <div
              className="flex w-full flex-col items-center justify-center gap-2"
              key={stat.label + i}
            >
              <span className="text-3xl font-semibold text-info">
                {stat.label}
              </span>
              <span className="text-xl font-bold">{stat.value}</span>
            </div>
          ))}
        </div>
      </header>
      <section className="mx-auto flex flex-col gap-8">
        {/* communites */}
        {conmmunities.map((community, i) => (
          <CommunityCard {...community} key={community.name + i} />
        ))}
      </section>
    </div>
  );
}

const stats = [
  {
    label: "Price",
    value: "11.4",
  },
  {
    label: "Total Supply",
    value: "49,126",
  },
  {
    label: "Total Support",
    value: "8,649 ",
  },
];

interface Pool {
  name: string;
  strategy: string;
  proposals: number;
  href: string;
  result?: any;
  status?: any; // Add this line to allow the 'result' property
}

interface Community {
  name: string;
  address: string;
  href: string;
  pools: Pool[];
}

const conmmunities: Community[] = [
  {
    name: "1Hive",
    address: "0x...",
    href: "1hive",
    pools: [
      {
        name: "Pool 1",
        strategy: "C.V",
        proposals: 3,
        href: "1",
      },
      {
        name: "Pool 2",
        strategy: "C.V",
        proposals: 3,
        href: "2",
      },
    ],
  },
  {
    name: "Memecoins",
    address: "0x...",
    href: "#",
    pools: [
      {
        name: "Pool 1",
        strategy: "C.V",
        proposals: 3,
        href: "1",
      },
      {
        name: "Pool 2",
        strategy: "C.V",
        proposals: 3,
        href: "2",
      },
    ],
  },
  {
    name: "1hive Foundation DAO",
    address: "0x...",
    href: "#",
    pools: [
      {
        name: "Pool 1",
        strategy: "C.V",
        proposals: 3,
        href: "1",
      },
      {
        name: "Pool 2",
        strategy: "C.V",
        proposals: 3,
        href: "2",
      },
      {
        name: "Pool 3",
        strategy: "C.V",
        proposals: 3,
        href: "3",
      },
    ],
  },
  {
    name: "1hive Gardens Swarm",
    address: "0x...",
    href: "#",
    pools: [
      {
        name: "Pool 1",
        strategy: "C.V",
        proposals: 3,
        href: "1",
      },
    ],
  },
];
